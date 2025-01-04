const express = require('express');
const con = require('../bbdd');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configuración para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Ruta para obtener eventos pendientes
router.get('/pendingEvents', (req, res) => {
    const query = "SELECT * FROM Eventos WHERE Estado = 'Pendiente'";
    con.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos pendientes:', err);
            return res.status(500).json({ error: 'Error al cargar los eventos pendientes.' });
        }
        res.json(results);
    });
});

// Ruta para actualizar el estado de un evento
router.post('/updateEventStatus', (req, res) => {
    const { id_evento, nuevo_estado } = req.body;

    if (!id_evento || !nuevo_estado) {
        return res.status(400).json({ error: 'El ID del evento y el nuevo estado son obligatorios.' });
    }

    if (nuevo_estado === 'Denegado') {
        // Eliminar el evento si se deniega
        const deleteQuery = `DELETE FROM Eventos WHERE ID_EVENTO = ?`;
        con.query(deleteQuery, [id_evento], (err, result) => {
            if (err) {
                console.error('Error al eliminar el evento:', err);
                return res.status(500).json({ error: 'Error interno al eliminar el evento.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'El evento no fue encontrado.' });
            }
            res.json({ success: true, id_evento, message: 'Evento denegado y eliminado correctamente.' });
        });
    } else if (nuevo_estado === 'Aceptado') {
        // Actualizar el estado del evento
        const updateQuery = `UPDATE Eventos SET Estado = ? WHERE ID_EVENTO = ?`;
        con.query(updateQuery, [nuevo_estado, id_evento], (err, result) => {
            if (err) {
                console.error('Error al actualizar el evento:', err);
                return res.status(500).json({ error: 'Error interno al actualizar el evento.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'El evento no fue encontrado.' });
            }
            res.json({ success: true, id_evento, nuevo_estado });
        });
    } else {
        return res.status(400).json({ error: 'El estado especificado no es válido.' });
    }
});

// Ruta para obtener todos los eventos
router.get('/getAllEvents', (req, res) => {
    const query = "SELECT * FROM Eventos";
    con.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos:', err);
            return res.status(500).json({ error: 'Error al cargar los eventos.' });
        }
        res.json(results);
    });
});

// Ruta para actualizar un evento
router.post('/updateEvent', upload.single('imagen_url'), (req, res) => {
    const { id_evento, titulo, descripcion, fecha, hora_inicio, hora_fin, ubicacion, organizador, categoria } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : req.body.imagen_actual;

    if (!id_evento || !titulo || !descripcion || !fecha || !hora_inicio || !hora_fin || !ubicacion || !organizador || !categoria) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const query = `
        UPDATE Eventos
        SET Nombre = ?, Descripcion = ?, Fecha = ?, Hora_Inicio = ?, Hora_Fin = ?, Categoria = ?, Ubicacion = ?, Organizador = ?, imagen_url = ?
        WHERE ID_EVENTO = ?
    `;
    con.query(query, [titulo, descripcion, fecha, hora_inicio, hora_fin, categoria, ubicacion, organizador, imagen_url, id_evento], (err, result) => {
        if (err) {
            console.error('Error al actualizar el evento:', err);
            return res.status(500).json({ error: 'Error interno al actualizar el evento.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Evento no encontrado.' });
        }
        res.json({ success: true, message: 'Evento actualizado con éxito.' });
    });
});

// Ruta para eliminar un evento
router.delete('/deleteEvent', (req, res) => {
    const id_evento = req.query.id_evento;
    if (!id_evento) {
        return res.status(400).json({ error: 'El ID del evento es obligatorio.' });
    }

    const query = `DELETE FROM Eventos WHERE ID_EVENTO = ?`;
    con.query(query, [id_evento], (err, result) => {
        if (err) {
            console.error('Error al eliminar el evento:', err);
            return res.status(500).json({ error: 'Error interno al eliminar el evento.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Evento no encontrado.' });
        }
        res.json({ success: true, message: 'Evento eliminado con éxito.' });
    });
});

module.exports = router;