// src/services/api.js

// Centralizamos la URL maestra. Al subirlo a producción, solo cambiaremos esta línea.
const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.54:3000';

// Helper inteligente para no repetir los headers de autorización en cada maldita llamada
const getHeaders = (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

// Exportamos un objeto con todas las operaciones de la app
export const api = {
    // --- AUTENTICACIÓN ---
    login: (email, password) => 
        fetch(`${API_URL}/api/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }),
    
    registro: (datos) => 
        fetch(`${API_URL}/api/registro`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(datos) }),

    // --- TAREAS ---
    obtenerTareas: (token) => 
        fetch(`${API_URL}/api/tareas`, { headers: getHeaders(token) }),
        
    crearTarea: (token, datos) => 
        fetch(`${API_URL}/api/tareas`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify(datos) }),
        
    actualizarTarea: (token, id, datos) => 
        fetch(`${API_URL}/api/tareas/${id}`, { method: 'PUT', headers: getHeaders(token), body: JSON.stringify(datos) }),
        
    borrarTarea: (token, id) => 
        fetch(`${API_URL}/api/tareas/${id}`, { method: 'DELETE', headers: getHeaders(token) }),

    // --- INTELIGENCIA ARTIFICIAL Y VOZ ---
    reproducirResumen: (token, tareas, nombre) => 
        fetch(`${API_URL}/api/briefing`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ tareas, nombre }) }),
        
    extraerDatosVoz: (token, texto, estadoActual) => 
        fetch(`${API_URL}/api/extraer-tarea`, { method: 'POST', headers: getHeaders(token), body: JSON.stringify({ texto, estadoActual }) }),

    // --- OTROS DATOS (Grupos, Festivos, Vacaciones) ---
    obtenerGrupos: (token) => 
        fetch(`${API_URL}/api/grupos`, { headers: getHeaders(token) }),
        
    obtenerFestivos: () => 
        fetch(`${API_URL}/api/festivos`), // (Normalmente las APIs públicas no llevan token)
        
    obtenerVacaciones: (token) => 
        fetch(`${API_URL}/api/vacaciones`, { headers: getHeaders(token) }),
        
    borrarVacacion: (token, id) => 
        fetch(`${API_URL}/api/vacaciones/${id}`, { method: 'DELETE', headers: getHeaders(token) }),
};