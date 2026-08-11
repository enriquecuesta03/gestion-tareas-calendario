/*********************************************************************************
Archivo de gestión de usuarios y seguridad (auth.js).
Aquí se controla quién puede entrar a la aplicación. Se encarga de revisar 
las contraseñas, crear cuentas nuevas, gestionar el inicio de sesión con 
Google o GitHub, y proteger los datos personales para que nadie sin permiso 
pueda verlos o modificarlos.
***********************************************************************************/

const express = require('express');
const bcrypt = require('bcryptjs'); // Herramienta para encriptar y ocultar contraseñas
const jwt = require('jsonwebtoken'); // Herramienta para crear llaves de acceso temporales (tokens)
const { OAuth2Client } = require('google-auth-library'); // Herramienta para conectarnos con Google
const db = require('../db'); 

// --- LIBRERIAS EXTRA DE SEGURIDAD ---
const rateLimit = require('express-rate-limit');
// ------------------------------------

const router = express.Router(); 
// La contraseña maestra del servidor para firmar las llaves de acceso.
// Sin esta variable de entorno, la aplicación no arranca: es preferible un
// fallo claro al arrancar a que corra con un secreto visible en el código.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FALTA LA VARIABLE DE ENTORNO JWT_SECRET. La aplicación no puede arrancar sin ella.');
    process.exit(1);
}

// Identificador público de nuestra aplicación en los servidores de Google
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
    console.error('FALTA LA VARIABLE DE ENTORNO GOOGLE_CLIENT_ID. La aplicación no puede arrancar sin ella.');
    process.exit(1);
}

// ===================================================================
// Identificadores para conectarnos con los servidores de GitHub
// ===================================================================
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('FALTAN LAS VARIABLES DE ENTORNO GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET. La aplicación no puede arrancar sin ellas.');
    process.exit(1);
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- REGISTRO TRADICIONAL ---
// Recibe los datos del formulario, oculta la contraseña por seguridad y guarda al usuario en la base de datos
router.post('/registro', async (req, res) => {
    const { nombre, email, password, fecha_nacimiento } = req.body;
    
    try {
        // Encriptamos la contraseña para no guardarla en texto plano
        const salt = await bcrypt.genSalt(10);
        const passwordHasheada = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO usuarios (nombre, email, password, fecha_nacimiento, fecha_creacion) VALUES (?, ?, ?, ?, NOW())';
        db.query(query, [nombre, email, passwordHasheada, fecha_nacimiento], (err, resultado) => {
            if (err) {
                // Si el error es porque el correo ya existe, avisamos al usuario
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El email ya esta registrado' });
                return res.status(500).json({ error: 'Error al registrar usuario' });
            }
            res.json({ mensaje: 'Usuario registrado con exito' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Limitador de peticiones para mitigar ataques de fuerza bruta
// Restringimos a 5 intentos de acceso fallidos cada 15 minutos por IP
const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
    max: 5, // Límite de 5 intentos
    message: { error: 'Demasiados intentos fallidos. Por seguridad, tu cuenta ha sido bloqueada temporalmente. Inténtalo de nuevo en 15 minutos.' },
    standardHeaders: true, 
    legacyHeaders: false,
});

// --- INICIO DE SESIÓN TRADICIONAL ---
// Aplica el limitador exclusivamente a la ruta de validación de credenciales
router.post('/login', limitadorLogin, (req, res) => {
    const { email, password } = req.body;

    // Buscamos al usuario y le damos un formato limpio a su fecha de nacimiento
    db.query(`SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE email = ?`, [email], async (err, resultados) => {
        if (err) {
            console.error("ERROR SQL EN LOGIN:", err);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        if (resultados.length === 0) {
            console.log(`FALLO LOGIN: El email ${email} no existe en la BD`);
            return res.status(401).json({ error: 'Email o contrasena incorrectos' });
        }

        const usuario = resultados[0];
        
        // Comparamos la contraseña que ha escrito con la que tenemos encriptada
        const passCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passCorrecta) {
            console.log(`FALLO LOGIN: Contraseña incorrecta para ${email}.`);
            return res.status(401).json({ error: 'Email o contrasena incorrectos' });
        }

        // Si todo es correcto, le creamos una llave de acceso que durará 24 horas
        const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
        
        console.log(`LOGIN EXITOSO: Bienvenido ${usuario.nombre}`);
        res.json({ 
            mensaje: 'Login exitoso', 
            token, 
            nombre: usuario.nombre,
            fecha_nacimiento: usuario.fecha_nac_limpia 
        });
    });
});

// --- INICIO DE SESIÓN CON GOOGLE ---
// Google nos envía un comprobante. Si es válido, dejamos pasar al usuario.
router.post('/google', async (req, res) => {
    const { token, fecha_nacimiento } = req.body;

    try {
        // Verificamos con Google que el comprobante sea real
        const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload.email;
        const nombre = payload.name;

        db.query(`SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE email = ?`, [email], async (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });

            if (resultados.length > 0) {
                // Si el usuario ya estaba registrado en nuestro sistema, le damos la llave y le dejamos entrar
                const usuario = resultados[0];
                const jwtToken = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ mensaje: 'Login de Google exitoso', token: jwtToken, nombre: usuario.nombre, fecha_nacimiento: usuario.fecha_nac_limpia });
            } else {
                // Si es la primera vez que entra con Google y no tenemos su fecha, se la pedimos
                if (!fecha_nacimiento) {
                    return res.status(206).json({ mensaje: 'Se requiere fecha de nacimiento', requiereFecha: true, email: email, nombre: nombre });
                }

                // Creamos una contraseña aleatoria porque siempre va a usar Google para entrar
                const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
                const queryInsert = 'INSERT INTO usuarios (nombre, email, password, fecha_nacimiento, fecha_creacion) VALUES (?, ?, ?, ?, NOW())';
                
                db.query(queryInsert, [nombre, email, randomPassword, fecha_nacimiento], (err, result) => {
                    if (err) return res.status(500).json({ error: 'Error al registrar usuario de Google' });

                    const idNuevoUsuario = result.insertId;
                    const jwtToken = jwt.sign({ id: idNuevoUsuario, nombre: nombre }, JWT_SECRET, { expiresIn: '24h' });
                    res.json({ mensaje: 'Registro y login de Google exitoso', token: jwtToken, nombre: nombre, fecha_nacimiento: fecha_nacimiento });
                });
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Token de Google invalido o expirado' });
    }
});

// --- INICIO DE SESIÓN CON GITHUB (Paso 1) ---
// Intercambiamos el código que nos da GitHub por los datos del usuario
router.post('/github', async (req, res) => {
    const { code } = req.body;

    try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code: code })
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) return res.status(400).json({ error: 'Código de autorización de GitHub inválido' });

        // Con el permiso de GitHub, pedimos el perfil y el correo principal del usuario
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userData = await userResponse.json();

        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const emailData = await emailResponse.json();
        const primaryEmailObj = emailData.find(e => e.primary) || emailData[0];
        
        const email = primaryEmailObj.email;
        const nombre = userData.name || userData.login;

        db.query(`SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE email = ?`, [email], async (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });

            if (resultados.length > 0) {
                const usuario = resultados[0];
                const jwtToken = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ mensaje: 'Login de GitHub exitoso', token: jwtToken, nombre: usuario.nombre, fecha_nacimiento: usuario.fecha_nac_limpia });
            } else {
                // Si es nuevo, creamos una llave temporal corta y le pedimos la fecha de nacimiento en la pantalla
                const tempToken = jwt.sign({ email, nombre, provider: 'github' }, JWT_SECRET, { expiresIn: '15m' });
                return res.status(206).json({ 
                    mensaje: 'Se requiere fecha de nacimiento', 
                    requiereFecha: true, 
                    tempToken: tempToken, 
                    nombre: nombre,
                    provider: 'github'
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno conectando con GitHub' });
    }
});

// --- INICIO DE SESIÓN CON GITHUB (Paso 2) ---
// Finaliza el registro guardando la fecha de nacimiento que faltaba
router.post('/github-complete', async (req, res) => {
    const { tempToken, fecha_nacimiento } = req.body;

    try {
        // Comprobamos que la llave temporal sea válida y siga activa
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (decoded.provider !== 'github') throw new Error('Proveedor inválido');
        
        const { email, nombre } = decoded;
        const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);

        const queryInsert = 'INSERT INTO usuarios (nombre, email, password, fecha_nacimiento, fecha_creacion) VALUES (?, ?, ?, ?, NOW())';
        db.query(queryInsert, [nombre, email, randomPassword, fecha_nacimiento], (err, result) => {
            if (err) return res.status(500).json({ error: 'Error al registrar usuario de GitHub' });

            const idNuevoUsuario = result.insertId;
            const jwtToken = jwt.sign({ id: idNuevoUsuario, nombre: nombre }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ mensaje: 'Registro y login de GitHub exitoso', token: jwtToken, nombre: nombre, fecha_nacimiento: fecha_nacimiento });
        });
    } catch (error) {
        res.status(401).json({ error: 'Sesión caducada. Vuelve a iniciar sesión con GitHub.' });
    }
});

// --- CAMBIO DE CONTRASEÑA ---
router.put('/cambiar-password', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso denegado. No hay token.' });

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        const usuarioId = verificado.id;
        const { passwordActual, nuevaPassword } = req.body;

        db.query('SELECT * FROM usuarios WHERE id = ?', [usuarioId], async (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

            const usuario = resultados[0];

            // Comprobamos que recuerde su contraseña antigua antes de dejarle poner una nueva
            const passCorrecta = await bcrypt.compare(passwordActual, usuario.password);
            if (!passCorrecta) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

            const salt = await bcrypt.genSalt(10);
            const nuevaPasswordHasheada = await bcrypt.hash(nuevaPassword, salt);

            db.query('UPDATE usuarios SET password = ? WHERE id = ?', [nuevaPasswordHasheada, usuarioId], (err, resultado) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar contraseña' });
                res.json({ mensaje: 'Contraseña actualizada con éxito' });
            });
        });

    } catch (error) {
        res.status(401).json({ error: 'Token inválido o caducado' });
    }
});

// --- VER DATOS DEL PERFIL ---
router.get('/perfil', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        
        db.query(`SELECT nombre, email, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE id = ?`, [verificado.id], (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
            res.json(resultados[0]);
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// --- MODIFICAR DATOS DEL PERFIL ---
router.put('/perfil', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        const usuarioId = verificado.id;
        const { nombre, email, fecha_nacimiento } = req.body;

        // Primero nos aseguramos de que no esté intentando ponerse el correo de otro usuario
        db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, usuarioId], (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (resultados.length > 0) return res.status(400).json({ error: 'Ese email ya está registrado en otra cuenta' });

            const queryUpdate = 'UPDATE usuarios SET nombre = ?, email = ?, fecha_nacimiento = ? WHERE id = ?';
            db.query(queryUpdate, [nombre, email, fecha_nacimiento, usuarioId], (err, resultado) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar el perfil' });

                // Como ha cambiado de datos, le damos una llave nueva actualizada
                const nuevoToken = jwt.sign({ id: usuarioId, nombre: nombre }, JWT_SECRET, { expiresIn: '24h' });
                
                res.json({ mensaje: 'Perfil actualizado', token: nuevoToken, nombre, fecha_nacimiento });
            });
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;