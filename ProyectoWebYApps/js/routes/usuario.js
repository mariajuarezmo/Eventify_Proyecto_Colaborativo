const express = require('express');
const router = express.Router();
const { upload } = require('../sesiones.js');
const path = require('path');
const con = require('../bbdd');



// Ruta para obtener los eventos creados por el usuario
router.get('/userEvents', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para ver tus eventos.'); window.location.href='/login.html';</script>");
    }

    const userId = req.session.user.id;

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

        res.json(results);
    });
});

// Ruta para registrar un nuevo evento
router.post('/eventRegister', upload.single('imagen_url'), (req, res) => {
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
        (err, result) => {
            if (err) {
                console.error('Error al registrar el evento:', err);
                return res.status(500).send('Error interno al registrar el evento.');
            }

            res.send("<script>alert('Evento creado con éxito.'); window.location.href='/panelUsuario.html';</script>");
        }
    );
});

// Ruta para actualizar un evento existente
router.post('/updateEvent', upload.single('imagen_url'), (req, res) => {
    const { id_evento, titulo, descripcion, fecha, hora_inicio, hora_fin, ubicacion, organizador, categoria } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : req.body.imagen_actual;

    if (!req.session || !req.session.user) {
        return res.send("<script>alert('Debes iniciar sesión para editar eventos.'); window.location.href='/index.html';</script>");
    }

    if (!id_evento || !titulo || !descripcion || !fecha || !hora_inicio || !hora_fin || !ubicacion || !organizador || !categoria || !imagen_url) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    const userId = req.session.user.id;

    const updateEventQuery = `
        UPDATE Eventos
        SET Nombre = ?, Descripcion = ?, Fecha = ?, Hora_Inicio = ?, Hora_Fin = ?, Categoria = ?, Ubicacion = ?, Organizador = ?, imagen_url = ?
        WHERE ID_EVENTO = ? AND ID_USUARIO_CREADOR_EVENTO = ?
    `;

    con.query(updateEventQuery, [titulo, descripcion, fecha, hora_inicio, hora_fin, categoria, ubicacion, organizador, imagen_url, id_evento, userId], (err, result) => {
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

module.exports = router;
