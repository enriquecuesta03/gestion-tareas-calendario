// 1. Importamos Express (la librería que acabas de instalar)
const express = require('express');

// 2. Inicializamos la aplicación
const app = express();

// 3. Definimos el puerto donde va a "escuchar" nuestro servidor
const PORT = 3000;

// 4. Creamos nuestra primera ruta de prueba
app.get('/', (req, res) => {
    res.send('¡Hola! El servidor del TFG está funcionando a la perfección.');
});

// 5. Encendemos el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});