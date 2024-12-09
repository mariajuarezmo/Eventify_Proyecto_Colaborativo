const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Simular una base de datos
const users = [
    { email: "usuario@example.com", password: "oldPassword123" },
];

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.post("/update-password", (req, res) => {
    const { email, newPassword } = req.body;

    // Verificar que el usuario exista
    const user = users.find((u) => u.email === email);
    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar la contraseña
    user.password = newPassword;
    console.log(`Contraseña del usuario ${email} actualizada a: ${newPassword}`);

    return res.status(200).json({ message: "Contraseña actualizada con éxito" });
});

app.listen(9000, () => {
    console.log("Servidor ejecutándose en http://127.0.0.1:9000");
});
