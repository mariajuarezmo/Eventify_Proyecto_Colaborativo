const express = require('express');
const bcrypt = require('bcrypt');
const con = require('../bbdd'); 
const router = express.Router();

// Ruta para iniciar sesión
router.post('/login', (req, res) => {
    const { nombre, contraseña } = req.body;

    if (!nombre || !contraseña) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    const loginQuery = "SELECT * FROM Usuarios WHERE nombre = ?";
    con.query(loginQuery, [nombre], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.send("<script>alert('Usuario no registrado o contraseña incorrecta.'); window.history.back();</script>");
        }

        const user = results[0];
        bcrypt.compare(contraseña, user.contraseña, (err, match) => {
            if (err) throw err;

            if (!match) {
                return res.send("<script>alert('Usuario no registrado o contraseña incorrecta.'); window.history.back();</script>");
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
            if (validRoles.includes(user.rol)) {
                return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/panelUsuario.html';</script>");
            } else if (user.rol === 'Admin') {
                return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/panelAdministrador.html';</script>");
            } else if (user.rol === 'AdminJefe') {
                return res.send("<script>alert('Inicio de sesión exitoso.'); window.location.href='/panelAdministradorJefe.html';</script>");
            } else {
                return res.send("<script>alert('Rol desconocido.'); window.history.back();</script>");
            }
        });
    });
});

module.exports = router;
