/*********************************************************************************
Vista principal del tablero de tareas (TableroOperativo).
Sirve como puente entre la plantilla general de la aplicación y el tablero 
visual. Recoge los datos de las tareas, aplica los filtros de vencimiento, 
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

    const filtrarPorVencimientoFuturo = (listaTareas) => {
        if (filtroTiempo === 'todo') return listaTareas;

        return listaTareas.filter(tarea => {
            // Si la tarea no tiene fecha de vencimiento, la mostramos para no perderla
            if (!tarea.fecha_vencimiento) return true;

            const fechaTarea = new Date(tarea.fecha_vencimiento);
            if (isNaN(fechaTarea.getTime())) return true;

            const hoy = new Date();
            
            // AHORA RESTAMOS AL REVÉS: Fecha futura - Hoy
            const diferenciaMilisegundos = fechaTarea - hoy;
            const diasRestantes = diferenciaMilisegundos / (1000 * 60 * 60 * 24);

            // REGLA DE ORO: Si la tarea ya ha caducado (días restantes negativos), SE MUESTRA SIEMPRE
            if (diasRestantes < 0) return true;

            // Si es futura, comprobamos si vence dentro de los próximos X días
            return diasRestantes <= parseInt(filtroTiempo, 10);
        });
    };

    // Aplicamos el filtro a las tareas activas (las completadas las dejamos enteras o puedes filtrarlas también)
    const porHacerFiltradas = filtrarPorVencimientoFuturo(tareasPorHacer);
    const enProgresoFiltradas = filtrarPorVencimientoFuturo(tareasEnProgreso);
    const completadasFiltradas = tareasCompletadas; // Las completadas no suelen tener fecha futura

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', paddingRight: '10px' }}>
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card, #fff)', 
                    padding: '6px 12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color, #e5e7eb)'
                }}>
                    <label htmlFor="filtro-tareas" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted, #6b7280)' }}>
                        Próximos vencimientos:
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
                        <option value="7">Próximos 7 días</option>
                        <option value="30">Próximo mes</option>
                        <option value="todo">Todas las tareas</option>
                    </select>
                </div>
            </div>

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