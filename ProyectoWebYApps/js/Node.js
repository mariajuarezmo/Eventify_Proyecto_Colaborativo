const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // For sending emails
//const db = require('./database'); // Replace with your database connection
const mysql = require('mysql2'); // Or your chosen database library
const app = express();
const cors = require('cors');
require('dotenv').config({ path: '../.env' });
const path = require('path');



app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
  host: process.env.HOST, 
  user: 'root',     
  password: process.env.BBDD_PASS,     
  database: 'Eventify',
  port: 3369,
}).promise();

db.query('SELECT 1')
  .then(() => console.log('Connected to database.'))
  .catch((err) => {
    console.error('Database connection failed:', err.stack);
    process.exit(1); 
  });

module.exports = db;

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('Correo introducido:', email); 

  try {
    console.log('mirando si el correo existe en la bbdd...');
    const [user] = await db.query('SELECT * FROM Usuarios WHERE correo = ? AND (reset_token IS NULL OR token_used = FALSE)', [email]       
    );
    console.log('resultado:', user);
    
    if (!user.length) {
      console.log('no esta en la bbdd.');
      return res.status(404).json({ message: 'no esta en la bbdd' });
    }

    // Generate a secure token
    console.log('Generating secure token...');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 36000; // Token expires in 1 hour
    console.log('Generated token:', token);
    console.log('Token expiry time:', new Date(expires));

    // Store token in the database
    console.log('Storing token and expiry in database...');
    const updateResult = await db.query('UPDATE Usuarios SET reset_token = ?, reset_expire = ? WHERE correo = ?', [token, expires, email]);
    console.log('Database update result:', updateResult);

    // Send email with reset link
    console.log('Creating reset link...');
    //const resetLink = `http://eventify.info/reset-password?token=${token}`;
    const resetLink = `http://localhost:3000/reset-password?token=${token}`; //para probar que funciona en el local

    console.log('Reset link:', resetLink);

    console.log('Setting up transporter...');
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 465,
      secure: true, // true para SSL
      auth: {
        user: process.env.MAILBOX,
        pass: process.env.MAILBOX_PASS
      }
    });
    
    console.log('Sending email...');
    const mailResult = await transporter.sendMail({
      from: '"Eventify Support" <contact@eventify.info>',
      to: email,
      subject: 'Restablecer la contraseña',
      text: `enlace para restablecer la contraseña: ${resetLink}`,
      html: `<p>Se ha solicitado restablecer la contraseña. Pulsa aqui para cambiar tu contraseña::</p>
             <a href="${resetLink}">Nueva contraseña</a>`,
    });
    console.log('Correo enviado!', mailResult);

    res.json({ message: 'Se ha enviado el correo correctamente!!' });
  } catch (error) {
    console.error('Error:', error); // Log any errors
    res.status(500).json({ message: 'No se ha podido enviar un correo.' });
  }
});

//HACEMOS UN GET PARA VERIFICAR QUE EL TOKEN ES VALIDO Y NO SE HA USADO ANTERIORMENTE
//para redirigir el enlace de reset a la pagina de resetpass.html
app.get('/reset-password', async (req, res) => {
  const { token } = req.query;

  try {
    const [rows] = await db.query(
      'SELECT * FROM Usuarios WHERE reset_token = ? AND reset_expire > ? AND token_used = FALSE',
      [token, Date.now()]
    );
      //si no es valido:
    if (!rows.length) {
      return res.status(400).json({ message: 'El enlace no es válido o ha expirado.' });
    }
    
    //si es valido:
    const filePath = path.join(__dirname, '../html/newpass.html');

    app.use('/css', express.static(path.join(__dirname, '../css')));
    app.use('/js', express.static(path.join(__dirname, '../js')));
    app.use('/img', express.static(path.join(__dirname, '../img')));
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error al verificar el token:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


app.listen(3000, () => {
  console.log('Server is running on port 3000...');
});
