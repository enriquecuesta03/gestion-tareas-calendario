/*********************************************************************************
Vista principal del tablero de tareas (TableroOperativo).
Sirve como puente entre la plantilla general de la aplicación y el tablero 
visual. Recoge los datos de las tareas, aplica los filtros de tiempo, 
y se las pasa al tablero para que las dibuje en pantalla.
***********************************************************************************/

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

// Importamos el componente que dibuja el tablero y permite arrastrar las tareas
import KanbanBoard from '../features/kanban/KanbanBoard';

function TableroOperativo() {
    // Recogemos las listas de tareas y las funciones que nos envía la plantilla principal
    const { 
        tareasPorHacer, tareasEnProgreso, tareasCompletadas, columnaDestino, setColumnaDestino,
        manejarDrop, cambiarEstado, editarTarea, borrarTarea, setTareaEnVista, cargarComentarios 
    } = useOutletContext();

    // 1. ESTADO DEL FILTRO: Guardamos qué margen de tiempo quiere ver el usuario (Por defecto: 7 días)
    const [filtroTiempo, setFiltroTiempo] = useState('7');

    // 2. LÓGICA DE FILTRADO: Calculamos si una tarea es demasiado antigua para mostrarse
    const filtrarPorFecha = (listaTareas) => {
        // Si el usuario quiere ver todo el historial, no filtramos nada
        if (filtroTiempo === 'todo') return listaTareas;

        return listaTareas.filter(tarea => {
            // Si la tarea no tiene fecha de vencimiento, la mostramos siempre
            if (!tarea.fecha_vencimiento) return true;

            const fechaTarea = new Date(tarea.fecha_vencimiento);
            const hoy = new Date();
            
            // Calculamos la diferencia en días entre hoy y la fecha de la tarea
            const diferenciaMilisegundos = hoy - fechaTarea;
            const diasPasados = diferenciaMilisegundos / (1000 * 60 * 60 * 24);

            // Si la tarea es futura (diasPasados es negativo) o está dentro del margen, la mostramos
            return diasPasados <= parseInt(filtroTiempo);
        });
    };

    // Aplicamos el filtro a las tres columnas antes de enviarlas al tablero visual
    const porHacerFiltradas = filtrarPorFecha(tareasPorHacer);
    const enProgresoFiltradas = filtrarPorFecha(tareasEnProgreso);
    const completadasFiltradas = filtrarPorFecha(tareasCompletadas);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* 3. EL SELECTOR VISUAL: Un desplegable elegante alineado a la derecha */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card, #fff)', 
                    padding: '6px 12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color, #e5e7eb)'
                }}>
                    <label htmlFor="filtro-tareas" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted, #6b7280)' }}>
                        Mostrar historial:
                    </label>
                    <select 
                        id="filtro-tareas"
                        value={filtroTiempo}
                        onChange={(e) => setFiltroTiempo(e.target.value)}
                        style={{ 
                            fontSize: '0.85rem', border: 'none', backgroundColor: 'transparent', 
                            color: 'var(--text-main, #111827)', cursor: 'pointer', outline: 'none', fontWeight: '500'
                        }}
                    >
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Último mes</option>
                        <option value="todo">Todo el registro</option>
                    </select>
                </div>
            </div>

            {/* 4. DIBUJAMOS EL TABLERO: Le pasamos las listas ya filtradas en lugar de las originales */}
            <KanbanBoard 
                tareasPorHacer={porHacerFiltradas} 
                tareasEnProgreso={enProgresoFiltradas} 
                tareasCompletadas={completadasFiltradas} 
                columnaDestino={columnaDestino} setColumnaDestino={setColumnaDestino}
                manejarDrop={manejarDrop} cambiarEstado={cambiarEstado} editarTarea={editarTarea} 
                borrarTarea={borrarTarea} setTareaEnVista={setTareaEnVista} cargarComentarios={cargarComentarios} 
            />
        </div>
    );
}

export default TableroOperativo;