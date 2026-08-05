/*********************************************************************************
Vista principal del tablero de tareas (TableroOperativo).
Sirve como puente entre la plantilla general de la aplicación y el tablero 
visual. Recoge los datos de las tareas, aplica los filtros de tiempo, 
y se las pasa al tablero para que las dibuje en pantalla.
***********************************************************************************/

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import KanbanBoard from '../features/kanban/KanbanBoard';

function TableroOperativo() {
    const { 
        tareasPorHacer, tareasEnProgreso, tareasCompletadas, columnaDestino, setColumnaDestino,
        manejarDrop, cambiarEstado, editarTarea, borrarTarea, setTareaEnVista, cargarComentarios 
    } = useOutletContext();

    // Estado del filtro: 7 dias por defecto
    const [filtroTiempo, setFiltroTiempo] = useState('7');

    const filtrarPorFecha = (listaTareas) => {
        if (filtroTiempo === 'todo') return listaTareas;

        return listaTareas.filter(tarea => {
            // Evaluacion de tareas sin fecha de vencimiento
            if (!tarea.fecha_vencimiento) {
                console.log("[Filtro] Ocultada (Sin fecha):", tarea.titulo);
                return false; 
            }

            const fechaTarea = new Date(tarea.fecha_vencimiento);
            
            // Evaluacion de fechas con formato invalido en base de datos
            if (isNaN(fechaTarea.getTime())) {
                console.log("[Filtro] Ocultada (Fecha invalida):", tarea.titulo, tarea.fecha_vencimiento);
                return false;
            }

            const hoy = new Date();
            const diferenciaMilisegundos = hoy - fechaTarea;
            const diasPasados = diferenciaMilisegundos / (1000 * 60 * 60 * 24);

            // Calculo de visibilidad segun el rango seleccionado
            const esVisible = diasPasados <= parseInt(filtroTiempo, 10);
            
            console.log("[Filtro] Tarea:", tarea.titulo, "| Dias pasados:", Math.floor(diasPasados), "| Visible:", esVisible);

            return esVisible;
        });
    };

    // Aplicamos el filtro de tiempo unicamente a las tareas completadas
    const completadasFiltradas = filtrarPorFecha(tareasCompletadas);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card, #fff)', 
                    padding: '6px 12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color, #e5e7eb)'
                }}>
                    <label htmlFor="filtro-tareas" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted, #6b7280)' }}>
                        Historial completadas:
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

            <KanbanBoard 
                tareasPorHacer={tareasPorHacer} 
                tareasEnProgreso={tareasEnProgreso} 
                tareasCompletadas={completadasFiltradas} 
                columnaDestino={columnaDestino} setColumnaDestino={setColumnaDestino}
                manejarDrop={manejarDrop} cambiarEstado={cambiarEstado} editarTarea={editarTarea} 
                borrarTarea={borrarTarea} setTareaEnVista={setTareaEnVista} cargarComentarios={cargarComentarios} 
            />
        </div>
    );
}

export default TableroOperativo;