const express = require('express');
const bcrypt = require('bcrypt');
const con = require('../bbdd');
const router = express.Router();


// Ruta para registrar un usuario
router.post('/register', (req, res) => {
    const { nombre, contraseña, rol, email } = req.body;

    // Validar que todos los campos están presentes
    if (!nombre || !contraseña || !rol || !email) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Verificar si el nombre de usuario o el correo ya existen en la tabla Usuarios
    const checkUserQuery = "SELECT * FROM Usuarios WHERE nombre = ? OR correo = ?";
    con.query(checkUserQuery, [nombre, email], (err, results) => {
        if (err) {
            console.error("Error al verificar usuario:", err);
            return res.status(500).send("Ocurrió un error al procesar tu solicitud.");
        }

        if (results.length > 0) {
            return res.status(400).send("<script>alert('El nombre de usuario y/o correo ya están registrados.'); window.history.back();</script>");
        }

        // Hashear la contraseña
        bcrypt.hash(contraseña, 10, (err, hashedPassword) => {
            if (err) {
                console.error("Error al hashear la contraseña:", err);
                return res.status(500).send("Ocurrió un error al procesar tu solicitud.");
            }

            // Insertar los datos en la tabla temporal SolicitudesRegistro
            const insertRequestQuery = `
                INSERT INTO SolicitudesRegistro (nombre, contraseña, rol, correo) 
                VALUES (?, ?, ?, ?)
            `;
            con.query(insertRequestQuery, [nombre, hashedPassword, rol, email], (err) => {
                if (err) {
                    console.error("Error al insertar la solicitud de registro:", err);
                    return res.status(500).send("Ocurrió un error al procesar tu solicitud.");
                }
                res.status(201).send("<script>alert('Solicitud de registro enviada. Pendiente de aprobación.'); window.location.href='/login.html';</script>");
            });
        });
    });
});

module.exports = router;
