import React from 'react';
import { useOutletContext } from 'react-router-dom';
import MetricsDashboard from '../features/analytics/MetricsDashboard';

function AnalisisMetricas() {
    const { 
        datosGraficoEstado, tareasCompletadas, tareasPorHacer, tareasEnProgreso, 
        backlogOrdenado, setTareaEnVista, cargarComentarios, editarTarea 
    } = useOutletContext();

    return (
        <MetricsDashboard 
            datosGraficoEstado={datosGraficoEstado} tareasCompletadas={tareasCompletadas} 
            tareasPorHacer={tareasPorHacer} tareasEnProgreso={tareasEnProgreso} 
            backlogOrdenado={backlogOrdenado} setTareaEnVista={setTareaEnVista} 
            cargarComentarios={cargarComentarios} editarTarea={editarTarea} 
        />
    );
}

export default AnalisisMetricas;