const express = require('express');
const router = express.Router();
const { upload } = require('../sesiones.js');
const path = require('path');
const con = require('../bbdd');


// Ruta para obtener las solicitudes de registro pendientes
router.get('/pendingRegistrations', (req, res) => {
    const query = "SELECT * FROM SolicitudesRegistro";
    con.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener registros pendientes:", err);
            return res.status(500).send("Error al obtener registros pendientes.");
        }
        res.status(200).json(results);
    });
});



router.post('/processRegistration', (req, res) => {
    const { id, action } = req.body;

    // Validar los datos recibidos
    if (!id || !action) {
        return res.status(400).send('ID y acción son obligatorios.');
    }

    if (!Number.isInteger(Number(id))) {
        return res.status(400).send('ID debe ser un número válido.');
    }

    const validActions = ['aceptar', 'denegar'];
    if (!validActions.includes(action)) {
        return res.status(400).send('Acción no válida.');
    }

    const getRequestQuery = "SELECT * FROM SolicitudesRegistro WHERE id = ?";
    con.query(getRequestQuery, [id], (err, results) => {
        if (err) {
            console.error("Error al obtener la solicitud:", err);
            return res.status(500).send("Error interno del servidor.");
        }

        if (results.length === 0) {
            return res.status(404).send('Solicitud no encontrada.');
        }

        const { nombre, contraseña, rol, correo } = results[0];

        if (action === 'aceptar') {
            // Verificar si el nombre de usuario o correo ya existen
            const checkUserQuery = "SELECT * FROM Usuarios WHERE nombre = ? OR correo = ?";
            con.query(checkUserQuery, [nombre, correo], (err, results) => {
                if (err) {
                    console.error("Error al verificar usuario:", err);
                    return res.status(500).send("Error interno del servidor.");
                }

                if (results.length > 0) {
                    // Eliminar la solicitud si ya existe el usuario
                    const deleteRequestQuery = "DELETE FROM SolicitudesRegistro WHERE id = ?";
                    con.query(deleteRequestQuery, [id], (err) => {
                        if (err) {
                            console.error("Error al eliminar la solicitud:", err);
                            return res.status(500).send("Error interno del servidor.");
                        }
                        return res.status(200).send('Solicitud rechazada automáticamente: el nombre de usuario y/o correo ya están registrados.');
                    });
                } else {
                    // Insertar el usuario en la tabla Usuarios
                    const insertUserQuery = "INSERT INTO Usuarios (nombre, contraseña, rol, correo) VALUES (?, ?, ?, ?)";
                    con.query(insertUserQuery, [nombre, contraseña, rol, correo], (err) => {
                        if (err) {
                            console.error("Error al registrar el usuario:", err);
                            return res.status(500).send("Error interno del servidor.");
                        }

                        // Eliminar la solicitud una vez aprobado
                        const deleteRequestQuery = "DELETE FROM SolicitudesRegistro WHERE id = ?";
                        con.query(deleteRequestQuery, [id], (err) => {
                            if (err) {
                                console.error("Error al eliminar la solicitud:", err);
                                return res.status(500).send("Error interno del servidor.");
                            }
                            res.status(201).send('Usuario aceptado y registrado con éxito.');
                        });
                    });
                }
            });
        } else if (action === 'denegar') {
            // Eliminar la solicitud
            const deleteRequestQuery = "DELETE FROM SolicitudesRegistro WHERE id = ?";
            con.query(deleteRequestQuery, [id], (err) => {
                if (err) {
                    console.error("Error al eliminar la solicitud:", err);
                    return res.status(500).send("Error interno del servidor.");
                }
                res.status(200).send('Solicitud rechazada.');
            });
        }
    });
});

// Ruta para obtener todos los usuarios
router.get('/getAllUsers', (req, res) => {
    const getAllUsersQuery = "SELECT * FROM Usuarios WHERE nombre != 'adminjefe'";

    con.query(getAllUsersQuery, (err, results) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err);
            return res.status(500).send('Error al obtener los usuarios.');
        }

        res.json(results);
    });
});

// Ruta para eliminar un usuario
router.delete('/deleteUser', (req, res) => {
    const id = req.query.id; // Leer el ID del usuario de los parámetros de consulta
    console.log('ID recibido en el servidor:', id); 

    if (!id) {
        return res.status(400).json({ error: 'El ID del usuario es obligatorio.' });
    }

    const deleteEventQuery = `
        DELETE FROM Usuarios
        WHERE id = ?
    `;

    con.query(deleteEventQuery, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar el usuario:', err);
            return res.status(500).json({ error: 'Error interno al eliminar el usuario.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'El usuario no fue encontrado.' });
        }

        res.json({ success: true, message: 'Usuario eliminado con éxito.' });
    });
});


// Ruta para actualizar un usuario
router.post('/updateUser', (req, res) => {
    const { id_usuario, nombre, contraseña, email, rol } = req.body;

    // Validar que los campos obligatorios estén presentes
    if (!id_usuario || !nombre || !contraseña || !email || !rol) {
        return res.send("<script>alert('Todos los campos son obligatorios.'); window.history.back();</script>");
    }

    // Query para actualizar los datos del usuario
    const updateUserQuery = `
        UPDATE Usuarios
        SET nombre = ?, contraseña = ?, correo = ?, rol = ?
        WHERE id = ?
    `;

    // Ejecutar la consulta
    con.query(updateUserQuery, [nombre, contraseña, email, rol, id_usuario], (err, result) => {
        if (err) {
            console.error('Error al actualizar el usuario:', err);
            return res.send("<script>alert('Error interno al actualizar el usuario.'); window.history.back();</script>");
        }

        if (result.affectedRows === 0) {
            return res.send("<script>alert('Usuario no encontrado o no se pudo actualizar.'); window.history.back();</script>");
        }

        res.send("<script>alert('Usuario actualizado con éxito.'); window.history.back();</script>");
    });
});


module.exports = router;
