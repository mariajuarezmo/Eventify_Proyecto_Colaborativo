const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const db = require('../bbdd'); 
require('dotenv').config({ path: '../../.env' });

const router = express.Router();


router.get('/reset-password', (req, res) => {
  const filePath = path.join(__dirname, '../../html/newpass.html');
  res.sendFile(filePath);
});


router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    console.log('Correo introducido:', email);

    try {
        console.log('Verificando si el correo existe en la base de datos...');
        db.query(
            'SELECT * FROM Usuarios WHERE correo = ? AND reset_token IS NULL',
            [email],
            (err, results) => {
                if (err) {
                    console.error('Error al consultar la base de datos:', err);
                    return res.status(500).json({ message: 'Error interno del servidor.' });
                }

                if (results.length === 0) {
                    console.log('El correo no está registrado en la base de datos.');
                    return res.status(404).json({ message: 'Correo no encontrado en la base de datos.' });
                }

                // Generar un token seguro
                console.log('Generando token seguro...');
                const token = crypto.randomBytes(32).toString('hex');
                const expires = Date.now() + 3600000; // 1 hora
                console.log('Token generado:', token);

                // Actualizar la base de datos con el token
                db.query(
                    'UPDATE Usuarios SET reset_token = ?, reset_expire = ? WHERE correo = ?',
                    [token, expires, email],
                    (err) => {
                        if (err) {
                            console.error('Error al actualizar la base de datos:', err);
                            return res.status(500).json({ message: 'Error interno del servidor.' });
                        }

                        // Enviar el correo con el enlace de restablecimiento
                        console.log('Configurando transporte de correo...');
                        const transporter = nodemailer.createTransport({
                            host: 'mail.privateemail.com',
                            port: 465,
                            secure: true, // SSL
                            auth: {
                                user: process.env.MAILBOX,
                                pass: process.env.MAILBOX_PASS,
                            },
                        });

                        const resetLink = `http://localhost:5501/reset-password?token=${token}`;
                        console.log('Enviando correo con enlace de restablecimiento...');
                        transporter.sendMail(
                            {
                                from: '"Eventify Support" <contact@eventify.info>',
                                to: email,
                                subject: 'Restablecer la contraseña',
                                html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${resetLink}">Restablecer Contraseña</a>`,
                            },
                            (err, info) => {
                                if (err) {
                                    console.error('Error al enviar el correo:', err);
                                    return res.status(500).json({ message: 'Error al enviar el correo.' });
                                }
                                console.log('Correo enviado:', info.response);
                                //250 solicitud exitosa, SMTP acepto el correo para entregarlo
                                //4YLt4Q3MFqz3hhVG es un identificador único del correo en la cola del servidor SMTP
                                res.json({ message: 'Correo de restablecimiento enviado correctamente.' });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error inesperado:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
