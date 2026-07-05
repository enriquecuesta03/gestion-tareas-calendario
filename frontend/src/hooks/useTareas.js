import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.54:3000';

export function useTareas(token, onLogout) {
    // 1. ESTADOS DE DATOS PRINCIPALES
    const [tareas, setTareas] = useState([]);
    const [festivos, setFestivos] = useState([]);
    const [vacaciones, setVacaciones] = useState([]);
    const [misGrupos, setMisGrupos] = useState([]);
    const [comentarios, setComentarios] = useState([]);
    
    // 2. CONFIGURACIÓN DE CABECERAS Y TOASTS
    const headersConAuth = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });
    
    const notificarExito = (mensaje) => toast.success(mensaje, { style: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--accent-green)' }, iconTheme: { primary: 'var(--accent-green)', secondary: 'white' }});
    const notificarError = (mensaje) => toast.error(mensaje, { style: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--danger-color)' }, iconTheme: { primary: 'var(--danger-color)', secondary: 'white' }});

    // 3. FUNCIONES DE CARGA (READ)
    const cargarTareas = () => fetch(`${API_URL}/api/tareas`, { headers: headersConAuth() }).then(res => { if (res.status === 401 || res.status === 403) onLogout(); return res.json(); }).then(datos => setTareas(Array.isArray(datos) ? datos : []));
    const cargarMisGrupos = () => fetch(`${API_URL}/api/grupos`, { headers: headersConAuth() }).then(res => res.json()).then(data => setMisGrupos(Array.isArray(data) ? data : []));
    const cargarFestivos = () => fetch(`${API_URL}/api/festivos`).then(res => res.json()).then(datos => setFestivos(datos));
    const cargarVacaciones = () => fetch(`${API_URL}/api/vacaciones`, { headers: headersConAuth() }).then(res => res.json()).then(data => setVacaciones(Array.isArray(data) ? data : []));
    const cargarComentarios = (tareaId) => fetch(`${API_URL}/api/tareas/${tareaId}/comentarios`, { headers: headersConAuth() }).then(res => res.json()).then(data => setComentarios(Array.isArray(data) ? data : []));

    // 4. FUNCIONES DE MODIFICACIÓN (CREATE, UPDATE, DELETE)
    const guardarTarea = async (url, metodo, datosTarea, esEdicion) => {
        try {
            const respuesta = await fetch(url, { method: metodo, headers: headersConAuth(), body: JSON.stringify(datosTarea) });
            if (respuesta.status === 403) { const dataError = await respuesta.json(); notificarError(dataError.error); return false; }
            cargarTareas(); 
            notificarExito(esEdicion ? "Tarea actualizada" : "Nueva tarea registrada");
            return true;
        } catch (error) { notificarError("Error al guardar"); return false; }
    };

    const borrarTarea = async (id, setTareaEnVista) => {
        if (!window.confirm('¿Seguro que quieres borrar esta tarea?')) return false;
        try {
            const respuesta = await fetch(`${API_URL}/api/tareas/${id}`, { method: 'DELETE', headers: headersConAuth() });
            if (respuesta.status === 403) { notificarError((await respuesta.json()).error); return false; }
            cargarTareas(); 
            if (setTareaEnVista) setTareaEnVista(null); 
            notificarExito("Tarea eliminada");
            return true;
        } catch (error) { console.error(error); return false; }
    };

    const borrarVacacion = (id, setVacacionEnVista) => {
        if (!window.confirm('¿Quieres eliminar este periodo de vacaciones?')) return;
        fetch(`${API_URL}/api/vacaciones/${id}`, { method: 'DELETE', headers: headersConAuth() }).then(res => res.json()).then(data => {
            if (data.error) notificarError(data.error); else { if (setVacacionEnVista) setVacacionEnVista(null); cargarVacaciones(); notificarExito("Vacaciones eliminadas"); }
        });
    };

    const cambiarEstado = async (id, nuevoEstado, obtenerFechaHoraLocalStr) => {
        if (nuevoEstado === 'Completado') {
            const t = tareas.find(t => t.id === id);
            if (t && t.repeticion && t.repeticion !== 'ninguna' && obtenerFechaHoraLocalStr) {
                const calcularSiguiente = (fechaOriginal) => {
                    let nueva = new Date(fechaOriginal);
                    if (t.repeticion === 'diaria') nueva.setDate(nueva.getDate() + 1);
                    else if (t.repeticion === 'semanal') nueva.setDate(nueva.getDate() + 7);
                    else if (t.repeticion === 'mensual') nueva.setMonth(nueva.getMonth() + 1);
                    else if (t.repeticion === 'anual') nueva.setFullYear(nueva.getFullYear() + 1);
                    else if (t.repeticion.startsWith('personalizado_')) nueva.setDate(nueva.getDate() + parseInt(t.repeticion.split('_')[1], 10));
                    return nueva;
                };
                fetch(`${API_URL}/api/tareas`, { method: 'POST', headers: headersConAuth(), body: JSON.stringify({ titulo: t.titulo, descripcion: t.descripcion, fecha_vencimiento: obtenerFechaHoraLocalStr(calcularSiguiente(new Date(t.fecha_vencimiento))), fecha_notificacion: t.fecha_notificacion ? obtenerFechaHoraLocalStr(calcularSiguiente(new Date(t.fecha_notificacion))) : null, repeticion: t.repeticion, grupo_id: t.grupo_id, asignado_a: t.asignado_a }) });
            }
        }
        try {
            const res = await fetch(`${API_URL}/api/tareas/${id}`, { method: 'PUT', headers: headersConAuth(), body: JSON.stringify({ estado: nuevoEstado }) });
            if (res.status === 403) return notificarError((await res.json()).error);
            cargarTareas();
        } catch (error) { console.error(error); }
    };

    // COMENTARIOS
    const enviarComentario = (tareaId, nuevoComentario, cbLimpiar) => {
        if (!nuevoComentario.trim() || !tareaId) return;
        fetch(`${API_URL}/api/tareas/${tareaId}/comentarios`, { method: 'POST', headers: headersConAuth(), body: JSON.stringify({ texto: nuevoComentario })})
        .then(res => res.json()).then(() => { if(cbLimpiar) cbLimpiar(); cargarComentarios(tareaId); });
    };

    const guardarEdicionComentario = async (comentarioId, textoComentarioEditado, tareaId, cbCerrar) => {
        if (!textoComentarioEditado.trim()) return;
        try {
            const respuesta = await fetch(`${API_URL}/api/comentarios/${comentarioId}`, { method: 'PUT', headers: headersConAuth(), body: JSON.stringify({ texto: textoComentarioEditado })});
            if (!respuesta.ok) return notificarError(`Error del servidor`);
            const data = await respuesta.json();
            if (data.error) return notificarError(data.error);
            if(cbCerrar) cbCerrar(); 
            cargarComentarios(tareaId); 
            notificarExito("Comentario actualizado");
        } catch (error) { console.error(error); }
    };

    // 5. EFECTOS DE INICIALIZACIÓN Y NOTIFICACIONES
    useEffect(() => {
        if (token) {
            cargarTareas(); cargarMisGrupos(); cargarFestivos(); cargarVacaciones();
            if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') Notification.requestPermission(); 
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        const intervalo = setInterval(() => {
            if (Notification.permission === 'granted') {
                const ahora = Date.now();
                tareas.forEach(tarea => {
                    if (tarea.estado !== 'Completado' && tarea.fecha_notificacion && (ahora >= new Date(tarea.fecha_notificacion).getTime()) && (ahora - new Date(tarea.fecha_notificacion).getTime() < 60000)) { 
                        new Notification("Recordatorio", { body: `Pendiente: ${tarea.titulo}` }); 
                    }
                });
            }
        }, 60000);
        return () => clearInterval(intervalo);
    }, [tareas, token]);

    return {
        tareas, festivos, vacaciones, misGrupos, comentarios,
        cargarComentarios, guardarTarea, borrarTarea, cambiarEstado, 
        borrarVacacion, enviarComentario, guardarEdicionComentario,
        notificarExito, notificarError, API_URL, headersConAuth
    };
}