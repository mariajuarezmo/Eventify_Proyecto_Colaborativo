const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3000;

// Middleware para procesar datos de formularios
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta actual
app.use(express.static(__dirname));

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


            const createEventsTableQuery = `
                CREATE TABLE IF NOT EXISTS Eventos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    titulo VARCHAR(100) NOT NULL,
                    fecha DATE NOT NULL,
                    hora TIME NOT NULL,
                    ubicacion VARCHAR(100) NOT NULL,
                    organizador VARCHAR(100) NOT NULL,
                    descripcion TEXT NOT NULL,
                    categoria VARCHAR(50) NOT NULL,
                    id_usuario INT,
                    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id) ON DELETE CASCADE
                )
            `;

            con.query(createEventsTableQuery, function (err) {
                if (err) throw err;
                console.log("Table 'Eventos' created or already exists!");
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

//Ruta para registrar evento
app.post('/eventRegister', (req, res) => {
    const { titulo, fecha, hora, ubicacion, organizador, descripcion, categoria } = req.body;

    if (!titulo || !fecha || !hora || !ubicacion || !organizador || !descripcion || !categoria) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    if (!loggedInUserId) {
        return res.send("<script>alert('Debes iniciar sesión antes de crear un evento.'); window.location.href='/index.html';</script>");
    }

    // Insertar el evento en la base de datos
    const insertEventQuery = `
        INSERT INTO Eventos (titulo, fecha, hora, ubicacion, organizador, descripcion, categoria, id_usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    con.query(insertEventQuery, [titulo, fecha, hora, ubicacion, organizador, descripcion, categoria, loggedInUserId], (err) => {
        if (err) throw err;
        res.send("<script>alert('Evento creado con éxito.'); window.location.href='/html/panelUsuario.html';</script>");
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
