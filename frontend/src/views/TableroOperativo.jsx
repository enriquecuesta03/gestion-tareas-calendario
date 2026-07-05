import React from 'react';
import { useOutletContext } from 'react-router-dom';
import KanbanBoard from '../features/kanban/KanbanBoard';

function TableroOperativo() {
    // Atrapamos las funciones y estados que nos pasa el Layout
    const { 
        tareasPorHacer, tareasEnProgreso, tareasCompletadas, columnaDestino, setColumnaDestino,
        manejarDrop, cambiarEstado, editarTarea, borrarTarea, setTareaEnVista, cargarComentarios 
    } = useOutletContext();

    return (
        <KanbanBoard 
            tareasPorHacer={tareasPorHacer} tareasEnProgreso={tareasEnProgreso} tareasCompletadas={tareasCompletadas} 
            columnaDestino={columnaDestino} setColumnaDestino={setColumnaDestino}
            manejarDrop={manejarDrop} cambiarEstado={cambiarEstado} editarTarea={editarTarea} 
            borrarTarea={borrarTarea} setTareaEnVista={setTareaEnVista} cargarComentarios={cargarComentarios} 
        />
    );
}

export default TableroOperativo;