const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // For sending emails
//const db = require('./database'); // Replace with your database connection
const mysql = require('mysql2'); // Or your chosen database library
const app = express();
const cors = require('cors');
require('dotenv').config({ path: '../.env' });



app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
  host: process.env.HOST, // Servidor de MySQL
  user: 'root',      // 
  password: process.env.BBDD_PASS,      // Contraseña 
  database: 'Eventify', // Nombre de la base de datos
  port: 3369,
}).promise();

db.query('SELECT 1')
  .then(() => console.log('Connected to database.'))
  .catch((err) => {
    console.error('Database connection failed:', err.stack);
    process.exit(1); // Salir si no se puede conectar
  });

module.exports = db;

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('Correo introducido:', email); // Log the incoming email

  try {
    // Check if email exists in the database
    console.log('mirando si existe en la bbdd...');
    const [user] = await db.query(
      'SELECT * FROM Usuarios WHERE correo = ? AND (reset_token IS NULL OR token_used = FALSE)',
      [email]
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
    const resetLink = `http://eventify.info/reset-password?token=${token}`;
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
      text: `You requested to reset your password. Click the link to reset it: ${resetLink}`,
      html: `<p>You requested to reset your password. Click the link below to reset it:</p>
             <a href="${resetLink}">Reset Password</a>`,
    });
    console.log('Correo enviado!', mailResult);

    res.json({ message: 'Se ha enviado el correo correctamente!!' });
  } catch (error) {
    console.error('Error:', error); // Log any errors
    res.status(500).json({ message: 'No se ha podido enviar un correo.' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000...');
});
