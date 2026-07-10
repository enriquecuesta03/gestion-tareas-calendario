require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Importamos nuestros propios módulos
const db = require('./db');
const authRoutes = require('./routes/auth');
const gruposRoutes = require('./routes/grupos');

const app = express();
app.use(cors());
app.use(express.json());

// Le decimos a Express que use las rutas separadas de Login y Registro
app.use('/api', authRoutes);
app.use('/api/grupos', gruposRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_para_el_tfg';

// Inicializamos la IA de Google Gemini usando la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AQ.Ab8RN6IVqrTFV7rcSUIS4RhZqMdySH66HV6BZsFcLmjWu1ZXnA");

// Middleware de seguridad para proteger las rutas de abajo
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
    const query = `
        SELECT t.*, g.nombre AS nombre_grupo 
        FROM tareas t
        LEFT JOIN grupos g ON t.grupo_id = g.id
        WHERE (t.grupo_id IS NULL AND t.usuario_id = ?)
           OR t.asignado_a = ?
           OR t.grupo_id IN (SELECT grupo_id FROM grupo_usuarios WHERE usuario_id = ? AND rol = 'jefe')
    `;
    db.query(query, [userId, userId, userId], (err, resultados) => {
        if (err) return res.status(500).json({ error: 'Error al obtener las tareas' });
        res.json(resultados);
    });
});

// 2. CREAR TAREA
app.post('/api/tareas', verificarToken, (req, res) => {
    const { titulo, descripcion, fecha_vencimiento, fecha_notificacion, repeticion, grupo_id, asignado_a } = req.body;

    const notificacionFinal = fecha_notificacion ? fecha_notificacion : null;
    const repeticionFinal = repeticion ? repeticion : 'ninguna';
    const grupoFinal = grupo_id ? grupo_id : null;
    const asignadoFinal = asignado_a ? asignado_a : req.usuario.id;

    const query = 'INSERT INTO tareas (titulo, descripcion, fecha_vencimiento, estado, fecha_notificacion, repeticion, usuario_id, grupo_id, asignado_a) VALUES (?, ?, ?, "Por Hacer", ?, ?, ?, ?, ?)';

    db.query(query, [titulo, descripcion, fecha_vencimiento, notificacionFinal, repeticionFinal, req.usuario.id, grupoFinal, asignadoFinal], (err, resultado) => {
        if (err) return res.status(500).json({ error: 'Error al crear la tarea' });
        res.json({ mensaje: 'Tarea creada correctamente', id: resultado.insertId });
    });
});

// 3. ACTUALIZAR TAREA (Permisos granulares)
app.put('/api/tareas/:id', verificarToken, (req, res) => {
    const idTarea = req.params.id;
    const userId = req.usuario.id;
    const { titulo, descripcion, fecha_vencimiento, estado, fecha_notificacion, repeticion } = req.body;

    db.query('SELECT t.*, gu.rol FROM tareas t LEFT JOIN grupo_usuarios gu ON t.grupo_id = gu.grupo_id AND gu.usuario_id = ? WHERE t.id = ?', [userId, idTarea], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

        const tarea = results[0];
        const esPersonal = tarea.grupo_id === null;
        const soyJefe = tarea.rol === 'jefe';
        const soyAsignado = tarea.asignado_a === userId;

        if (titulo) {
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
        else if (estado) {
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

    db.query('SELECT t.*, gu.rol FROM tareas t LEFT JOIN grupo_usuarios gu ON t.grupo_id = gu.grupo_id AND gu.usuario_id = ? WHERE t.id = ?', [userId, idTarea], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });

        const tarea = results[0];
        const esPersonal = tarea.grupo_id === null;
        const soyJefe = tarea.rol === 'jefe';

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
// GEMINI CON FALLBACK DE MODELOS (USANDO EL SDK OFICIAL)
// ==========================================

async function generarConFallback(prompt) {
    const modelos = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash"
    ];

    for (const modelo of modelos) {
        try {
            console.log(`Intentando conectar con ${modelo}...`);
            const model = genAI.getGenerativeModel({ model: modelo });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            console.log(`¡Gemini respondió usando ${modelo}!`);
            return response.text();

        } catch (error) {
            console.error(`Error con ${modelo}:`, error.message);
            
            // Si el error es de autenticación, cortamos de raíz
            if (error.message.includes("API_KEY_INVALID") || error.message.includes("key")) {
                throw new Error("LA API KEY DE GEMINI ES INVÁLIDA O NO SE ESTÁ LEYENDO CORRECTAMENTE.");
            }
        }
    }

    throw new Error(
        "Todos los modelos Gemini están temporalmente ocupados o la clave es errónea."
    );
}

// ==========================================
// RUTA PARA EXTRAER Y ACTUALIZAR TAREAS POR VOZ (NLP) BLINDADA
// ==========================================
app.post('/api/extraer-tarea', verificarToken, async (req, res) => {
    try {
        const { texto, estadoActual } = req.body;
        
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
// RUTA DEL DAILY BRIEFING (GEMINI + ELEVENLABS TTS)
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
        2. Usa lenguaje natural, conversacional, cercano y tutéame SIEMPRE (dirígete a mí de "tú", NUNCA de "usted").
        3. PROHIBIDO usar asteriscos, markdown, viñetas, guiones, emojis o caracteres especiales.
        4. ESTRUCTURA OBLIGATORIA: Primero dime cuántas tareas tengo en total. Luego, nómbrame el título de al menos una tarea para que sepa por dónde empezar a trabajar.
        5. CIERRE OBLIGATORIO: Termina siempre tu intervención deseándome de forma muy amable un excelente día de trabajo.
        6. PROHIBICIÓN ABSOLUTA: NO ofrezcas ayuda adicional, NO te ofrezcas a reorganizar la agenda, ni digas frases como "si lo necesitas puedo ayudarte". Limítate exclusivamente a dar los datos de las tareas y despedirte.
        `;

        const textoGenerado = await generarConFallback(prompt);
        console.log("Guion generado por Gemini:", textoGenerado);

        const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = "jcjw6BGYhh9x3PXYUqlu";
        const urlEleven = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
        
        const respuestaEleven = await fetch(urlEleven, {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textoGenerado,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!respuestaEleven.ok) {
            const errorText = await respuestaEleven.text();
            console.error("Error de ElevenLabs:", errorText);
            return res.status(500).json({ error: "ElevenLabs no pudo procesar la voz." });
        }

        const audioBuffer = await respuestaEleven.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error("Fallo crítico en el pipeline de IA:", error);
        res.status(500).json({ error: "Error interno del servidor." });
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
            const traducciones = {
                "New Year's Day": "Año Nuevo", "Epiphany": "Día de Reyes", "Valentine's Day": "San Valentín", "Carnival Monday": "Lunes de Carnaval", "Carnival Tuesday": "Martes de Carnaval", "Ash Wednesday": "Miércoles de Ceniza", "Father's Day": "Día del Padre", "San Jose": "Día del Padre", "Daylight Saving Time starts": "Cambio horario de verano", "Maundy Thursday": "Jueves Santo", "Good Friday": "Viernes Santo", "Holy Saturday": "Sábado Santo", "Easter Sunday": "Domingo Santo", "Easter Monday": "Lunes de Pascua", "Labor Day": "Día del Trabajador", "Mother's Day": "Día de la Madre", "Corpus Christi": "Corpus Christi", "Daylight Saving Time ends": "Cambio horario de invierno", "Assumption of Mary": "Asunción de la Virgen", "Hispanic Day": "Día de la Hispanidad", "All Saints' Day": "Día de Todos los Santos", "Constitution Day": "Constitución Española", "Immaculate Conception": "La Inmaculada Concepción", "Christmas Eve": "Nochebuena", "Christmas Day": "Navidad", "New Year's Eve": "Nochevieja"
            };
            const festivosQueMeInteresan = ["Año Nuevo", "Día de Reyes", "San Valentín", "Lunes de Carnaval", "Martes de Carnaval", "Miércoles de Ceniza", "Día del Padre", "Cambio horario de verano", "Jueves Santo", "Viernes Santo", "Sábado Santo", "Domingo Santo", "Lunes de Pascua", "Día del Trabajador", "Día de la Madre", "Corpus Christi", "Cambio horario de invierno", "Asunción de la Virgen", "Día de la Hispanidad", "Día de Todos los Santos", "Constitución Española", "La Inmaculada Concepción", "Nochebuena", "Navidad", "Nochevieja"];

            const festivosProcesados = datos.response.holidays.map(festivo => ({ ...festivo, name: traducciones[festivo.name] || festivo.name })).filter(festivo => festivosQueMeInteresan.includes(festivo.name));

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
    } catch (error) { res.status(500).json({ error: 'Error interno conectando con Calendarific' }); }
});

// ==========================================
// RUTAS DE COMENTARIOS
// ==========================================

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

app.post('/api/tareas/:id/comentarios', verificarToken, (req, res) => {
    const tareaId = req.params.id;
    const { texto } = req.body;
    const usuarioId = req.usuario.id;

    if (!texto || texto.trim() === '') return res.status(400).json({ error: 'El comentario no puede estar vacío' });

    const query = 'INSERT INTO comentarios (tarea_id, usuario_id, texto) VALUES (?, ?, ?)';
    db.query(query, [tareaId, usuarioId, texto], (err, resultado) => {
        if (err) return res.status(500).json({ error: 'Error al guardar el comentario' });
        res.json({ mensaje: 'Comentario añadido', id: resultado.insertId });
    });
});

app.put('/api/comentarios/:id', verificarToken, (req, res) => {
    const comentarioId = req.params.id;
    const { texto } = req.body;
    const usuarioId = req.usuario.id;

    if (!texto || texto.trim() === '') return res.status(400).json({ error: 'El comentario no puede estar vacío' });

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

app.post('/api/vacaciones', verificarToken, (req, res) => {
    const { grupo_id, fecha_inicio, fecha_fin } = req.body;
    const usuario_id = req.usuario.id;

    if (!grupo_id || !fecha_inicio || !fecha_fin) return res.status(400).json({ error: 'Faltan datos' });

    db.query('INSERT INTO vacaciones (usuario_id, grupo_id, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)', [usuario_id, grupo_id, fecha_inicio, fecha_fin], (err) => {
        if (err) return res.status(500).json({ error: 'Error al registrar vacaciones' });
        res.json({ mensaje: 'Ausencia registrada correctamente en el calendario del equipo' });
    });
});

app.get('/api/vacaciones', verificarToken, (req, res) => {
    const usuario_id = req.usuario.id;
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

app.delete('/api/vacaciones/:id', verificarToken, (req, res) => {
    const vacacionId = req.params.id;
    const usuarioId = req.usuario.id;

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor del backend corriendo en el puerto ${PORT}`);
});