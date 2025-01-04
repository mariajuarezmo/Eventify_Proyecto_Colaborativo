const session = require('express-session');
const multer = require('multer');

// Configuración de almacenamiento de imágenes con multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../uploads'); // Carpeta donde se guardarán las imágenes
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname); // Nombre único del archivo
    }
});
const upload = multer({ storage: storage });

// Configuración de la sesión
const sessionMiddleware = session({
    secret: 'clave-secreta', // Cambiar en producción por una clave más segura
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Cambiar a true si se usa HTTPS
});

// Middleware para bloquear rutas según el rol del usuario
function bloquearRutasPorRol(req, res, next) {
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
}

// Middleware para bloquear rutas sin sesión activa
function bloquearRutasSinSesion(req, res, next) {
    const rutasBloqueadasSinSesion = ['/panelUsuario.html', '/panelAdministrador.html', '/panelAdministradorJefe.html'];
    const esRutaBloqueada = rutasBloqueadasSinSesion.some(ruta => req.path.startsWith(ruta));

    if (!req.session || !req.session.user) {
        if (esRutaBloqueada) {
            console.log(`Acceso denegado a ${req.path}: no hay sesión activa.`);
            return res.send("<script>alert('No tienes permiso para acceder a esta página.'); window.history.back();</script>");
        }
    }

    next(); // Continúa con la solicitud si no es una ruta bloqueada
}




module.exports = {
    sessionMiddleware,
    upload,
    bloquearRutasPorRol,
    bloquearRutasSinSesion
};
