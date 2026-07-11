const express = require('express');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { OAuth2Client } = require('google-auth-library'); 
const db = require('../db'); 

const router = express.Router(); 
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_para_el_tfg';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '374057828390-89sst7497o9mu099of83n5oluabu5rvp.apps.googleusercontent.com'; 

// ===================================================================
// IMPORTANTE: PON AQUÍ TUS CLAVES DE GITHUB 
// ===================================================================
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23liHuJKItfZMT9Qks';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '12a2c323743e5c3e2649fab305b6f369de1ae0e9';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/registro', async (req, res) => {
    const { nombre, email, password, fecha_nacimiento } = req.body;
    
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHasheada = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO usuarios (nombre, email, password, fecha_nacimiento, fecha_creacion) VALUES (?, ?, ?, ?, NOW())';
        db.query(query, [nombre, email, passwordHasheada, fecha_nacimiento], (err, resultado) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El email ya esta registrado' });
                return res.status(500).json({ error: 'Error al registrar usuario' });
            }
            res.json({ mensaje: 'Usuario registrado con exito' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // ARREGLO: Uso de backticks (`) y comillas simples (') para la fecha
    db.query(`SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE email = ?`, [email], async (err, resultados) => {
        if (err) {
            console.error("🕵️‍♂️ ERROR SQL EN LOGIN:", err);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        if (resultados.length === 0) {
            console.log(`🕵️‍♂️ FALLO LOGIN: El email ${email} no existe en la BD`);
            return res.status(401).json({ error: 'Email o contrasena incorrectos' });
        }

        const usuario = resultados[0];
        
        const passCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passCorrecta) {
            console.log(`🕵️‍♂️ FALLO LOGIN: Contraseña incorrecta para ${email}.`);
            return res.status(401).json({ error: 'Email o contrasena incorrectos' });
        }

        const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
        
        console.log(`✅ LOGIN EXITOSO: Bienvenido ${usuario.nombre}`);
        res.json({ 
            mensaje: 'Login exitoso', 
            token, 
            nombre: usuario.nombre,
            fecha_nacimiento: usuario.fecha_nac_limpia 
        });
    });
});

// --- RUTA DE GOOGLE ---
router.post('/google', async (req, res) => {
    const { token, fecha_nacimiento } = req.body;

    try {
        const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload.email;
        const nombre = payload.name;

        // ARREGLO: Uso de backticks (`) y comillas simples (')
        db.query(`SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE email = ?`, [email], async (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });

            if (resultados.length > 0) {
                const usuario = resultados[0];
                const jwtToken = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ mensaje: 'Login de Google exitoso', token: jwtToken, nombre: usuario.nombre, fecha_nacimiento: usuario.fecha_nac_limpia });
            } else {
                if (!fecha_nacimiento) {
                    return res.status(206).json({ mensaje: 'Se requiere fecha de nacimiento', requiereFecha: true, email: email, nombre: nombre });
                }

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

// --- RUTA 1 DE GITHUB (Intercambio de código) ---
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

        // ARREGLO: Uso de backticks (`) y comillas simples (')
        db.query(`SELECT *, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE email = ?`, [email], async (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });

            if (resultados.length > 0) {
                const usuario = resultados[0];
                const jwtToken = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ mensaje: 'Login de GitHub exitoso', token: jwtToken, nombre: usuario.nombre, fecha_nacimiento: usuario.fecha_nac_limpia });
            } else {
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

// --- RUTA 2 DE GITHUB (Completar Registro con Fecha) ---
router.post('/github-complete', async (req, res) => {
    const { tempToken, fecha_nacimiento } = req.body;

    try {
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

// --- RUTA PARA CAMBIAR CONTRASEÑA ---
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

// --- OBTENER DATOS DEL PERFIL ---
router.get('/perfil', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        
        // ARREGLO: Uso de backticks (`) y comillas simples (')
        db.query(`SELECT nombre, email, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nac_limpia FROM usuarios WHERE id = ?`, [verificado.id], (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (resultados.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
            res.json(resultados[0]);
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

// --- ACTUALIZAR DATOS DEL PERFIL ---
router.put('/perfil', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        const usuarioId = verificado.id;
        const { nombre, email, fecha_nacimiento } = req.body;

        db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, usuarioId], (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });
            if (resultados.length > 0) return res.status(400).json({ error: 'Ese email ya está registrado en otra cuenta' });

            const queryUpdate = 'UPDATE usuarios SET nombre = ?, email = ?, fecha_nacimiento = ? WHERE id = ?';
            db.query(queryUpdate, [nombre, email, fecha_nacimiento, usuarioId], (err, resultado) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar el perfil' });

                const nuevoToken = jwt.sign({ id: usuarioId, nombre: nombre }, JWT_SECRET, { expiresIn: '24h' });
                
                res.json({ mensaje: 'Perfil actualizado', token: nuevoToken, nombre, fecha_nacimiento });
            });
        });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});
module.exports = router;