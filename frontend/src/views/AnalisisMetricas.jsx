/*********************************************************************************
Vista principal de las estadísticas y métricas (AnalisisMetricas).
Sirve como puente entre la plantilla general de la aplicación y la pantalla 
de los gráficos. Recoge los datos numéricos de las tareas y se los pasa 
al panel visual para que dibuje las gráficas y estadísticas.
***********************************************************************************/

import React from 'react';
import { useOutletContext } from 'react-router-dom';

// Importamos el componente que dibuja los gráficos y las estadísticas en pantalla
import MetricsDashboard from '../features/analytics/MetricsDashboard';

function AnalisisMetricas() {
    // Recogemos los datos preparados para las gráficas y las funciones que nos envía la plantilla
    const { 
        datosGraficoEstado, tareasCompletadas, tareasPorHacer, tareasEnProgreso, 
        backlogOrdenado, setTareaEnVista, cargarComentarios, editarTarea 
    } = useOutletContext();

    return (
        // Dibujamos el panel de estadísticas pasándole todos los datos que necesita para funcionar
        <MetricsDashboard 
            datosGraficoEstado={datosGraficoEstado} tareasCompletadas={tareasCompletadas} 
            tareasPorHacer={tareasPorHacer} tareasEnProgreso={tareasEnProgreso} 
            backlogOrdenado={backlogOrdenado} setTareaEnVista={setTareaEnVista} 
            cargarComentarios={cargarComentarios} editarTarea={editarTarea} 
        />
    );
}

export default AnalisisMetricas;