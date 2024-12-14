
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
//CREACIÓN DE QRs
const axios = require('axios');
//MANEJO DE SESIONES Y MANEJO DE VULNERACIONES PARA EVITAR ACCEDER A PANELES NO AUTORIZADOS SEGUN EL ROL
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
//MANEJO DE IMAGENES QUE ADJUNTA UN USUARIO CUANDO CREA UN EVENTO
const multer = require('multer');
const app = express();

require('dotenv').config();


const PORT = process.env.PORT || 5501; // Usar PORT asignado por Render
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads'); // Carpeta donde se guardarán las imágenes
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname); // Nombre único del archivo
    }
});

// Inicializar multer
const upload = multer({ storage: storage });
const options = {
    host: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const sessionStore = new MySQLStore(options);

app.use(session({
    secret: 'sesion_secreta', 
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

// Middleware para bloquear acceso directo a rutas HTML según el rol del usuario activo
app.use((req, res, next) => {
    let rutasBloqueadasConSesion = [];

    if (req.session && req.session.user) {
        const rolUsuario = req.session.user.rol;

        // Definir rutas bloqueadas según el rol del usuario
        if (['Estudiante', 'Profesor', 'Coordinador', 'Dirección'].includes(rolUsuario)) {
            rutasBloqueadasConSesion = ['/panelAdministrador.html', '/panelAdministradorJefe.html'];
        } else if (rolUsuario === 'Admin') {
            rutasBloqueadasConSesion = ['/panelUsuario.html', '/panelAdministradorJefe.html'];
        } else if (rolUsuario === 'AdminJefe') {
            rutasBloqueadasConSesion = ['/panelUsuario.html', '/panelAdministrador.html'];
        }

        // Verificar si la ruta actual está bloqueada
        const esRutaBloqueada = rutasBloqueadasConSesion.some(ruta => req.path.startsWith(ruta));

        if (esRutaBloqueada) {
            console.log(`Acceso denegado a ${req.path}: sesión activa para el usuario ${req.session.user.nombre} con rol ${rolUsuario}.`);
            return res.send("<script>alert('No tienes permiso para acceder a esta página.'); window.history.back();</script>");
        }
    }

    next(); // Continúa con la solicitud si no es una ruta bloqueada
});

// Middleware para bloquear rutas si no hay sesión activa
app.use((req, res, next) => {
    const rutasBloqueadasSinSesion = ['/panelUsuario.html', '/panelAdministrador.html', '/panelAdministradorJefe.html']; // Rutas bloqueadas sin sesión
    const esRutaBloqueada = rutasBloqueadasSinSesion.some(ruta => req.path.startsWith(ruta));

    if (!req.session || !req.session.user) {
        if (esRutaBloqueada) {
            console.log(`Acceso denegado a ${req.path}: no hay sesión activa.`);
            return res.send("<script>alert('No tienes permiso para acceder a esta página.'); window.history.back();</script>");
            
        }
    }

    next(); // Continúa con la solicitud si no es una ruta bloqueada
});


// Middleware para analizar JSON
app.use(express.json());

// Middleware para procesar datos enviados por formularios
app.use(express.urlencoded({ extended: true }));

// Middleware para servir archivos estáticos desde la carpeta "css"
app.use('/css', express.static(path.join(__dirname, 'css')));

// Middleware para servir archivos HTML directamente desde "html"
app.use(express.static(path.join(__dirname, 'html')));

//Funcionalidad para que se carguen las imagenes al servidor
app.use('/uploads', express.static('uploads'));



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// Configuración de conexión a la base de datos
const con = mysql.createConnection({
    host: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Conexión al servidor MySQL
con.connect(function (err) {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log("Connected to MySQL server on HeidiSQL!");
});

// Ruta para registrar un usuario
const bcrypt = require('bcryptjs');

// Ruta para registrar un usuario
app.post('/register', (req, res) => {
    const { nombre, contraseña, rol, email } = req.body;

    if (!nombre || !contraseña || !rol || !email) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Verificar si el nombre de usuario o el correo ya existen en la tabla Usuarios
    const checkUserQuery = "SELECT * FROM Usuarios WHERE nombre = ? OR correo = ?";
    con.query(checkUserQuery, [nombre, email], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            return res.send("<script>alert('El nombre de usuario y/o correo ya están registrados.'); window.history.back();</script>");
        }

        // Hashear la contraseña
        bcrypt.hash(contraseña, 10, (err, hashedPassword) => {
            if (err) throw err;

            // Guardar en la tabla temporal
            const insertRequestQuery = "INSERT INTO SolicitudesRegistro (nombre, contraseña, rol, correo) VALUES (?, ?, ?, ?)";
            con.query(insertRequestQuery, [nombre, hashedPassword, rol, email], (err) => {
                if (err) throw err;
                res.send("<script>alert('Solicitud de registro enviada. Pendiente de aprobación.'); window.location.href='/index.html';</script>");
            });
        });
    });
});


app.get('/pendingRegistrations', (req, res) => {
    const query = "SELECT * FROM SolicitudesRegistro";
    con.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});


app.post('/processRegistration', (req, res) => {
    const { id, action } = req.body;

    if (!id || !action) {
        return res.status(400).send('ID y acción son obligatorios.');
    }

    const getRequestQuery = "SELECT * FROM SolicitudesRegistro WHERE id = ?";
    con.query(getRequestQuery, [id], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.status(404).send('Solicitud no encontrada.');
        }

        const { nombre, contraseña, rol, correo } = results[0];

        if (action === 'aceptar') {
            // Verificar si el nombre de usuario o correo ya existen en la tabla Usuarios
            const checkUserQuery = "SELECT * FROM Usuarios WHERE nombre = ? OR correo = ?";
            con.query(checkUserQuery, [nombre, correo], (err, results) => {
                if (err) throw err;

                if (results.length > 0) {
                    const deleteRequestQuery = "DELETE FROM SolicitudesRegistro WHERE id = ?";
                    con.query(deleteRequestQuery, [id], (err) => {
                        if (err) throw err;
                        return res.send('Solicitud rechazada automáticamente: el nombre de usuario y/o correo ya están registrados.');
                    });
                } else {
                    // Insertar el usuario en la tabla Usuarios directamente con la contraseña hasheada
                    const insertUserQuery = "INSERT INTO Usuarios (nombre, contraseña, rol, correo) VALUES (?, ?, ?, ?)";
                    con.query(insertUserQuery, [nombre, contraseña, rol, correo], (err) => {
                        if (err) throw err;

                        const deleteRequestQuery = "DELETE FROM SolicitudesRegistro WHERE id = ?";
                        con.query(deleteRequestQuery, [id], (err) => {
                            if (err) throw err;
                            res.send('Usuario aceptado y registrado con éxito.');
                        });
                    });
                }
            });
        } else if (action === 'denegar') {
            const deleteRequestQuery = "DELETE FROM SolicitudesRegistro WHERE id = ?";
            con.query(deleteRequestQuery, [id], (err) => {
                if (err) throw err;
                res.send('Solicitud rechazada.');
            });
        } else {
            res.status(400).send('Acción no válida.');
        }
    });
});


// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    const { nombre, contraseña } = req.body;

    if (!nombre || !contraseña) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    const loginQuery = "SELECT * FROM Usuarios WHERE nombre = ?";
    con.query(loginQuery, [nombre], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.send("<script>alert('Usuario no registrado o contraseña incorrecta.'); window.history.back();</script>");
        }

        const user = results[0];
        bcrypt.compare(contraseña, user.contraseña, (err, match) => {
            if (err) throw err;

            if (!match) {
                return res.send("<script>alert('Usuario no registrado o contraseña incorrecta.'); window.history.back();</script>");
            }

            // Guardar datos del usuario en la sesión
            req.session.user = {
                id: user.id,
                nombre: user.nombre,
                rol: user.rol
            };

            // Imprimir el contenido de la sesión en la consola
            console.log('Sesión iniciada:', req.session.user);

            const validRoles = ['Estudiante', 'Profesor', 'Coordinador', 'Dirección'];
            if (validRoles.includes(user.rol)) {
                return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/panelUsuario.html';</script>");
            } else if (user.rol === 'Admin') {
                return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/panelAdministrador.html';</script>");
            } else if (user.rol === 'AdminJefe') {
                return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/panelAdministradorJefe.html';</script>");
            } else {
                return res.send("<script>alert('Rol desconocido.'); window.history.back();</script>");
            }
        });
    });
});



// Rutas protegidas según el rol
app.get('/panelUsuario.html', (req, res) => {
    res.send('Contenido del panel de Usuario');
});

app.get('/panelAdministrador.html', (req, res) => {
    res.send('Contenido del panel de Administradores');
});

app.get('/panelAdministradorJefe.html', (req, res) => {
    res.send('Contenido del panel de Administradores Jefe');
});


//Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    if (req.session.user) {
        // Imprimir los valores actuales antes de destruir la sesión
        console.log('Cerrando sesión para:', req.session.user);
    } else {
        console.log('No hay sesión activa para cerrar.');
    }

    // Destruir la sesión
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            return res.send("<script>alert('Error al cerrar sesión. Por favor, inténtelo de nuevo.'); window.history.back();</script>");
        }

        // Confirmar el cierre de sesión en la consola
        console.log('Sesión cerrada con éxito.');

        // Redirigir al archivo index.html
        res.redirect('/index.html');
    });
});



// Ruta para registrar un evento

app.post('/eventRegister', upload.single('imagen_url'), async (req, res) => {
    const { titulo, fecha, hora_inicio, hora_fin, ubicacion, organizador, descripcion, categoria } = req.body;

    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para crear un evento.'); window.location.href='/index.html';</script>");
    }

    if (!titulo || !fecha || !hora_inicio || !hora_fin || !ubicacion || !organizador || !descripcion || !categoria) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    if (!req.file) {
        return res.send("<script>alert('Debes subir una imagen para el evento.'); window.history.back();</script>");
    }

    const imagenPath = `/uploads/${req.file.filename}`;
    const userId = req.session.user.id;
    const userRole = req.session.user.rol;
    const estado = userRole === 'Admin' ? 'Aceptado' : 'Pendiente';
    const estadoTemporal = 'Por Suceder';

    const insertEventQuery = `
        INSERT INTO Eventos (Nombre, Descripcion, Estado, Fecha, Hora_Inicio, Hora_Fin, Categoria, Ubicacion, Organizador, ID_USUARIO_CREADOR_EVENTO, Estado_Temporal, imagen_url, num_asistentes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;

    con.query(
        insertEventQuery,
        [titulo, descripcion, estado, fecha, hora_inicio, hora_fin, categoria, ubicacion, organizador, userId, estadoTemporal, imagenPath],
        async (err, result) => {
            if (err) {
                console.error('Error al registrar el evento:', err);
                return res.status(500).send('Error interno al registrar el evento.');
            }

            const eventId = result.insertId; // Obtener el ID del evento recién creado

            // Generar QR con QuickChart.io
            const qrData = `https://eventify-pkjh.onrender.com/formulario/${eventId}`;// URL para mostrar información del evento
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

/*
app.get('/event/:id', (req, res) => {
    const eventId = req.params.id;

    const query = `SELECT * FROM Eventos WHERE id = ?`;
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
            </head>
            <body>
                <h1>${evento.Nombre}</h1>
                <p>${evento.Descripcion}</p>
                <p><strong>Fecha:</strong> ${evento.Fecha}</p>
                <p><strong>Hora:</strong> ${evento.Hora_Inicio} - ${evento.Hora_Fin}</p>
                <p><strong>Ubicación:</strong> ${evento.Ubicacion}</p>
                <p><strong>Organizador:</strong> ${evento.Organizador}</p>
                <p><strong>Asistentes:</strong> ${evento.num_asistentes}</p>

                <h2>Confirmar Asistencia</h2>
                <form action="/event/${evento.id}/register" method="POST">
                    <input type="text" name="nombre" placeholder="Tu nombre" required>
                    <input type="text" name="apellidos" placeholder="Tus apellidos" required>
                    <button type="submit">Confirmar</button>
                </form>
            </body>
            </html>
        `);
    });
});

app.post('/event/:id/register', (req, res) => {
    const eventId = req.params.id;

    const query = `UPDATE Eventos SET num_asistentes = num_asistentes + 1 WHERE id = ?`;
    con.query(query, [eventId], (err) => {
        if (err) {
            console.error('Error al actualizar asistentes:', err);
            return res.status(500).send('Error interno.');
        }

        res.send("<script>alert('Gracias por confirmar tu asistencia.'); window.location.href='/';</script>");
    });
});

*/

app.get('/formulario/:id', (req, res) => {
    const eventId = req.params.id;

    // Verificar si el evento existe
    const query = `SELECT * FROM Eventos WHERE ID_EVENTO = ?`;
    con.query(query, [eventId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Evento no encontrado.');
        }

        // Renderizar el formulario HTML, pasando el ID del evento
        res.sendFile(__dirname + '/formularioRegistroAsistenciaEvento.html'); // Asegúrate de que el archivo esté en la raíz del proyecto
    });
});

app.post('/formulario/register', (req, res) => {
    const { eventId, nombre, apellidos } = req.body;

    if (!eventId || !nombre || !apellidos) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Incrementar el número de asistentes en la base de datos
    const query = `UPDATE Eventos SET num_asistentes = num_asistentes + 1 WHERE ID_EVENTO = ?`;
    con.query(query, [eventId], (err) => {
        if (err) {
            console.error('Error al actualizar asistentes:', err);
            return res.status(500).send('Error interno al registrar asistencia.');
        }

        res.send("<script>alert('Gracias por confirmar tu asistencia.'); window.location.href='/';</script>");
    });
});


app.post('/updateEventStatus', (req, res) => {
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

app.get('/pendingEvents', (req, res) => {
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
app.get('/events', (req, res) => {
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

    if (category) {
        query += ` AND Eventos.Categoria = ${mysql.escape(category)}`;
    }

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos:', err);
            return res.status(500).json({ error: "Error al cargar los eventos." });
        }
        res.json(results);
    });
});



// Ruta para obtener los eventos creados por el usuario
app.get('/userEvents', (req, res) => {
    // Verificar si el usuario ha iniciado sesión
    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para ver tus eventos.'); window.location.href='/index.html';</script>");
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


app.post('/updateEvent', upload.single('imagen_url'), (req, res) => {
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
        return res.send("<script>alert('Debes iniciar sesión para editar eventos.'); window.location.href='/index.html';</script>");
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
app.get('/getAllEvents', (req, res) => {
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

app.delete('/deleteEvent', (req, res) => {
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

app.delete('/deleteUser', (req, res) => {
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

// Ruta para obtener todos los usuarios excepto el que tiene el nombre 'adminjefe'
app.get('/getAllUsers', (req, res) => {
    const getAllUsersQuery = "SELECT * FROM Usuarios WHERE nombre != 'adminjefe'";

    con.query(getAllUsersQuery, (err, results) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err);
            return res.status(500).send('Error al obtener los usuarios.');
        }

        res.json(results);
    });
});


// Ruta para actualizar la información de un usuario
app.post('/updateUser', (req, res) => {
    const { id_usuario, nombre, contraseña, email, rol } = req.body;

    // Validar que los campos obligatorios estén presentes
    if (!id_usuario || !nombre || !contraseña || !email || !rol) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Query para actualizar los datos del usuario
    const updateUserQuery = `
        UPDATE Usuarios
        SET nombre = ?, contraseña = ?, correo = ?, rol = ?
        WHERE id = ?
    `;

    // Ejecutar la consulta
    con.query(updateUserQuery, [nombre, contraseña, email, rol, id_usuario], (err, result) => {
        if (err) {
            console.error('Error al actualizar el usuario:', err);
            return res.send("<script>alert('Error interno al actualizar el usuario.'); window.history.back();</script>");
        }

        if (result.affectedRows === 0) {
            return res.send("<script>alert('Usuario no encontrado o no se pudo actualizar.'); window.history.back();</script>");
        }

        res.send("<script>alert('Usuario actualizado con éxito.'); window.history.back();</script>");
    });
});

// Ruta para obtener eventos filtrados por día, semana o mes
app.get('/eventsByDate', (req, res) => {
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




// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
