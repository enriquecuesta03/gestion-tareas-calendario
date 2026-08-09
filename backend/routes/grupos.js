/*********************************************************************************
Archivo de rutas para los grupos y empresas (grupos.js).
Aquí se maneja todo lo relacionado con las empresas: crear un grupo nuevo, 
generar códigos de invitación para los trabajadores, unirse a una empresa 
existente, ver la lista de miembros y gestionar la administración del equipo
(eliminar empresa, expulsar miembros, ascender a jefe y salir del equipo).
***********************************************************************************/

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db'); 

const router = express.Router();
// Contraseña secreta para comprobar las sesiones de los usuarios
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_para_el_tfg';

// Función de seguridad: Comprueba si el usuario tiene la sesión iniciada antes de dejarle pasar
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

// 1. CREAR UNA EMPRESA O GRUPO NUEVO
router.post('/', verificarToken, (req, res) => {
    const { nombre } = req.body;
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const creadorId = req.user.id;

    db.query('INSERT INTO grupos (nombre, codigo_invitacion, creador_id) VALUES (?, ?, ?)', [nombre, codigo, creadorId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear la empresa/grupo' });
        
        const grupoId = result.insertId;

        // CORRECCIÓN: Usamos ? y pasamos 'jefe' como variable en el array para evitar fallos de sintaxis SQL
        db.query('INSERT INTO grupo_usuarios (grupo_id, usuario_id, rol) VALUES (?, ?, ?)', [grupoId, creadorId, 'jefe'], (err) => {
            if (err) return res.status(500).json({ error: 'Error al asignar permisos de jefe' });
            res.json({ mensaje: 'Grupo creado con éxito', grupoId, codigo });
        });
    });
});

// 2. UNIRSE A UNA EMPRESA USANDO UN CÓDIGO
router.post('/unirse', verificarToken, (req, res) => {
    const { codigo } = req.body;
    const usuarioId = req.user.id;

    db.query('SELECT id, nombre FROM grupos WHERE codigo_invitacion = ?', [codigo], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Código de invitación inválido o no existe' });
        
        const grupoId = results[0].id;
        const nombreGrupo = results[0].nombre;

        // CORRECCIÓN: Usamos ? y pasamos 'empleado' como variable en el array
        db.query('INSERT INTO grupo_usuarios (grupo_id, usuario_id, rol) VALUES (?, ?, ?)', [grupoId, usuarioId, 'empleado'], (err) => {
            if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya perteneces a esta empresa' });
            if (err) return res.status(500).json({ error: 'Error al unirse al grupo' });
            
            res.json({ mensaje: `Te has unido a ${nombreGrupo} con éxito`, grupoId });
        });
    });
});

// 3. VER LA LISTA DE MIS GRUPOS O EMPRESAS
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

// 4. VER LOS TRABAJADORES DE UNA EMPRESA (Para asignarles tareas)
router.get('/:id/miembros', verificarToken, (req, res) => {
    const grupoId = req.params.id;
    
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

// ==========================================
// NUEVAS RUTAS DE ADMINISTRACIÓN
// ==========================================

// 5. ELIMINAR EL GRUPO ENTERO (Solo Jefe)
router.delete('/:id', verificarToken, (req, res) => {
    const grupoId = req.params.id;
    const usuarioId = req.user.id;

    db.query('SELECT rol FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, usuarioId], (err, results) => {
        if (err || results.length === 0 || results[0].rol !== 'jefe') {
            return res.status(403).json({ error: 'Solo el jefe puede eliminar la empresa' });
        }

        db.query('DELETE FROM grupos WHERE id = ?', [grupoId], (err) => {
            if (err) return res.status(500).json({ error: 'Error de SQL al eliminar el equipo' });
            res.json({ mensaje: 'Equipo eliminado con éxito' });
        });
    });
});

// 6. EXPULSAR A UN MIEMBRO (Solo Jefe)
router.delete('/:grupoId/miembros/:miembroId', verificarToken, (req, res) => {
    const { grupoId, miembroId } = req.params;
    const usuarioId = req.user.id;

    // Un jefe no puede expulsarse a sí mismo (para eso ya existe "salir del equipo")
    if (Number(miembroId) === usuarioId) {
        return res.status(400).json({ error: 'No puedes expulsarte a ti mismo. Usa la opción de salir del equipo.' });
    }

    db.query('SELECT rol FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, usuarioId], (err, results) => {
        if (err || results.length === 0 || results[0].rol !== 'jefe') {
            return res.status(403).json({ error: 'Solo un jefe puede expulsar miembros' });
        }

        db.query('DELETE FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, miembroId], (err) => {
            if (err) return res.status(500).json({ error: 'Error de SQL al expulsar al miembro' });
            res.json({ mensaje: 'Miembro expulsado del equipo' });
        });
    });
});

// 7. CAMBIAR ROL DE UN MIEMBRO (Solo Jefe)
router.put('/:grupoId/miembros/:miembroId/rol', verificarToken, (req, res) => {
    const { grupoId, miembroId } = req.params;
    const { rol } = req.body;
    const usuarioId = req.user.id;

    // El rol solo puede ser uno de estos dos valores; cualquier otra cosa se rechaza
    if (rol !== 'jefe' && rol !== 'empleado') {
        return res.status(400).json({ error: 'Rol no válido. Debe ser "jefe" o "empleado".' });
    }

    // Un jefe no puede cambiar su propio rol (evita que un equipo se quede sin ningún jefe)
    if (Number(miembroId) === usuarioId) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
    }

    db.query('SELECT rol FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, usuarioId], (err, results) => {
        if (err || results.length === 0 || results[0].rol !== 'jefe') {
            return res.status(403).json({ error: 'Solo un jefe puede modificar los roles de sus compañeros' });
        }

        db.query('UPDATE grupo_usuarios SET rol = ? WHERE grupo_id = ? AND usuario_id = ?', [rol, grupoId, miembroId], (err) => {
            if (err) return res.status(500).json({ error: 'Error de SQL al cambiar el rol' });
            res.json({ mensaje: 'El rol ha sido actualizado correctamente' });
        });
    });
});

// 8. SALIR VOLUNTARIAMENTE DEL EQUIPO
router.post('/:id/salir', verificarToken, (req, res) => {
    const grupoId = req.params.id;
    const usuarioId = req.user.id;

    db.query('DELETE FROM grupo_usuarios WHERE grupo_id = ? AND usuario_id = ?', [grupoId, usuarioId], (err) => {
        if (err) return res.status(500).json({ error: 'Error de SQL al salir del equipo' });
        res.json({ mensaje: 'Has abandonado el equipo' });
    });
});

module.exports = router;