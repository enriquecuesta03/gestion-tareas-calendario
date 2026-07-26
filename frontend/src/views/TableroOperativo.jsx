/*********************************************************************************
Vista principal del tablero de tareas (TableroOperativo).
Sirve como puente entre la plantilla general de la aplicación y el tablero 
visual. Recoge los datos de las tareas y las funciones para moverlas, 
editarlas o borrarlas, y se las pasa al tablero para que las dibuje en pantalla.
***********************************************************************************/

import React from 'react';
import { useOutletContext } from 'react-router-dom';

// Importamos el componente que dibuja el tablero y permite arrastrar las tareas
import KanbanBoard from '../features/kanban/KanbanBoard';

function TableroOperativo() {
    // Recogemos las listas de tareas y las funciones que nos envía la plantilla principal
    const { 
        tareasPorHacer, tareasEnProgreso, tareasCompletadas, columnaDestino, setColumnaDestino,
        manejarDrop, cambiarEstado, editarTarea, borrarTarea, setTareaEnVista, cargarComentarios 
    } = useOutletContext();

    return (
        // Dibujamos el tablero pasándole todos los datos y funciones que necesita para funcionar
        <KanbanBoard 
            tareasPorHacer={tareasPorHacer} tareasEnProgreso={tareasEnProgreso} tareasCompletadas={tareasCompletadas} 
            columnaDestino={columnaDestino} setColumnaDestino={setColumnaDestino}
            manejarDrop={manejarDrop} cambiarEstado={cambiarEstado} editarTarea={editarTarea} 
            borrarTarea={borrarTarea} setTareaEnVista={setTareaEnVista} cargarComentarios={cargarComentarios} 
        />
    );
}

export default TableroOperativo;