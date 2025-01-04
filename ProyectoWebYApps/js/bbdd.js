const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config({path: '../.env'});

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

con.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log("Connected to MySQL!");
});

module.exports = con;
