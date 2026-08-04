/*********************************************************************************
Archivo principal del servidor (index.js).
Aquí se configura el servidor Express y se definen las rutas principales 
de la aplicación. Conecta la base de datos, maneja el acceso de los 
usuarios mediante tokens y gestiona las tareas (crear, leer, actualizar, borrar).
También incluye las funciones de Inteligencia Artificial (Gemini y ElevenLabs) 
y la conexión con la API externa de festivos.
***********************************************************************************/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Importamos nuestros propios módulos de la base de datos y las rutas
const db = require('./db');
const authRoutes = require('./routes/auth');
const gruposRoutes = require('./routes/grupos');

// Iniciamos la aplicación y configuramos los permisos
const app = express();
app.use(cors());
app.use(express.json()); 

// Asignamos las rutas separadas para el Login, Registro y Grupos
app.use('/api', authRoutes);
app.use('/api/grupos', gruposRoutes);

// Contraseña secreta para comprobar las sesiones de los usuarios
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_para_el_tfg';

// Inicializamos la IA de Google Gemini usando la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AQ.Ab8RN6IVqrTFV7rcSUIS4RhZqMdySH66HV6BZsFcLmjWu1ZXnA");

// Función de seguridad para comprobar que el usuario tiene un token válido
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'Acceso denegado. No hay token.' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido o expirado' });
        req.usuario = decoded; 
        next();
    });
};

// ==========================================
// RUTAS DE TAREAS (CRUD) - VERSIÓN MULTI-EMPRESA
// ==========================================

// 1. OBTENER TAREAS
app.get('/api/tareas', verificarToken, (req, res) => {
    const userId = req.usuario.id;
    // Pedimos a la base de datos:
    // - Mis tareas personales (sin grupo)
    // - Las tareas de empresa que me han asignado a mí
    // - Todas las tareas de la empresa si soy el jefe
    const query = `
        SELECT t.*, g.nombre AS nombre_grupo 
        FROM tareas t
        LEFT JOIN grupos g ON t.grupo_id = g.id
        WHERE (t.grupo_id IS NULL AND t.usuario_id = ?)
           OR t.asignado_a = ?
           OR t.grupo_id IN (SELECT grupo_id FROM grupo_usuarios WHERE usuario_id = ? AND rol = 'jefe')
    `;
    db.query(query, [userId, userId, userId], (err, resultados) => {
            if (err) {
                console.error("DETALLE DEL ERROR SQL:", err);
                return res.status(500).json({ error: 'Error al obtener las tareas' });
            }
            res.json(resultados);
        });
});

// 2. CREAR TAREA
app.post('/api/tareas', verificarToken, (req, res) => {
    const { titulo, descripcion, fecha_vencimiento, fecha_notificacion, repeticion, grupo_id, asignado_a } = req.body;

    // LIMPIEZA DE DATOS (Backend a prueba de bombas)
    const vencimientoFinal = (fecha_vencimiento && fecha_vencimiento !== 'T00:00' && fecha_vencimiento !== '') ? fecha_vencimiento : null;
    const notificacionFinal = (fecha_notificacion && fecha_notificacion !== '') ? fecha_notificacion : null;
    const repeticionFinal = repeticion ? repeticion : 'ninguna';

    // Guardamos si la tarea pertenece a un grupo o es personal
    const grupoFinal = grupo_id ? grupo_id : null;
    // Si no se la asignamos a nadie en concreto, se la asigna al usuario que la crea
    const asignadoFinal = asignado_a ? asignado_a : req.usuario.id;

    // LA SOLUCIÓN: Usamos un interrogante (?) para el estado 'Por Hacer' y evitamos el fallo de las comillas
    const query = 'INSERT INTO tareas (titulo, descripcion, fecha_vencimiento, estado, fecha_notificacion, repeticion, usuario_id, grupo_id, asignado_a) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

    // Metemos el texto 'Por Hacer' directamente en la lista de variables a enviar
    db.query(query, [titulo, descripcion, vencimientoFinal, 'Por Hacer', notificacionFinal, repeticionFinal, req.usuario.id, grupoFinal, asignadoFinal], (err, resultado) => {
        if (err) {
            console.error(">>> ERROR SQL AL CREAR TAREA:", err);
            return res.status(500).json({ error: 'Error al crear la tarea' });
        }
        res.json({ mensaje: 'Tarea creada correctamente', id: resultado.insertId });
    });
});

// 3. ACTUALIZAR TAREA (Controlando quién puede editar)
app.put('/api/tareas/:id', verificarToken, (req, res) => {
    const idTarea = req.params.id;
    const userId = req.usuario.id;
    const { titulo, descripcion, fecha_vencimiento, estado, fecha_notificacion, repeticion } = req.body;

    // Primero buscamos la tarea y el rol del usuario para saber si tiene permisos
    db.query('SELECT t.*, gu.rol FROM tareas t LEFT JOIN grupo_usuarios gu ON t.grupo_id = gu.grupo_id AND gu.usuario_id = ? WHERE t.id = ?', [userId, idTarea], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

        const tarea = results[0];
        const esPersonal = tarea.grupo_id === null;
        const soyJefe = tarea.rol === 'jefe';
        const soyAsignado = tarea.asignado_a === userId;

        // Si están editando el texto o las fechas de la tarea:
        if (titulo) {
            // Solo el creador (si es personal) o el jefe (si es empresa) puede editar los detalles
            if (!esPersonal && !soyJefe) {
                return res.status(403).json({ error: 'Solo el jefe de la empresa puede modificar los detalles de esta tarea' });
            }

            const notificacionFinal = fecha_notificacion ? fecha_notificacion : null;
            const repeticionFinal = repeticion ? repeticion : 'ninguna';

            const query = 'UPDATE tareas SET titulo = ?, descripcion = ?, fecha_vencimiento = ?, fecha_notificacion = ?, repeticion = ? WHERE id = ?';
            db.query(query, [titulo, descripcion, fecha_vencimiento, notificacionFinal, repeticionFinal, idTarea], (err, resultado) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar la tarea' });
                return res.json({ mensaje: 'Tarea actualizada correctamente' });
            });
        }
        // Si solo están moviendo la tarea de columna (cambio de estado):
        else if (estado) {
            // Pueden moverla si es personal, si son los jefes o si es su tarea asignada
            if (!esPersonal && !soyJefe && !soyAsignado) {
                return res.status(403).json({ error: 'No tienes permiso para cambiar el estado de esta tarea' });
            }

            const query = 'UPDATE tareas SET estado = ? WHERE id = ?';
            db.query(query, [estado, idTarea], (err, resultado) => {
                if (err) return res.status(500).json({ error: 'Error al actualizar el estado' });
                return res.json({ mensaje: 'Estado actualizado correctamente' });
            });
        }
    });
});

// 4. BORRAR TAREA (Alta seguridad)
app.delete('/api/tareas/:id', verificarToken, (req, res) => {
    const idTarea = req.params.id;
    const userId = req.usuario.id;

    // Comprobamos quién intenta borrar la tarea
    db.query('SELECT t.*, gu.rol FROM tareas t LEFT JOIN grupo_usuarios gu ON t.grupo_id = gu.grupo_id AND gu.usuario_id = ? WHERE t.id = ?', [userId, idTarea], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

        const tarea = results[0];
        const esPersonal = tarea.grupo_id === null;
        const soyJefe = tarea.rol === 'jefe';

        // Regla estricta: Los empleados normales no pueden borrar tareas
        if (!esPersonal && !soyJefe) {
            return res.status(403).json({ error: 'Solo el jefe de la empresa puede borrar tareas del equipo' });
        }

        const query = 'DELETE FROM tareas WHERE id = ?';
        db.query(query, [idTarea], (err, resultado) => {
            if (err) return res.status(500).json({ error: 'Error al eliminar la tarea' });
            res.json({ mensaje: 'Tarea eliminada correctamente' });
        });
    });
});

// ==========================================
// GEMINI CON RESPALDO DE MODELOS
// ==========================================

// Función para llamar a Gemini intentando usar varios modelos por si alguno falla
async function generarConFallback(prompt) {
    const geminiApiKey = process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim();

    const modelos = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
        "gemini-flash-latest"
    ];

    for (const modelo of modelos) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

            const respuesta = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': geminiApiKey 
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const textoCrudo = await respuesta.text();

            try {
                const datos = JSON.parse(textoCrudo);

                if (respuesta.ok) {
                    console.log("Inferencia LLM resuelta usando: " + modelo);
                    return datos.candidates[0].content.parts[0].text;
                }

                console.warn("Alerta en modelo " + modelo + ":", datos.error);
            } catch (jsonError) {
                console.error("Error al leer la respuesta en " + modelo + ":", textoCrudo.substring(0, 200));
            }

        } catch (error) {
            console.error("Fallo de red conectando con " + modelo + ":", error.message);
        }
    }

    throw new Error("Todos los modelos Gemini están temporalmente inactivos.");
}

// ==========================================
// RUTA PARA EXTRAER Y ACTUALIZAR TAREAS POR VOZ
// ==========================================
app.post('/api/extraer-tarea', verificarToken, async (req, res) => {
    try {
        const { texto, estadoActual } = req.body;
        
        // Preparamos la fecha de hoy para que la IA sepa qué día es
        const hoy = new Date();
        const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fechaContexto = hoy.toLocaleDateString('es-ES', opcionesFecha);
        const fechaIsoStr = hoy.toISOString().split('T')[0];

        const prompt = `
        Actúa como un sistema estricto de extracción de datos. El usuario está dictando datos para una tarea.
        Hoy es ${fechaContexto} (Formato ISO: ${fechaIsoStr}).

        ESTADO ACTUAL DEL FORMULARIO:
        ${JSON.stringify(estadoActual)}

        INSTRUCCIÓN DE VOZ: "${texto}"

        REGLAS:
        1. Fusiona la instrucción con el ESTADO ACTUAL. Sobrescribe si hay cambios, mantén lo demás intacto.
        2. Calcula las fechas relativas (ej. "mañana", "el próximo martes") basándote en la fecha de hoy.
        3. Si la voz pide algo fuera de las opciones permitidas, déjalo vacío o elige la más cercana.
        
        PLANTILLA DE SALIDA ESTRICTA (Debes devolver SOLO este objeto JSON, sin texto antes ni después):
        {
          "titulo": "string",
          "descripcion": "string",
          "fecha": "YYYY-MM-DD o vacío",
          "hora": "HH:MM o vacío",
          "opcionAviso": "hoy|manana|semana o vacío",
          "repeticion": "ninguna|diaria|semanal|mensual|anual"
        }
        `;

        const textoGenerado = await generarConFallback(prompt);

        // Buscamos el inicio y fin del objeto JSON para evitar textos extraños de la IA
        const match = textoGenerado.match(/\{[\s\S]*\}/);
        
        if (!match) {
            throw new Error("El modelo no devolvió un formato JSON válido.");
        }

        const datosExtraidos = JSON.parse(match[0]);
        res.json(datosExtraidos);
        
    } catch (error) {
        console.error("Error extrayendo datos de la tarea por voz:", error);
        res.status(500).json({ error: "No se pudo procesar la instrucción de voz de forma segura." });
    }
});

// ==========================================
// RUTA DEL RESUMEN DIARIO (SOLO TEXTO CON GEMINI)
// ==========================================
app.post('/api/briefing', verificarToken, async (req, res) => {
    try {
        const { tareas, nombre } = req.body;

        const tareasLimpias = tareas.map(t => ({
            tarea: t.titulo,
            estado: t.estado,
            vence: t.fecha_vencimiento ? t.fecha_vencimiento.split('T')[0] : 'sin fecha límite'
        }));

        const fechaHoy = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date());

        const prompt = `
        Actúa exclusivamente como Kora, un asistente personal de voz muy humano y profesional.
        Tu objetivo es leer el resumen del día para el usuario llamado ${nombre}. Hoy es ${fechaHoy}.

        DATOS DEL USUARIO:
        -------------------
        ${JSON.stringify(tareasLimpias)}
        -------------------

        INSTRUCCIONES DE VOZ (ESTRICTAS):
        1. Escribe un único párrafo de 3 a 5 frases fluidas.
        2. Usa lenguaje natural, conversacional, cercano y tutéame SIEMPRE.
        3. PROHIBIDO usar asteriscos, markdown, viñetas, emojis o caracteres especiales.
        4. ESTRUCTURA OBLIGATORIA: Primero dime cuántas tareas tengo en total. Luego, nómbrame el título de al menos una tarea.
        5. CIERRE OBLIGATORIO: Termina siempre deseándome un excelente día de trabajo.
        `;

        const textoGenerado = await generarConFallback(prompt);
        console.log("Guion generado por Gemini:", textoGenerado);

        // Devolvemos el texto a React, y React se encarga del audio
        res.json({ texto: textoGenerado });

    } catch (error) {
        console.error("Fallo general en la creación del guion:", error);
        res.status(500).json({ error: "Error interno del servidor al generar el guion." });
    }
});


// ==========================================
// RUTA DE FESTIVOS EXTERNOS
// ==========================================
app.get('/api/festivos', async (req, res) => {
    try {
        const anioActual = new Date().getFullYear();
        const apiKey = process.env.CALENDARIFIC_API_KEY;
        const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=ES&year=${anioActual}`;

        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (datos.meta.code === 200) {
            // Traducimos los nombres de los festivos al español y filtramos los que nos interesan
            const traducciones = {
                "New Year's Day": "Año Nuevo", "Epiphany": "Día de Reyes", "Valentine's Day": "San Valentín", "Carnival Monday": "Lunes de Carnaval", "Carnival Tuesday": "Martes de Carnaval", "Ash Wednesday": "Miércoles de Ceniza", "Father's Day": "Día del Padre", "San Jose": "Día del Padre", "Daylight Saving Time starts": "Cambio horario de verano", "Maundy Thursday": "Jueves Santo", "Good Friday": "Viernes Santo", "Holy Saturday": "Sábado Santo", "Easter Sunday": "Domingo Santo", "Easter Monday": "Lunes de Pascua", "Labor Day": "Día del Trabajador", "Mother's Day": "Día de la Madre", "Corpus Christi": "Corpus Christi", "Daylight Saving Time ends": "Cambio horario de invierno", "Assumption of Mary": "Asunción de la Virgen", "Hispanic Day": "Día de la Hispanidad", "All Saints' Day": "Día de Todos los Santos", "Constitution Day": "Constitución Española", "Immaculate Conception": "La Inmaculada Concepción", "Christmas Eve": "Nochebuena", "Christmas Day": "Navidad", "New Year's Eve": "Nochevieja"
            };
            const festivosQueMeInteresan = ["Año Nuevo", "Día de Reyes", "San Valentín", "Lunes de Carnaval", "Martes de Carnaval", "Miércoles de Ceniza", "Día del Padre", "Cambio horario de verano", "Jueves Santo", "Viernes Santo", "Sábado Santo", "Domingo Santo", "Lunes de Pascua", "Día del Trabajador", "Día de la Madre", "Corpus Christi", "Cambio horario de invierno", "Asunción de la Virgen", "Día de la Hispanidad", "Día de Todos los Santos", "Constitución Española", "La Inmaculada Concepción", "Nochebuena", "Navidad", "Nochevieja"];

            const festivosProcesados = datos.response.holidays.map(festivo => ({ ...festivo, name: traducciones[festivo.name] || festivo.name })).filter(festivo => festivosQueMeInteresan.includes(festivo.name));

            // Filtramos para asegurarnos de que no haya festivos repetidos
            const festivosSinDuplicados = [];
            const nombresVistos = new Set();
            for (const festivo of festivosProcesados) {
                if (!nombresVistos.has(festivo.name)) {
                    nombresVistos.add(festivo.name);
                    festivosSinDuplicados.push(festivo);
                }
            }
            res.json(festivosSinDuplicados);
        } else { res.status(500).json({ error: 'Error en la API de Calendarific' }); }
    } catch (error) { res.status(500).json({ error: 'Error interno conectando con API externa' }); }
});

// ==========================================
// RUTAS DE COMENTARIOS
// ==========================================

// 1. Obtener comentarios de una tarea específica
app.get('/api/tareas/:id/comentarios', verificarToken, (req, res) => {
    const tareaId = req.params.id;
    const query = `
        SELECT c.*, u.nombre AS autor 
        FROM comentarios c 
        JOIN usuarios u ON c.usuario_id = u.id 
        WHERE c.tarea_id = ? 
        ORDER BY c.fecha_creacion ASC
    `;
    db.query(query, [tareaId], (err, resultados) => {
        if (err) return res.status(500).json({ error: 'Error al obtener comentarios' });
        res.json(resultados);
    });
});

// 2. Publicar un nuevo comentario
app.post('/api/tareas/:id/comentarios', verificarToken, (req, res) => {
    const tareaId = req.params.id;
    const { texto } = req.body;
    const usuarioId = req.usuario.id;

    // Comprobamos que el comentario no esté vacío
    if (!texto || texto.trim() === '') return res.status(400).json({ error: 'El comentario no puede estar vacío' });

    const query = 'INSERT INTO comentarios (tarea_id, usuario_id, texto) VALUES (?, ?, ?)';
    db.query(query, [tareaId, usuarioId, texto], (err, resultado) => {
        if (err) return res.status(500).json({ error: 'Error al guardar el comentario' });
        res.json({ mensaje: 'Comentario añadido', id: resultado.insertId });
    });
});

// 3. Editar un comentario propio
app.put('/api/comentarios/:id', verificarToken, (req, res) => {
    const comentarioId = req.params.id;
    const { texto } = req.body;
    const usuarioId = req.usuario.id;

    if (!texto || texto.trim() === '') return res.status(400).json({ error: 'El comentario no puede estar vacío' });

    // Comprobamos primero si el comentario pertenece a este usuario
    db.query('SELECT usuario_id FROM comentarios WHERE id = ?', [comentarioId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Comentario no encontrado' });

        if (results[0].usuario_id !== usuarioId) {
            return res.status(403).json({ error: 'Solo puedes editar tus propios comentarios' });
        }

        db.query('UPDATE comentarios SET texto = ? WHERE id = ?', [texto, comentarioId], (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar el comentario' });
            res.json({ mensaje: 'Comentario actualizado correctamente' });
        });
    });
});

// ==========================================
// RUTAS DE VACACIONES Y AUSENCIAS
// ==========================================

// 1. Registrar una vacación
app.post('/api/vacaciones', verificarToken, (req, res) => {
    const { grupo_id, fecha_inicio, fecha_fin } = req.body;
    const usuario_id = req.usuario.id;

    if (!grupo_id || !fecha_inicio || !fecha_fin) return res.status(400).json({ error: 'Faltan datos' });

    db.query('INSERT INTO vacaciones (usuario_id, grupo_id, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)', [usuario_id, grupo_id, fecha_inicio, fecha_fin], (err) => {
        if (err) return res.status(500).json({ error: 'Error al registrar vacaciones' });
        res.json({ mensaje: 'Ausencia registrada correctamente' });
    });
});

// 2. Obtener vacaciones de mi equipo
app.get('/api/vacaciones', verificarToken, (req, res) => {
    const usuario_id = req.usuario.id;
    // Traemos las vacaciones de cualquier miembro que comparta grupo conmigo
    const query = `
        SELECT v.id, v.fecha_inicio, v.fecha_fin, u.nombre AS usuario_nombre, g.nombre AS grupo_nombre
        FROM vacaciones v
        JOIN usuarios u ON v.usuario_id = u.id
        JOIN grupos g ON v.grupo_id = g.id
        WHERE v.grupo_id IN (SELECT grupo_id FROM grupo_usuarios WHERE usuario_id = ?)
    `;
    db.query(query, [usuario_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener vacaciones' });
        res.json(results);
    });
});

// 3. Eliminar una vacación propia
app.delete('/api/vacaciones/:id', verificarToken, (req, res) => {
    const vacacionId = req.params.id;
    const usuarioId = req.usuario.id;

    // Verificamos que la vacación exista y pertenezca al usuario
    db.query('SELECT usuario_id FROM vacaciones WHERE id = ?', [vacacionId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Vacación no encontrada' });

        if (results[0].usuario_id !== usuarioId) {
            return res.status(403).json({ error: 'Solo puedes eliminar tus propias vacaciones' });
        }

        db.query('DELETE FROM vacaciones WHERE id = ?', [vacacionId], (err) => {
            if (err) return res.status(500).json({ error: 'Error al eliminar la vacación' });
            res.json({ mensaje: 'Vacación eliminada correctamente' });
        });
    });
});

// Arrancamos el servidor en el puerto configurado
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor del backend corriendo en el puerto ${PORT}`);
});