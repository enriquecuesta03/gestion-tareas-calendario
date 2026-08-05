/*********************************************************************************
Archivo de conexión a la base de datos (db.js).
Aquí se configura la conexión directa entre nuestro servidor y la base de 
datos MySQL alojada en la nube de Aiven. Utiliza las contraseñas guardadas 
de forma segura en el archivo .env para proteger la información.
***********************************************************************************/

const mysql = require('mysql2');

// Configuramos los datos de acceso usando las variables seguras de nuestro entorno
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 25625, // Puerto específico asignado por Aiven[cite: 12]
    ssl: {
        rejectUnauthorized: false // Seguridad obligatoria activada para conectar con la nube[cite: 12]
    },
    dateStrings: true, // Obliga a MySQL a devolver la fecha exacta que escribiste (ej. "23:45") sin alterarla.
    timezone: 'Z'      // Evita que la base de datos intente sumar o restar horas por su cuenta.
});

// Intentamos conectarnos y mostramos un mensaje en la consola para saber si ha funcionado
connection.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos de Aiven:', err);
        return;
    }
    console.log('Conectado con éxito a la base de datos MySQL en la nube.');
});

// Dejamos la conexión lista para que los demás archivos del proyecto puedan usarla
module.exports = connection;