/*********************************************************************************
Ventana emergente para crear o editar tareas (TaskActionModal).
Este archivo dibuja el recuadro que aparece flotando sobre la pantalla 
cuando queremos añadir una tarea nueva o modificar una que ya existe. 
En su interior carga el formulario principal y, si estamos editando, 
añade un botón extra en la parte inferior para poder borrarla para siempre.
***********************************************************************************/

import React from 'react';

// Importamos el formulario que diseñamos en el otro archivo para meterlo aquí dentro
import TaskForm from '../forms/TaskForm'; 

function TaskActionModal({
    isOpen, tituloModal, esEdicion, limpiarFormulario, manejarEnvio,
    titulo, setTitulo, procesarVoz, analizandoVoz, escuchando,
    descripcion, setDescripcion, tareaGrupoId, setTareaGrupoId, misGrupos,
    tareaAsignadoA, setTareaAsignadoA, miembrosDelGrupo, fecha, setFecha,
    hora, setHora, opcionAviso, manejarCambioAviso, fechaNotificacion, setFechaNotificacion,
    repeticion, setRepeticion, diasPersonalizados, setDiasPersonalizados,
    manejarCancelarEdicion, borrarTarea, tareaEnEdicion
}) {
    // Si la aplicación dice que la ventana debe estar cerrada, no dibujamos nada en pantalla
    if (!isOpen) return null;

    return (
        // Fondo oscuro y ligeramente borroso que tapa el resto de la página para centrarnos en la ventana
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* Caja principal de la ventana con barra de desplazamiento por si el formulario es muy largo en móviles */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '25px', width: '90%', maxWidth: '500px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                
                {/* Cabecera con el título ("Crear tarea" o "Editar tarea") y el botón con la "X" para cerrar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{tituloModal}</h2>
                    <button onClick={limpiarFormulario} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                
                {/* Aquí incrustamos el formulario pasándole todos los datos y funciones que necesita para funcionar */}
                <TaskForm 
                    esEdicion={esEdicion} manejarEnvio={manejarEnvio} titulo={titulo} setTitulo={setTitulo}
                    procesarVoz={procesarVoz} analizandoVoz={analizandoVoz} escuchando={escuchando}
                    descripcion={descripcion} setDescripcion={setDescripcion}
                    tareaGrupoId={tareaGrupoId} setTareaGrupoId={setTareaGrupoId} misGrupos={misGrupos}
                    tareaAsignadoA={tareaAsignadoA} setTareaAsignadoA={setTareaAsignadoA} miembrosDelGrupo={miembrosDelGrupo}
                    fecha={fecha} setFecha={setFecha} hora={hora} setHora={setHora}
                    opcionAviso={opcionAviso} manejarCambioAviso={manejarCambioAviso}
                    fechaNotificacion={fechaNotificacion} setFechaNotificacion={setFechaNotificacion}
                    repeticion={repeticion} setRepeticion={setRepeticion} diasPersonalizados={diasPersonalizados} setDiasPersonalizados={setDiasPersonalizados}
                    manejarCancelarEdicion={manejarCancelarEdicion}
                />

                {/* Si hemos abierto esta ventana para modificar una tarea que ya existía, añadimos el botón de borrar */}
                {esEdicion && tareaEnEdicion && (
                    <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <button onClick={() => borrarTarea(tareaEnEdicion)} className="btn-action btn-delete" style={{ width: '100%' }}>
                            Eliminar Tarea Permanentemente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskActionModal;