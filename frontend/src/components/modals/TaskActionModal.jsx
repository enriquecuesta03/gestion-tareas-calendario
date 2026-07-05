import React from 'react';
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
    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '25px', width: '90%', maxWidth: '500px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{tituloModal}</h2>
                    <button onClick={limpiarFormulario} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                
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