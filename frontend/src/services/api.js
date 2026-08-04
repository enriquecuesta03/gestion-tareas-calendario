/*********************************************************************************
Archivo de conexión con el servidor (api.js).
Aquí están guardadas todas las peticiones que hace la página web para hablar 
con el backend. Centraliza la dirección del servidor y añade automáticamente 
la "llave" (token) de seguridad a cada petición para no tener que escribirla 
manualmente cada vez que pedimos o enviamos datos.
***********************************************************************************/

// Guardamos la dirección principal del servidor. Si subimos la web a internet, solo hay que cambiar esto.
const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.54:3000';

// Función auxiliar para preparar los datos de envío y añadir el token de seguridad si el usuario ha iniciado sesión
const getHeaders = (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

// Agrupamos todas las operaciones que se comunican con el servidor en un solo bloque
export const api = {
    // --- INICIO DE SESIÓN Y REGISTRO ---
    login: (email, password) => 
        fetch(`${API_URL}/api/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }),
    
    registro: (datos) => 
        fetch(`${API_URL}/api/registro`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(datos) }),

    // --- GESTIÓN DE TAREAS ---
    obtenerTareas: (token) => 
        fetch(`${API_URL}/api/tareas`, { headers: getHeaders(token) }),
        
    crearTarea: (token, datos) => 
        fetch(`${API_URL}/api/tareas`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(datos) }),
        
    actualizarTarea: (token, id, datos) => 
        fetch(`${API_URL}/api/tareas/${id}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(datos) }),
        
    borrarTarea: (token, id) => 
        fetch(`${API_URL}/api/tareas/${id}`, { method: 'DELETE', headers: getHeaders(token) }),

// --- INTELIGENCIA ARTIFICIAL Y ASISTENTE DE VOZ ---
    reproducirResumen: async (token, tareas, nombre) => {
        console.log("KORA VOZ 2.0 - Iniciando petición limpia");

        // 1. Pedimos SOLO el texto al backend (Render)
        const respuestaTexto = await fetch(`${API_URL}/api/briefing`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({ tareas, nombre })
        });
        
        if (!respuestaTexto.ok) {
            throw new Error("Fallo en el backend al generar el guion con Gemini.");
        }
        
        const data = await respuestaTexto.json();
        console.log("Guion generado:", data.texto);

        // 2. Llamamos a ElevenLabs desde el navegador (para saltarnos el bloqueo de IP)
        const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        
        if (!elevenLabsApiKey) {
            alert("Falta la API Key en Vercel. Kora no puede hablar sin su llave.");
            throw new Error("API Key no configurada en el frontend.");
        }

        const voiceId = "jcjw6BGYhh9x3PXYUqlu"; 
        const urlEleven = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
        
        const respuestaAudio = await fetch(urlEleven, {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: data.texto,
                model_id: "eleven_multilingual_v2", 
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        // 3. EL FILTRO SALVAVIDAS: Evita que React intente reproducir un error como si fuera música
        if (!respuestaAudio.ok) {
            const errorDeEleven = await respuestaAudio.text();
            console.error("ERROR REAL DE ELEVENLABS:", errorDeEleven);
            throw new Error("ElevenLabs rechazó el audio. Revisa la consola.");
        }

        // 4. Convertimos la respuesta en un MP3 cerrado y engañamos a React para que lo lea bien
        const audioBlob = await respuestaAudio.blob();
        console.log("Audio listo para reproducir.");
        
        return new Response(audioBlob, { 
            headers: { 'Content-Type': 'audio/mpeg' } 
        });
    },
        
    extraerDatosVoz: (token, texto, estadoActual) => 
        fetch(`${API_URL}/api/extraer-tarea`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ texto, estadoActual }) }),

    // --- GRUPOS, FESTIVOS Y VACACIONES ---
    obtenerGrupos: (token) => 
        fetch(`${API_URL}/api/grupos`, { headers: getHeaders(token) }),
        
    // Las peticiones a APIs de festivos públicos normalmente no necesitan nuestra llave de seguridad
    obtenerFestivos: () => 
        fetch(`${API_URL}/api/festivos`), 
        
    obtenerVacaciones: (token) => 
        fetch(`${API_URL}/api/vacaciones`, { headers: getHeaders(token) }),
        
    borrarVacacion: (token, id) => 
        fetch(`${API_URL}/api/vacaciones/${id}`, { method: 'DELETE', headers: getHeaders(token) }),
};