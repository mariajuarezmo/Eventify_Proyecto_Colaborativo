
const bcrypt = require('bcrypt');

// Cambia esta contraseña por la que quieras para el usuario
const contraseña = 'adminjefe123';

bcrypt.hash(contraseña, 10, (err, hash) => {
    if (err) throw err;
    console.log('Contraseña hasheada:', hash);
});
