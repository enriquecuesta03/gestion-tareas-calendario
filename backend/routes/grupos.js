/*********************************************************************************
Archivo de rutas para los grupos y empresas (grupos.js).
Aquí se maneja todo lo relacionado con las empresas: crear un grupo nuevo, 
generar códigos de invitación para los trabajadores, unirse a una empresa 
existente y ver la lista de miembros para poder asignarles tareas.
***********************************************************************************/

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Asegúrate de que la ruta a tu base de datos es correcta

const router = express.Router();
// Contraseña secreta para comprobar las sesiones de los usuarios
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_para_el_tfg';

// Función de seguridad: Comprueba si el usuario tiene la sesión iniciada antes de dejarle pasar
const verificarToken = (req, res, next) => {
    // Buscamos la "llave" (token) que nos manda el usuario
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    try {
        // Comprobamos que la llave es válida y guardamos los datos del usuario
        req.user = jwt.verify(token, JWT_SECRET);
        next(); // Le dejamos continuar con lo que quería hacer
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// 1. CREAR UNA EMPRESA O GRUPO NUEVO
router.post('/', verificarToken, (req, res) => {
    const { nombre } = req.body;
    // Generamos un código de invitación de 6 letras y números al azar
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const creadorId = req.user.id;

    // Guardamos el nuevo grupo en la base de datos
    db.query('INSERT INTO grupos (nombre, codigo_invitacion, creador_id) VALUES (?, ?, ?)', [nombre, codigo, creadorId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear la empresa/grupo' });
        
        // Obtenemos el número de identificación (ID) que se le ha dado al grupo
        const grupoId = result.insertId;

        // Añadimos automáticamente a la persona que lo ha creado como "jefe" del grupo
        db.query('INSERT INTO grupo_usuarios (grupo_id, usuario_id, rol) VALUES (?, ?, "jefe")', [grupoId, creadorId], (err) => {
            if (err) return res.status(500).json({ error: 'Error al asignar permisos de jefe' });
            res.json({ mensaje: 'Grupo creado con éxito', grupoId, codigo });
        });
    });
});

// 2. UNIRSE A UNA EMPRESA USANDO UN CÓDIGO
router.post('/unirse', verificarToken, (req, res) => {
    const { codigo } = req.body;
    const usuarioId = req.user.id;

    // Buscamos si existe alguna empresa con el código que nos han dado
    db.query('SELECT id, nombre FROM grupos WHERE codigo_invitacion = ?', [codigo], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Código de invitación inválido o no existe' });
        
        const grupoId = results[0].id;
        const nombreGrupo = results[0].nombre;

        // Intentamos meter al usuario como empleado normal en esa empresa
        db.query('INSERT INTO grupo_usuarios (grupo_id, usuario_id, rol) VALUES (?, ?, "empleado")', [grupoId, usuarioId], (err) => {
            // Si salta un error de duplicado, significa que el usuario ya estaba dentro
            if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya perteneces a esta empresa' });
            if (err) return res.status(500).json({ error: 'Error al unirse al grupo' });
            
            res.json({ mensaje: `Te has unido a ${nombreGrupo} con éxito`, grupoId });
        });
    });
});

// 3. VER LA LISTA DE MIS GRUPOS O EMPRESAS
router.get('/', verificarToken, (req, res) => {
    // Buscamos en qué empresas está metido el usuario actual y qué rol tiene en cada una
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

// 4. VER LOS TRABAJADORES DE UNA EMPRESA (Para asignarles tareas)
router.get('/:id/miembros', verificarToken, (req, res) => {
    const grupoId = req.params.id;
    
    // Primero nos aseguramos de que la persona que pregunta pertenece realmente a esa empresa
    db.query('SELECT * FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, req.user.id], (err, results) => {
        if (err || results.length === 0) return res.status(403).json({ error: 'No tienes permiso para ver esta empresa' });

        // Buscamos los datos básicos de todos los miembros del grupo
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