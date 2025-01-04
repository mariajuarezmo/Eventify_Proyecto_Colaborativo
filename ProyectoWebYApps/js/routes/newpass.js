const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../bbdd");
require("dotenv").config();

const router = express.Router();



router.post("/update-password", (req, res) => {
    const { token, newPassword } = req.body;

    // Validar que el token sea válido y no haya expirado
    db.query(
        "SELECT * FROM Usuarios WHERE reset_token = ? AND reset_expire > ?",
        [token, Date.now()],
        (err, results) => {
            if (err) {
                console.error("Error al consultar la base de datos:", err);
                return res.status(500).json({ message: "Error interno del servidor." });
            }

            if (results.length === 0) {
                return res.status(400).json({ message: "El token no es válido o ha expirado." });
            }

            const user = results[0];

            // Hashear la nueva contraseña
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error("Error al hashear la contraseña:", err);
                    return res.status(500).json({ message: "Error interno del servidor." });
                }

                // Actualizar la contraseña en la base de datos 
                db.query(
                    "UPDATE Usuarios SET contraseña = ?, reset_token = NULL, reset_expire = NULL WHERE id = ?",
                    [hashedPassword, user.id],
                    (err) => {
                        if (err) {
                            console.error("Error al actualizar la contraseña:", err);
                            return res.status(500).json({ message: "Error interno del servidor." });
                        }

                        console.log(`Contraseña del usuario ${user.correo} actualizada con éxito.`);
                        return res.status(200).json({ message: "Contraseña actualizada con éxito." });
                    }
                );
            });
        }
    );
});

module.exports = router;
