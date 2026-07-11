const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 25625,
    ssl: {
        rejectUnauthorized: false
    }
});

connection.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos de Aiven:', err);
        return;
    }
    console.log('¡Conectado con éxito a la base de datos MySQL en la nube!');
});

module.exports = connection;