const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

const { sessionMiddleware, upload, bloquearRutasPorRol, bloquearRutasSinSesion } = require('./sesiones');

dotenv.config();
const app = express();
const port = process.env.PORT || 5501;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(cors());
app.use(session({
    secret: 'clave-secreta',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


// Usar middlewares personalizados para manejar rutas bloqueadas
app.use(bloquearRutasPorRol);
app.use(bloquearRutasSinSesion);


app.use( express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/img', express.static(path.join(__dirname, '../img')));
app.use('/uploads',express.static('../uploads'));

// Rutas
const eventosRouter = require('./routes/eventos');
const loginRouter= require('./routes/login.js');
const adminRouter= require('./routes/admin.js');
const adminJefeRoutes = require('./routes/adminJefe.js');
const usuarioRouter = require('./routes/usuario.js');
const registroRouter = require('./routes/registro.js');
const resetpassRouter = require('./routes/resetpass.js')
const newpassRouter = require('./routes/newpass.js');
const logoutRouter= require('./routes/logout.js');
const calenderRouter= require('./routes/calendario.js');


// Usar las rutas del administrador jefe
app.use('/adminJefe', adminJefeRoutes);
app.use('/', eventosRouter);
app.use('/', loginRouter);
app.use('/', adminRouter);
app.use('/', usuarioRouter);
app.use('/', registroRouter);
app.use('/', resetpassRouter);
app.use('/', newpassRouter);
app.use('/', logoutRouter);
app.use('/', calenderRouter);

// Ruta principal para la página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/login.html'));
});
//Asegurar que CSP permita cargar recursos externos, aqui de Google Fonts
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;");
    next();
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);

    // Importación dinámica de 'open'
    (async () => {
        const open = (await import('open')).default; // Carga dinámica del módulo
        open(`http://localhost:${port}/index.html`); // Abre la página inicial en el navegador
    })();
});