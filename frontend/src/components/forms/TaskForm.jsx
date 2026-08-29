/*********************************************************************************
Formulario para crear y editar tareas (TaskForm).
Este componente muestra la pantalla donde el usuario rellena los datos de 
una tarea: el título, la descripción, si es personal o de empresa, la fecha 
límite, las alertas y si se repite. También incluye el botón del asistente 
de voz con Inteligencia Artificial, que escucha al usuario y rellena todos 
estos campos de forma automática.
***********************************************************************************/

import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import es from 'date-fns/locale/es';

registerLocale('es', es);

function TaskForm({
    esEdicion,
    manejarEnvio,
    titulo, setTitulo,
    procesarVoz, analizandoVoz, escuchando,
    descripcion, setDescripcion,
    tareaGrupoId, setTareaGrupoId, misGrupos,
    tareaAsignadoA, setTareaAsignadoA, miembrosDelGrupo,
    fecha, setFecha,
    hora, setHora,
    opcionAviso, manejarCambioAviso,
    fechaNotificacion, setFechaNotificacion,
    repeticion, setRepeticion,
    diasPersonalizados, setDiasPersonalizados,
    manejarCancelarEdicion
}) {
    return (
        <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <style>{`
                .tf-row { display: flex; gap: 12px; align-items: flex-start; }
                .tf-col-40 { flex: 0 0 38%; } 
                .tf-col-60 { flex: 1; }       
                .tf-col-50 { flex: 1; }
                /* tf-col-60 y tf-col-50 son lo mismo en la práctica (flex:1 los dos),
                   nombres de cuando pensé en darles anchos distintos. Los dejo así,
                   cambiar el nombre ahora tocaría media docena de sitios para nada. */
                
                .tf-input {
                    width: 100%; padding: 12px; border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background-color: var(--bg-body); color: var(--text-main);
                    font-size: 0.95rem; box-sizing: border-box;
                    font-family: var(--font-main); transition: border-color 0.2s;
                }
                .tf-input:focus { outline: none; border-color: var(--accent-green); }

                .react-datepicker-wrapper { width: 100%; display: block; }
                .react-datepicker__input-container { display: block; width: 100%; }
                .react-datepicker { font-family: var(--font-main); border: 1px solid var(--border-color); }
                .react-datepicker__header { background-color: var(--bg-body); border-bottom: 1px solid var(--border-color); }
                .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background-color: var(--accent-green) !important; color: white !important; }

                @media (max-width: 768px) {
                    .tf-row { flex-direction: column; gap: 16px; }
                    .tf-col-40, .tf-col-60, .tf-col-50 { width: 100%; flex: none; }
                    .tf-btn-mic { width: 100%; justify-content: center; margin-top: 4px; }
                }
            `}</style>

            <div className="tf-row">
                <input 
                    type="text" 
                    placeholder="Título de la tarea" 
                    required 
                    value={titulo} 
                    onChange={(e) => setTitulo(e.target.value)} 
                    className="tf-input"
                    style={{ flex: 1, fontSize: '1rem', fontWeight: '500' }} 
                />
                
                <button
                    type="button"
                    onClick={procesarVoz}
                    disabled={analizandoVoz}
                    className="tf-btn-mic"
                    // el botón tiene tres pintas distintas según el estado: escuchando
                    // (rojo, grabando), analizandoVoz (verde, esperando a Gemini) o el
                    // reposo normal. Todo lo de abajo (color, texto, icono) sale de
                    // esos mismos dos booleanos, no hay un tercer estado explícito
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 18px', borderRadius: '8px',
                        border: `1px solid ${escuchando ? '#ef4444' : (analizandoVoz ? 'var(--accent-green)' : 'var(--border-color)')}`,
                        background: escuchando ? 'rgba(239, 68, 68, 0.1)' : (analizandoVoz ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)'),
                        color: escuchando ? '#ef4444' : (analizandoVoz ? 'var(--accent-green)' : 'var(--text-main)'),
                        cursor: analizandoVoz ? 'wait' : 'pointer',
                        transition: 'all 0.3s', fontWeight: '600', flex: 'none'
                    }}
                >
                    {escuchando ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                            Detener
                        </>
                    ) : analizandoVoz ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 22h14"></path><path d="M5 2h14"></path>
                                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
                            </svg>
                            Pensando...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line>
                            </svg>
                            Dictar IA
                        </>
                    )}
                </button>
            </div>
            
            <input 
                type="text" 
                placeholder="Descripción (opcional)" 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                className="tf-input"
            />
            
            <div className="tf-row">
                <div className="tf-col-50">
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Espacio de trabajo
                    </label>
                    <select 
                        value={tareaGrupoId} 
                        onChange={(e) => setTareaGrupoId(e.target.value)} 
                        disabled={esEdicion} 
                    // no dejo tocar el grupo al editar una tarea ya creada: cambiar
                    // de espacio implicaría recargar miembrosDelGrupo y reasignar,
                    // y no vale la pena para lo poco que se usaría
                        className="tf-input"
                    >
                        <option value="">Personal</option>
                        {misGrupos.map(g => (
                            <option key={g.id} value={g.id}>{g.nombre}</option>
                        ))}
                    </select>
                </div>
                
                {tareaGrupoId && !esEdicion && (
                    <div className="tf-col-50">
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Asignación
                        </label>
                        <select 
                            value={tareaAsignadoA} 
                            onChange={(e) => setTareaAsignadoA(e.target.value)} 
                            required 
                            className="tf-input"
                        >
                            <option value="">Auto-asignación</option>
                            {miembrosDelGrupo.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="tf-row">
                <div className="tf-col-40">
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Fecha límite
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: '1.5' }}>
                            {/* ojo con el T00:00:00 de aquí abajo: si se lo dejo a Date sin
                                hora, lo interpreta como medianoche UTC y según la zona
                                horaria del navegador la fecha se corre un día. Me tuvo
                                un buen rato liado hasta que caí en esto. */}
                            <DatePicker
                                selected={fecha ? new Date(`${fecha}T00:00:00`) : null}
                                onChange={(date) => {
                                    if (date) {
                                        const dia = String(date.getDate()).padStart(2, '0');
                                        const mes = String(date.getMonth() + 1).padStart(2, '0');
                                        setFecha(`${date.getFullYear()}-${mes}-${dia}`);
                                    } else {
                                        setFecha('');
                                    }
                                }}
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                                placeholderText="Día/Mes/Año"
                                className="tf-input"
                                style={{ padding: '12px 8px' }}
                                required
                            />
                        </div>

                        <div style={{ flex: '1' }}>
                            {/* DatePicker no tiene un modo "solo hora" real, así que le
                                paso una fecha cualquiera (1970-01-01) y solo me quedo con
                                horas y minutos al guardar. Un poco chapuza pero funciona. */}
                            <DatePicker
                                selected={hora ? new Date(`1970-01-01T${hora}:00`) : null}
                                onChange={(time) => {
                                    if (time) {
                                        const h = String(time.getHours()).padStart(2, '0');
                                        const m = String(time.getMinutes()).padStart(2, '0');
                                        setHora(`${h}:${m}`);
                                    } else {
                                        setHora('');
                                    }
                                }}
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="Hora"
                                dateFormat="HH:mm"
                                locale="es"
                                placeholderText="HH:MM"
                                className="tf-input"
                                style={{ padding: '12px 8px' }}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="tf-col-60">
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Sistema de alertas
                    </label>
                    <select 
                        value={opcionAviso} 
                        onChange={manejarCambioAviso} 
                        className="tf-input"
                    >
                        {/* hoy/mañana/semana cubren casi todos los casos reales;
                            "personalizado" está para lo raro, con su propio DatePicker debajo */}
                        <option value="">Sin alerta programada</option>
                        <option value="hoy">Notificar hoy en 2 horas</option>
                        <option value="manana">Notificar mañana (09:00 AM)</option>
                        <option value="semana">Notificar la próxima semana</option>
                        <option value="personalizado">Configuración manual...</option>
                    </select>
                    
                    {opcionAviso === 'personalizado' && (
                        <div style={{ marginTop: '8px' }}>
                            <DatePicker
                                selected={fechaNotificacion ? new Date(fechaNotificacion) : null}
                                onChange={(date) => {
                                    if (date) {
                                        const dia = String(date.getDate()).padStart(2, '0');
                                        const mes = String(date.getMonth() + 1).padStart(2, '0');
                                        const anio = date.getFullYear();
                                        const h = String(date.getHours()).padStart(2, '0');
                                        const m = String(date.getMinutes()).padStart(2, '0');
                                        setFechaNotificacion(`${anio}-${mes}-${dia}T${h}:${m}`);
                                    } else {
                                        setFechaNotificacion('');
                                    }
                                }}
                                showTimeSelect
                                timeIntervals={15}
                                timeCaption="Hora"
                                dateFormat="dd/MM/yyyy - HH:mm"
                                locale="es"
                                placeholderText="Selecciona el día y la hora de la alerta"
                                className="tf-input"
                                required
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Repetición automática
                </label>
                <div className="tf-row" style={{ alignItems: 'center' }}>
                    <select 
                        value={repeticion} 
                        onChange={(e) => setRepeticion(e.target.value)} 
                        className="tf-input"
                        style={{ flex: 1 }}
                    >
                        <option value="ninguna">Evento único (No se repite)</option>
                        <option value="diaria">Repetir cada día</option>
                        <option value="semanal">Repetir cada semana</option>
                        <option value="mensual">Repetir cada mes</option>
                        <option value="anual">Repetir cada año</option>
                        <option value="personalizado">Repetir cada varios días...</option>
                    </select>
                    {repeticion === 'personalizado' && (
                        // "cada N días" es aparte de diaria/semanal/mensual/anual porque
                        // esas cuatro se guardan como una palabra fija en la BD, mientras
                        // que esta necesita también el número que escriba el usuario
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500'}}>Cada:</span>
                            <input 
                                type="number" 
                                min="1" 
                                value={diasPersonalizados} 
                                onChange={(e) => setDiasPersonalizados(e.target.value)} 
                                required 
                                placeholder="Días" 
                                className="tf-input"
                                style={{ width: '80px', textAlign: 'center' }} 
                            />
                            <span style={{fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500'}}>días</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" className="btn-add" style={{ flex: 1, padding: '14px', fontSize: '1rem', fontWeight: '600', borderRadius: '8px' }}>
                    {esEdicion ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
                {esEdicion && (
                    <button type="button" onClick={manejarCancelarEdicion} className="btn-action" style={{ flex: 1, padding: '14px', fontSize: '1rem', borderRadius: '8px' }}>
                        Cancelar Edición
                    </button>
                )}
            </div>
        </form>
    );
}

export default TaskForm;