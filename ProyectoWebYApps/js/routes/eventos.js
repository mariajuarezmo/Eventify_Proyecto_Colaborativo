const express = require('express');
const con = require('../bbdd'); 
const router = express.Router(); // Usa router para manejar rutas
const { upload } = require('../sesiones.js');


// Ruta para registrar un evento
router.post('/eventRegister', upload.single('imagen_url'), async (req, res) => {
    const { titulo, fecha, hora_inicio, hora_fin, ubicacion, organizador, descripcion, categoria } = req.body;

    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para crear un evento.'); window.location.href='/login.html';</script>");
    }

    if (!titulo || !fecha || !hora_inicio || !hora_fin || !ubicacion || !organizador || !descripcion || !categoria) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    if (!req.file) {
        return res.send("<script>alert('Debes subir una imagen para el evento.'); window.history.back();</script>");
    }

    const imagenPath = `/uploads/${req.file.filename}`;
    const userId = req.session.user.id; // ID del usuario que está creando el evento
    const userRole = req.session.user.rol; // Rol del usuario (Admin, Estudiante, Profesor, etc.)
    const estado = userRole === 'Admin' ? 'Aceptado' : 'Pendiente'; // Si es Admin, el estado es 'Aceptado'
    const estadoTemporal = 'Por Suceder';
    const idAdminAprobador = userRole === 'Admin' ? userId : null; // Si es Admin, se guarda su ID como aprobador

    const insertEventQuery = `
        INSERT INTO Eventos (Nombre, Descripcion, Estado, Fecha, Hora_Inicio, Hora_Fin, Categoria, Ubicacion, Organizador, ID_USUARIO_CREADOR_EVENTO, Estado_Temporal, imagen_url, num_asistentes, ID_ADMIN_APROBADOR)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `;

    con.query(
        insertEventQuery,
        [titulo, descripcion, estado, fecha, hora_inicio, hora_fin, categoria, ubicacion, organizador, userId, estadoTemporal, imagenPath, idAdminAprobador],
        async (err, result) => {
            if (err) {
                console.error('Error al registrar el evento:', err);
                return res.status(500).send('Error interno al registrar el evento.');
            }

            const eventId = result.insertId; // Obtener el ID del evento recién creado

            // Generar QR con QuickChart.io
            const qrData = `http://128.140.112.133:8069/event/${eventId}`; // URL para mostrar información del evento
            const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrData)}&size=200`;

            // Actualizar la base de datos con la URL del QR
            const updateQuery = `UPDATE Eventos SET QR = ? WHERE ID_EVENTO = ?`;
            con.query(updateQuery, [qrUrl, eventId], (updateErr) => {
                if (updateErr) {
                    console.error('Error al guardar el QR:', updateErr);
                    return res.status(500).send('Error al guardar el QR.');
                }

                if (estado === 'Aceptado') {
                    res.send("<script>alert('Evento creado y aprobado automáticamente.'); window.location.href='/panelAdministrador.html';</script>");
                } else {
                    res.send("<script>alert('Evento creado con éxito. Espera que el ADMIN lo apruebe para verlo en el tablón'); window.location.href='/panelUsuario.html';</script>");
                }
            });
        }
    );
});

// Ruta para obtener eventos filtrados por día, semana o mes
router.get('/eventsByDate', (req, res) => {
    const { filter } = req.query;

    let dateCondition;
    if (filter === 'dia') {
        dateCondition = `Fecha = CURDATE()`;
    } else if (filter === 'semana') {
        dateCondition = `YEARWEEK(Fecha, 1) = YEARWEEK(CURDATE(), 1)`; // Misma semana actual
    } else if (filter === 'mes') {
        dateCondition = `MONTH(Fecha) = MONTH(CURDATE()) AND YEAR(Fecha) = YEAR(CURDATE())`; // Mismo mes actual
    } else {
        return res.status(400).json({ error: 'Filtro no válido' });
    }

    let query = `
        SELECT 
            Eventos.Nombre AS Nombre_Evento, 
            Eventos.Descripcion, 
            Eventos.Fecha, 
            Eventos.Hora_Inicio, 
            Eventos.Hora_Fin, 
            Eventos.Categoria, 
            Eventos.Ubicacion, 
            Eventos.Organizador, 
            Eventos.imagen_url,
            Eventos.QR,
            Eventos.num_asistentes,
            Usuarios.nombre AS Nombre_Creador
        FROM 
            Eventos
        JOIN 
            Usuarios 
        ON 
            Eventos.ID_USUARIO_CREADOR_EVENTO = Usuarios.id
        WHERE 
            Eventos.Estado = 'Aceptado' 
            AND Eventos.Estado_Temporal = 'Por Suceder'
            AND ${dateCondition}
    `;

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos por fecha:', err);
            return res.status(500).json({ error: 'Error al cargar los eventos.' });
        }
        res.json(results);
    });
});

//Ruta para modificar el estado del proceso del evento 
router.post('/updateEventStatus', (req, res) => {
    const { id_evento, nuevo_estado } = req.body;

    // Verificar si el usuario tiene sesión activa
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'No estás autorizado para realizar esta acción.' });
    }

    const adminId = req.session.user.id; // Obtener el ID del administrador desde la sesión

    // Verificar los datos recibidos
    if (!id_evento || !nuevo_estado) {
        return res.status(400).json({ error: 'El ID del evento y el nuevo estado son obligatorios.' });
    }

    if (nuevo_estado === 'Denegado') {
        // Si el estado es "Denegado", eliminar el evento de la tabla
        const deleteEventQuery = `
            DELETE FROM Eventos
            WHERE ID_EVENTO = ?
        `;

        con.query(deleteEventQuery, [id_evento], (err, result) => {
            if (err) {
                console.error('Error al eliminar el evento:', err);
                return res.status(500).json({ error: 'Error interno al eliminar el evento.' });
            }

            // Verificar si el evento fue eliminado
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'El evento no fue encontrado.' });
            }

            // Responder con éxito si la eliminación fue realizada
            res.json({ success: true, id_evento, message: 'El evento fue denegado y eliminado correctamente.' });
        });
    } else if (nuevo_estado === 'Aceptado') {
        // Si el estado es "Aceptado", actualizar el estado del evento
        const updateEventQuery = `
            UPDATE Eventos
            SET Estado = ?, ID_ADMIN_APROBADOR = ?
            WHERE ID_EVENTO = ?
        `;

        con.query(updateEventQuery, [nuevo_estado, adminId, id_evento], (err, result) => {
            if (err) {
                console.error('Error al actualizar el evento:', err);
                return res.status(500).json({ error: 'Error interno al actualizar el evento.' });
            }

            // Verificar si el evento fue encontrado y actualizado
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'El evento no fue encontrado.' });
            }

            // Responder con éxito si la actualización fue realizada
            res.json({ success: true, id_evento, nuevo_estado, admin_id: adminId });
        });
    } else {
        // Manejar estados no reconocidos
        return res.status(400).json({ error: 'El estado especificado no es válido.' });
    }
});

//Ruta para obtener todos los eventos con estado pendiente

router.get('/pendingEvents', (req, res) => {
    const pendingEventsQuery = "SELECT * FROM Eventos WHERE Estado = 'Pendiente'";
    con.query(pendingEventsQuery, (err, events) => {
        if (err) {
            console.error('Error al obtener eventos pendientes:', err);
            return res.status(500).send("Error al cargar los eventos.");
        }
        res.json(events); // Devuelve los eventos pendientes como JSON
    });
});


// Ruta para obtener eventos aceptados y por suceder con el nombre del creador
router.get('/events', (req, res) => {
    const { category } = req.query;

    let query = `
        SELECT 
            Eventos.Nombre AS Nombre_Evento, 
            Eventos.Descripcion, 
            Eventos.Fecha, 
            Eventos.Hora_Inicio, 
            Eventos.Hora_Fin, 
            Eventos.Categoria, 
            Eventos.Ubicacion, 
            Eventos.Organizador, 
            Eventos.imagen_url,
            Eventos.QR,
            Eventos.num_asistentes,
            Usuarios.nombre AS Nombre_Creador
        FROM 
            Eventos
        JOIN 
            Usuarios 
        ON 
            Eventos.ID_USUARIO_CREADOR_EVENTO = Usuarios.id
        WHERE 
            Eventos.Estado = 'Aceptado' 
            AND Eventos.Estado_Temporal = 'Por Suceder'
    `;

    const queryParams = [];

    if (category) {
        query += ` AND Eventos.Categoria = ?`;
        queryParams.push(category);
    }

    con.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos:', err);
            return res.status(500).json({ error: "Error al cargar los eventos." });
        }
        res.status(200).json(results);
    });
});


// Ruta para obtener los eventos creados por el usuario
router.get('/userEvents', (req, res) => {
    // Verificar si el usuario ha iniciado sesión
    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para ver tus eventos.'); window.location.href='/login.html';</script>");
    }

    const userId = req.session.user.id; // Obtener el ID del usuario desde la sesión

    const userEventsQuery = `
        SELECT ID_EVENTO, Nombre, Descripcion, Fecha, Hora_Inicio, Hora_Fin, Categoria, Ubicacion, Organizador, imagen_url
        FROM Eventos
        WHERE ID_USUARIO_CREADOR_EVENTO = ?
    `;

    con.query(userEventsQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener los eventos del usuario:', err);
            return res.status(500).send("Error al cargar los eventos.");
        }

        // Enviar los eventos como respuesta en formato JSON
        res.json(results);
    });
});


//Ruta para actualizar un evento
router.post('/updateEvent', upload.single('imagen_url'), (req, res) => {
    console.log('Datos recibidos:', req.body);
    console.log('Archivo recibido:', req.file);

    const { id_evento, titulo, descripcion, fecha, hora_inicio, hora_fin, ubicacion, organizador, categoria } = req.body;
    const imagen_url = req.file ? req.file.path : req.body.imagen_actual;

    if (!id_evento || !titulo || !descripcion || !fecha || !hora_inicio || !hora_fin || !ubicacion || !organizador || !categoria || !imagen_url) {
        console.error('Campos faltantes:', { id_evento, titulo, descripcion, fecha, hora_inicio, hora_fin, ubicacion, organizador, categoria, imagen_url });
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Verificar si el usuario ha iniciado sesión
    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para editar eventos.'); window.location.href='/login.html';</script>");
    }

    const userId = req.session.user.id; // Obtener el ID del usuario desde la sesión

    // Consulta para obtener el rol del usuario
    const getUserRoleQuery = "SELECT rol FROM Usuarios WHERE id = ?";
    con.query(getUserRoleQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener el rol del usuario:', err);
            return res.send("<script>alert('Error interno.'); window.history.back();</script>");
        }

        if (results.length === 0) {
            return res.send("<script>alert('Usuario no encontrado.'); window.location.href='/index.html';</script>");
        }

        const userRole = results[0].rol;

        let updateEventQuery;
        let queryParams;

        // Si el usuario es un administrador
        if (userRole === 'Admin') {
            updateEventQuery = `
                UPDATE Eventos
                SET Nombre = ?, Descripcion = ?, Fecha = ?, Hora_Inicio = ?, Hora_Fin = ?, Categoria = ?, Ubicacion = ?, Organizador = ?, imagen_url = ?
                WHERE ID_EVENTO = ?
            `;
            queryParams = [titulo, descripcion, fecha, hora_inicio, hora_fin, categoria, ubicacion, organizador, imagen_url, id_evento];
        } else {
            // Para otros usuarios, verificar que sean los creadores del evento
            updateEventQuery = `
                UPDATE Eventos
                SET Nombre = ?, Descripcion = ?, Fecha = ?, Hora_Inicio = ?, Hora_Fin = ?, Categoria = ?, Ubicacion = ?, Organizador = ?, imagen_url = ?
                WHERE ID_EVENTO = ? AND ID_USUARIO_CREADOR_EVENTO = ?
            `;
            queryParams = [titulo, descripcion, fecha, hora_inicio, hora_fin, categoria, ubicacion, organizador, imagen_url, id_evento, userId];
        }

        con.query(updateEventQuery, queryParams, (err, result) => {
            if (err) {
                console.error('Error al actualizar el evento:', err);
                return res.send("<script>alert('Error interno al actualizar el evento.'); window.history.back();</script>");
            }

            if (result.affectedRows === 0) {
                return res.send("<script>alert('No tienes permiso para editar este evento o el evento no existe.'); window.history.back();</script>");
            }

            res.send("<script>alert('Evento actualizado con éxito.'); window.history.back();</script>");
        });
    });
});


//Ruta para obtener todos los eventos
router.get('/getAllEvents', (req, res) => {
    const getAllEventsQuery = "SELECT * FROM Eventos";

    con.query(getAllEventsQuery, (err, results) => {
        if (err) {
            console.error('Error al obtener los eventos:', err);
            return res.status(500).send('Error al obtener los eventos.');
        }

        res.json(results);
    });
});

//Ruta para eliminar un evento de la tabla eventos

router.delete('/deleteEvent', (req, res) => {
    const id_evento = req.query.id_evento; // Leer el ID del evento de los parámetros de consulta
    console.log('ID recibido en el servidor:', id_evento); 

    if (!id_evento) {
        return res.status(400).json({ error: 'El ID del evento es obligatorio.' });
    }

    const deleteEventQuery = `
        DELETE FROM Eventos
        WHERE ID_EVENTO = ?
    `;

    con.query(deleteEventQuery, [id_evento], (err, result) => {
        if (err) {
            console.error('Error al eliminar el evento:', err);
            return res.status(500).json({ error: 'Error interno al eliminar el evento.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'El evento no fue encontrado.' });
        }

        res.json({ success: true, message: 'Evento eliminado con éxito.' });
    });
});

//Ruta para eliminar un evento de la tabla eventos

router.delete('/deleteUser', (req, res) => {
    const id = req.query.id; // Leer el ID del usuario de los parámetros de consulta
    console.log('ID recibido en el servidor:', id); 

    if (!id) {
        return res.status(400).json({ error: 'El ID del usuario es obligatorio.' });
    }

    const deleteEventQuery = `
        DELETE FROM Usuarios
        WHERE id = ?
    `;

    con.query(deleteEventQuery, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar el usuario:', err);
            return res.status(500).json({ error: 'Error interno al eliminar el usuario.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'El usuario no fue encontrado.' });
        }

        res.json({ success: true, message: 'Usuario eliminado con éxito.' });
    });
});

//Ruta para crear formulario para registrar asistencia de un evento

router.get('/event/:id', (req, res) => {
    const eventId = req.params.id;

    const query = `SELECT * FROM Eventos WHERE ID_EVENTO = ?`;
    con.query(query, [eventId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Evento no encontrado.');
        }

        const evento = results[0];

        res.send(`
          <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${evento.Nombre}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: linear-gradient(135deg,rgb(179, 226, 148),rgba(128, 122, 246, 0.76)); /* Fondo degradado sutil */
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        
                    }
                    .card {
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        width: 90%;
                        max-width: 500px;
                        padding: 20px;
                        margin: 20px;
                        text-align: center;
                        
                        max-height: 450px;
                    }

                    #event-info {
                        text-align: left;
                    }


                    h1 {
                        font-size: 24px;
                        margin-bottom: 10px;
                        color: #333;
                    }
                    p {
                        margin: 5px 0;
                        color: #555;
                    }
                    strong {
                        color: #222;
                    }
                    form {
                        margin-top: 20px;
                    }
                    input[type="text"] {
                        width: 90%;
                        padding: 10px;
                        margin: 10px 0;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        font-size: 16px;
                    }
                    button {
                        background: #5cb85c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s;
                    }
                    button:hover {
                        background: #4cae4c;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                <h1>${evento.Nombre}</h1>
                    <div id="event-info">
                        <p><strong>Fecha:</strong> ${evento.Fecha}</p>
                        <p><strong>Hora:</strong> ${evento.Hora_Inicio} - ${evento.Hora_Fin}</p>
                        <p><strong>Ubicación:</strong> ${evento.Ubicacion}</p>
                        <p><strong>Organizador:</strong> ${evento.Organizador}</p>
                        <p><strong>Asistentes:</strong> ${evento.num_asistentes}</p>
                        <p>${evento.Descripcion}</p>
                    </div>

                    <h2>Confirmar Asistencia</h2>
                    <form action="/event/${evento.ID_EVENTO}/register" method="POST">
                        <input type="text" name="nombre" placeholder="Tu nombre" required>
                        <input type="text" name="apellidos" placeholder="Tus apellidos" required>
                        <button type="submit">Confirmar</button>
                    </form>
                </div>
        `);
    });
});


router.post('/event/:id/register', (req, res) => {
    const eventId = req.params.id;

    // Incrementar el número de asistentes en la base de datos
    const query = `UPDATE Eventos SET num_asistentes = num_asistentes + 1 WHERE ID_EVENTO = ?`;

    con.query(query, [eventId], (err) => {
        if (err) {
            console.error('Error al actualizar asistentes:', err);
            return res.status(500).send('Error interno.');
        }

        res.send("<script>alert('Gracias por confirmar tu asistencia.'); window.location.href='/index.html';</script>");
    });
});




module.exports = router;
