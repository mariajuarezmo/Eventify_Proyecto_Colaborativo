const express = require('express');
const bcrypt = require('bcrypt');
const con = require('../bbdd'); 
const router = express.Router();

// Ruta para iniciar sesión
router.post('/login', (req, res) => {
    const { nombre, contraseña } = req.body;

    if (!nombre || !contraseña) {
        return res.json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const loginQuery = "SELECT * FROM Usuarios WHERE nombre = ?";
    con.query(loginQuery, [nombre], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.json({ success: false, message: 'Usuario no registrado o contraseña incorrecta.' });
        }

        const user = results[0];
        bcrypt.compare(contraseña, user.contraseña, (err, match) => {
            if (err) throw err;

            if (!match) {
                return res.json({ success: false, message: 'Usuario no registrado o contraseña incorrecta.' });
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
            let redirectUrl;

            if (validRoles.includes(user.rol)) {
                redirectUrl = '/panelUsuario.html';
            } else if (user.rol === 'Admin') {
                redirectUrl = '/panelAdministrador.html';
            } else if (user.rol === 'AdminJefe') {
                redirectUrl = '/panelAdministradorJefe.html';
            } else {
                return res.json({ success: false, message: 'Rol desconocido.' });
            }

            // Respuesta exitosa con URL de redirección
            return res.json({ success: true, redirectUrl });
        });
    });
});

module.exports = router;
