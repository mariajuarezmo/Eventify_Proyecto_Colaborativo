const express = require('express');
const bcrypt = require('bcrypt');
const con = require('../bbdd'); 
const router = express.Router();

//Ruta para cerrar sesión
router.get('/logout', (req, res) => {
    if (req.session.user) {
        // Imprimir los valores actuales antes de destruir la sesión
        console.log('Cerrando sesión para:', req.session.user);
    } else {
        console.log('No hay sesión activa para cerrar.');
    }

    // Destruir la sesión
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            return res.send("<script>alert('Error al cerrar sesión. Por favor, inténtelo de nuevo.'); window.history.back();</script>");
        }

        // Confirmar el cierre de sesión en la consola
        console.log('Sesión cerrada con éxito.');

        // Redirigir al archivo index.html
        res.redirect('index.html');
    });
});
module.exports= router;