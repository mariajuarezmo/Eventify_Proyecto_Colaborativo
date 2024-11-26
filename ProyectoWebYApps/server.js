const express = require('express');
const mysql = require('mysql');
const path = require('path');

const app = express();
const port = 3000;

// Middleware para procesar datos de formularios
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(path.join(__dirname)));

// Configuración de conexión a la base de datos
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
});
// Conexión al servidor MySQL
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected to MySQL!");

    // Crear la base de datos
    con.query("CREATE DATABASE IF NOT EXISTS bbddProyectoGrupalWebYApps", function (err) {
        if (err) throw err;
        console.log("Database 'bbddProyectoGrupalWebYApps' created or already exists!");

        // Usar la base de datos
        con.changeUser({ database: 'bbddProyectoGrupalWebYApps' }, function (err) {
            if (err) throw err;

            // Crear la tabla Usuarios
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS Usuarios (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nombre VARCHAR(50) NOT NULL,
                    contraseña VARCHAR(255) NOT NULL,
                    rol VARCHAR(20) NOT NULL
                )
            `;
            con.query(createTableQuery, function (err) {
                if (err) throw err;
                console.log("Table 'Usuarios' created or already exists!");
            });


            // Crear la tabla Eventos
                const createEventsTableQuery = `
                CREATE TABLE IF NOT EXISTS Eventos (
                    ID_EVENTO INT AUTO_INCREMENT PRIMARY KEY,
                    ID_USUARIO_CREADOR_EVENTO INT,
                    ID_ADMIN_APROBADOR INT,
                    Nombre VARCHAR(100) NOT NULL,
                    Descripcion TEXT NOT NULL,
                    Estado ENUM('Aceptado', 'Denegado', 'Pendiente') DEFAULT 'Pendiente',
                    Fecha DATE NOT NULL,
                    Hora TIME NOT NULL,
                    Categoria VARCHAR(50) NOT NULL,
                    Ubicacion VARCHAR(100) NOT NULL,
                    Organizador VARCHAR(100) NOT NULL,
                    QR VARCHAR(255),
                    FOREIGN KEY (ID_USUARIO_CREADOR_EVENTO) REFERENCES Usuarios(ID) ON DELETE CASCADE,
                    FOREIGN KEY (ID_ADMIN_APROBADOR) REFERENCES Usuarios(ID) ON DELETE SET NULL
                )
                `;
            con.query(createEventsTableQuery, (err) => {
                if (err) throw err;
                console.log("Table 'Eventos' created or already exists!");
            });

            // Lógica para actualizar Estado_Temporal periódicamente
        setInterval(() => {
            const updateTemporalStatusQuery = `
                UPDATE Eventos
                SET Estado_Temporal = CASE
                    WHEN Fecha < CURDATE() THEN 'Pasado'
                    ELSE 'Por Suceder'
                END
            `;

            con.query(updateTemporalStatusQuery, (err) => {
                if (err) console.error('Error al actualizar Estado_Temporal:', err);
                else console.log('Estado_Temporal actualizado.');
            });
        }, 1000 * 60 * 60); // Ejecuta cada hora

            con.query("ALTER TABLE Eventos ADD COLUMN Estado_Temporal ENUM('Por Suceder', 'Pasado') DEFAULT 'Por Suceder'", (err) => {
                if (err && err.code !== 'ER_DUP_FIELDNAME') throw err;
            });

             

        });

    });
});

// Ruta para registrar un usuario
app.post('/register', (req, res) => {
    const { nombre, contraseña, rol } = req.body;

    if (!nombre || !contraseña || !rol) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Verificar si el usuario ya existe
    const checkUserQuery = "SELECT * FROM Usuarios WHERE nombre = ?";
    con.query(checkUserQuery, [nombre], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            return res.send("<script>alert('El usuario ya está registrado.'); window.history.back();</script>");
        }

        // Insertar nuevo usuario
        const insertUserQuery = "INSERT INTO Usuarios (nombre, contraseña, rol) VALUES (?, ?, ?)";
        con.query(insertUserQuery, [nombre, contraseña, rol], (err) => {
            if (err) throw err;
            res.send("<script>alert('Usuario registrado con éxito.'); window.location.href='/index.html';</script>");
        });
    });
});

let loggedInUserId = null;

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    const { nombre, contraseña } = req.body;

    if (!nombre || !contraseña) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    const loginQuery = "SELECT * FROM Usuarios WHERE nombre = ? AND contraseña = ?";
    con.query(loginQuery, [nombre, contraseña], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.send("<script>alert('Usuario no registrado o contraseña incorrecta.'); window.history.back();</script>");
        }

        // Guardar el ID del usuario logueado
        const user = results[0];
        loggedInUserId = user.id;

        const validRoles = ['Estudiante', 'Profesor', 'Coordinador', 'Dirección'];
        if (validRoles.includes(user.rol)) {
            return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/html/panelUsuario.html';</script>");
        } else if (user.rol === 'Admin') {
            return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/html/panelAdministrador.html';</script>");
        } else {
            return res.send("<script>alert('Rol desconocido.'); window.history.back();</script>");
        }
    });
});

app.post('/eventRegister', (req, res) => {
    const { titulo, fecha, hora, ubicacion, organizador, descripcion, categoria } = req.body;

    if (!titulo || !fecha || !hora || !ubicacion || !organizador || !descripcion || !categoria) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    if (!loggedInUserId) {
        return res.send("<script>alert('Debes iniciar sesión antes de crear un evento.'); window.location.href='/index.html';</script>");
    }

    // Combinar fecha y hora para validar
    const now = new Date(); // Fecha y hora actuales
    const eventDate = new Date(`${fecha}T${hora}`); // Combinar fecha y hora del evento

    // Validar si la fecha y hora ya han pasado
    if (eventDate < now) {
        return res.send("<script>alert('La fecha y hora del evento ya han pasado. No se puede registrar el evento.'); window.history.back();</script>");
    }

    // Obtener el rol del usuario
    const userRoleQuery = "SELECT rol FROM Usuarios WHERE id = ?";
    con.query(userRoleQuery, [loggedInUserId], (err, results) => {
        if (err) throw err;

        const userRole = results[0].rol;
        const estado = userRole === 'Admin' ? 'Aceptado' : 'Pendiente';

        // Insertar el evento
        const insertEventQuery = `
            INSERT INTO Eventos (Nombre, Descripcion, Estado, Fecha, Hora, Categoria, Ubicacion, Organizador, ID_USUARIO_CREADOR_EVENTO, Estado_Temporal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const estadoTemporal = 'Por Suceder'; // Ya validamos que no es pasado

        con.query(
            insertEventQuery,
            [titulo, descripcion, estado, fecha, hora, categoria, ubicacion, organizador, loggedInUserId, estadoTemporal],
            (err) => {
                if (err) throw err;
                res.send("<script>alert('Evento creado con éxito.'); window.location.href='/html/panelUsuario.html';</script>");
            }
        );
    });
});




app.post('/updateEventStatus', (req, res) => {
    const { id_evento, nuevo_estado } = req.body;

    if (!id_evento || !nuevo_estado) {
        return res.send("<script>alert('El ID del evento y el nuevo estado son obligatorios.'); window.history.back();</script>");
    }

    const updateEventQuery = `
        UPDATE Eventos
        SET Estado = ?, ID_ADMIN_APROBADOR = ?
        WHERE ID_EVENTO = ?
    `;
    con.query(updateEventQuery, [nuevo_estado, loggedInUserId, id_evento], (err) => {
        if (err) {
            console.error('Error al actualizar el evento:', err);
            return res.send("<script>alert('Error interno al actualizar el evento.'); window.history.back();</script>");
        }
        res.send(`<script>alert('Evento actualizado a ${nuevo_estado} con éxito.'); window.location.href='/html/panelAdministrador.html';</script>`);
    });
});


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

// Ruta para obtener eventos aceptados y por suceder
app.get('/events', (req, res) => {
    const query = `
        SELECT Nombre, Descripcion, Fecha, Hora, Categoria, Ubicacion, Organizador
        FROM Eventos
        WHERE Estado = 'Aceptado' AND Estado_Temporal = 'Por Suceder'
    `;
    con.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos:', err);
            return res.status(500).json({ error: "Error al cargar los eventos." });
        }
        console.log('Eventos obtenidos:', results); // Log para verificar resultados
        res.json(results);
    });
});


app.get('/userEvents', (req, res) => {
    if (!loggedInUserId) {
        return res.send("<script>alert('Debes iniciar sesión para ver tus eventos.'); window.location.href='/index.html';</script>");
    }

    const userEventsQuery = `
        SELECT ID_EVENTO, Nombre, Descripcion, Fecha, Hora, Categoria, Ubicacion, Organizador
        FROM Eventos
        WHERE ID_USUARIO_CREADOR_EVENTO = ?
    `;

    con.query(userEventsQuery, [loggedInUserId], (err, results) => {
        if (err) {
            console.error('Error al obtener los eventos del usuario:', err);
            return res.status(500).send("Error al cargar los eventos.");
        }
        res.json(results); // Devuelve los eventos del usuario como JSON
    });
});

app.post('/updateEvent', (req, res) => {
    const { id_evento, titulo, descripcion, fecha, hora, ubicacion, organizador, categoria } = req.body;

    if (!id_evento || !titulo || !descripcion || !fecha || !hora || !ubicacion || !organizador || !categoria) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    if (!loggedInUserId) {
        return res.send("<script>alert('Debes iniciar sesión para editar eventos.'); window.location.href='/index.html';</script>");
    }

    const updateEventQuery = `
        UPDATE Eventos
        SET Nombre = ?, Descripcion = ?, Fecha = ?, Hora = ?, Categoria = ?, Ubicacion = ?, Organizador = ?
        WHERE ID_EVENTO = ? AND ID_USUARIO_CREADOR_EVENTO = ?
    `;

    con.query(updateEventQuery, [titulo, descripcion, fecha, hora, categoria, ubicacion, organizador, id_evento, loggedInUserId], (err) => {
        if (err) {
            console.error('Error al actualizar el evento:', err);
            return res.send("<script>alert('Error interno al actualizar el evento.'); window.history.back();</script>");
        }
        res.send("<script>alert('Evento actualizado con éxito.'); window.location.href='/html/panelUsuario.html';</script>");
    });
});



// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
