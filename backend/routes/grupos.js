const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Asegúrate de que la ruta a tu base de datos es correcta

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_para_el_tfg';

// --- MIDDLEWARE: Función auxiliar para verificar quién es el usuario ---
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// --- 1. CREAR UN GRUPO (Empresa) ---
router.post('/', verificarToken, (req, res) => {
    const { nombre } = req.body;
    // Generamos un código de invitación aleatorio de 6 letras/números
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const creadorId = req.user.id;

    db.query('INSERT INTO grupos (nombre, codigo_invitacion, creador_id) VALUES (?, ?, ?)', [nombre, codigo, creadorId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear la empresa/grupo' });
        
        const grupoId = result.insertId;

        // Añadimos automáticamente al creador a la tabla intermedia como "jefe"
        db.query('INSERT INTO grupo_usuarios (grupo_id, usuario_id, rol) VALUES (?, ?, "jefe")', [grupoId, creadorId], (err) => {
            if (err) return res.status(500).json({ error: 'Error al asignar permisos de jefe' });
            res.json({ mensaje: 'Grupo creado con éxito', grupoId, codigo });
        });
    });
});

// --- 2. UNIRSE A UN GRUPO CON CÓDIGO ---
router.post('/unirse', verificarToken, (req, res) => {
    const { codigo } = req.body;
    const usuarioId = req.user.id;

    // Buscamos si existe un grupo con ese código
    db.query('SELECT id, nombre FROM grupos WHERE codigo_invitacion = ?', [codigo], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Código de invitación inválido o no existe' });
        
        const grupoId = results[0].id;
        const nombreGrupo = results[0].nombre;

        // Intentamos meter al usuario como empleado
        db.query('INSERT INTO grupo_usuarios (grupo_id, usuario_id, rol) VALUES (?, ?, "empleado")', [grupoId, usuarioId], (err) => {
            if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya perteneces a esta empresa' });
            if (err) return res.status(500).json({ error: 'Error al unirse al grupo' });
            
            res.json({ mensaje: `Te has unido a ${nombreGrupo} con éxito`, grupoId });
        });
    });
});

// --- 3. OBTENER TODOS MIS GRUPOS ---
router.get('/', verificarToken, (req, res) => {
    const query = `
        SELECT g.id, g.nombre, g.codigo_invitacion, gu.rol 
        FROM grupos g 
        JOIN grupo_usuarios gu ON g.id = gu.grupo_id 
        WHERE gu.usuario_id = ?
    `;
    db.query(query, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener tus grupos' });
        res.json(results);
    });
});

// --- 4. OBTENER MIEMBROS DE UN GRUPO (Para que el jefe pueda asignar tareas) ---
router.get('/:id/miembros', verificarToken, (req, res) => {
    const grupoId = req.params.id;
    
    // Primero comprobamos que el usuario que pide la lista pertenece al grupo
    db.query('SELECT * FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, req.user.id], (err, results) => {
        if (err || results.length === 0) return res.status(403).json({ error: 'No tienes permiso para ver esta empresa' });

        const queryMiembros = `
            SELECT u.id, u.nombre, u.email, gu.rol 
            FROM usuarios u 
            JOIN grupo_usuarios gu ON u.id = gu.usuario_id 
            WHERE gu.grupo_id = ?
        `;
        db.query(queryMiembros, [grupoId], (err, miembros) => {
            if (err) return res.status(500).json({ error: 'Error al obtener miembros' });
            res.json(miembros);
        });
    });
});

module.exports = router;