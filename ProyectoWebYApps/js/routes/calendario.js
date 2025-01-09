const express = require('express');
const con = require('../bbdd'); 
const router = express.Router();

// Ruta para obtener eventos desde la base de datos
router.get('/events2', (req, res) => {
    const query = `
        SELECT 
            Nombre AS titulo, 
            Fecha AS fecha, 
            Hora_Inicio AS horaInicio, 
            Hora_Fin AS horaFin, 
            Categoria AS categoria 
        FROM Eventos 
        WHERE Estado = 'Aceptado' AND Estado_Temporal = 'Por Suceder'
    `;

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener eventos:', err);
            return res.status(500).json({ error: 'Error interno al obtener eventos.' });
        }

        // Devuelve los eventos como JSON
        res.json(results);
    });
});

module.exports = router;
