const express = require('express');
const bcrypt = require('bcrypt');
const con = require('../bbdd');
const router = express.Router();

// Ruta para registrar un usuario
router.post('/register', (req, res) => {
    const { nombre, contraseña, rol, email } = req.body;

    if (!nombre || !contraseña || !rol || !email) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    const checkUserQuery = "SELECT * FROM Usuarios WHERE nombre = ? OR correo = ?";
    con.query(checkUserQuery, [nombre, email], (err, results) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.status(500).json({ success: false, message: 'Error interno al procesar tu solicitud.' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario y/o correo ya están registrados.' });
        }

        bcrypt.hash(contraseña, 10, (err, hashedPassword) => {
            if (err) {
                console.error("Error al hashear la contraseña:", err);
                return res.status(500).json({ success: false, message: 'Error interno al procesar tu solicitud.' });
            }

            const insertRequestQuery = `
                INSERT INTO SolicitudesRegistro (nombre, contraseña, rol, correo) 
                VALUES (?, ?, ?, ?)
            `;
            con.query(insertRequestQuery, [nombre, hashedPassword, rol, email], (err) => {
                if (err) {
                    console.error("Error al insertar la solicitud de registro:", err);
                    return res.status(500).json({ success: false, message: 'Error interno al procesar tu solicitud.' });
                }
                res.status(201).json({ success: true, message: 'Solicitud de registro enviada. Pendiente de aprobación.' });
            });
        });
    });
});

module.exports = router;
