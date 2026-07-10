import React, { useState } from 'react';

// RUTA CORREGIDA
import '../../assets/styles/DashboardLayout.css';

function KanbanBoard({ 
    tareasPorHacer, 
    tareasEnProgreso, 
    tareasCompletadas, 
    columnaDestino, 
    setColumnaDestino,
    manejarDrop, 
    cambiarEstado, 
    editarTarea, 
    borrarTarea, 
    setTareaEnVista, 
    cargarComentarios 
}) {

    // ESTADO PARA CONTROLAR EL BOTÓN "VER MÁS"
    const [mostrarTodasCompletadas, setMostrarTodasCompletadas] = useState(false);
    const LIMITE_COMPLETADAS = 4; // Límite de 4 tareas como pediste

    const renderizarFecha = (fechaIso, estado) => {
        if (!fechaIso) {
            return (
                <span className="task-date-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'text-bottom'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Sin fecha
                </span>
            );
        }
        
        const fecha = new Date(fechaIso);
        const hoy = new Date();
        const estaCaducada = fecha < hoy && estado !== 'Completado';
        
        return (
            <span className={`task-date-badge ${estaCaducada ? 'overdue' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'text-bottom'}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {fecha.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
        );
    };

    return (
        <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', paddingBottom: '10px' }}>
            
            <div className="mobile-swipe-hint">
                Desliza lateralmente para ver más estados
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>

            <div className="kanban-board" style={{ marginTop: 0 }}>
                  
              {/* ================= COLUMNA POR HACER ================= */}
              <div className="kanban-col todo" 
                   style={{ 
                       border: columnaDestino === 'Por Hacer' ? '2px dashed var(--border-color)' : '2px solid transparent', 
                       backgroundColor: columnaDestino === 'Por Hacer' ? 'var(--bg-body)' : 'transparent', 
                       transition: 'all 0.2s' 
                   }}
                   onDragOver={(e) => { e.preventDefault(); setColumnaDestino('Por Hacer'); }} 
                   onDragLeave={() => setColumnaDestino(null)}
                   onDrop={(e) => manejarDrop(e, 'Por Hacer')}
              >
                <h2 className="col-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Por Hacer</span>
                    <span style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{tareasPorHacer.length}</span>
                </h2>
                
                {tareasPorHacer.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>
                        <span style={{ fontSize: '0.9rem' }}>Bandeja limpia</span>
                    </div>
                ) : (
                    tareasPorHacer.map(tarea => (
                      <div key={tarea.id} draggable={true} onDragStart={(e) => e.dataTransfer.setData('tareaId', tarea.id.toString())} className="task-card" onClick={() => { setTareaEnVista(tarea); cargarComentarios(tarea.id); }}>
                        <h3 className="task-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                            {tarea.titulo} 
                            {tarea.nombre_grupo && <span className="badge-empresa">{tarea.nombre_grupo}</span>}
                        </h3>
                        <p className="task-desc">{tarea.descripcion}</p>
                        
                        <div style={{ fontSize: '0.8rem', marginBottom: '15px' }}>
                            {renderizarFecha(tarea.fecha_vencimiento, tarea.estado)}
                        </div>

                        <div className="task-actions task-actions-mobile" style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={(e) => { e.stopPropagation(); editarTarea(tarea); }} className="btn-action" style={{flex: 1}}>
                              <span className="desktop-only"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></span>
                              Editar
                          </button>
                          
                          <button onClick={(e) => { e.stopPropagation(); cambiarEstado(tarea.id, 'En Progreso'); }} className="btn-action desktop-only" style={{flex: 1}}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                              Iniciar
                          </button>
                          
                          <button onClick={(e) => { e.stopPropagation(); cambiarEstado(tarea.id, 'En Progreso'); }} className="btn-action mobile-only" style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-card)' }}>
                              Mover a "En Progreso"
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
              
              {/* ================= COLUMNA EN PROGRESO ================= */}
              <div className="kanban-col progress" 
                   style={{ 
                       border: columnaDestino === 'En Progreso' ? '2px dashed var(--border-color)' : '2px solid transparent', 
                       backgroundColor: columnaDestino === 'En Progreso' ? 'var(--bg-body)' : 'transparent', 
                       transition: 'all 0.2s' 
                   }}
                   onDragOver={(e) => { e.preventDefault(); setColumnaDestino('En Progreso'); }} 
                   onDragLeave={() => setColumnaDestino(null)}
                   onDrop={(e) => manejarDrop(e, 'En Progreso')}
              >
                <h2 className="col-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>En Progreso</span>
                    <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{tareasEnProgreso.length}</span>
                </h2>

                {tareasEnProgreso.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span style={{ fontSize: '0.9rem' }}>Sin procesos activos</span>
                    </div>
                ) : (
                    tareasEnProgreso.map(tarea => (
                      <div key={tarea.id} draggable={true} onDragStart={(e) => e.dataTransfer.setData('tareaId', tarea.id.toString())} className="task-card" onClick={() => { setTareaEnVista(tarea); cargarComentarios(tarea.id); }}>
                        <h3 className="task-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                            {tarea.titulo} 
                            {tarea.nombre_grupo && <span className="badge-empresa">{tarea.nombre_grupo}</span>}
                        </h3>
                        <p className="task-desc">{tarea.descripcion}</p>
                        
                        <div style={{ fontSize: '0.8rem', marginBottom: '15px' }}>
                            {renderizarFecha(tarea.fecha_vencimiento, tarea.estado)}
                        </div>

                        <div className="task-actions task-actions-mobile" style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={(e) => { e.stopPropagation(); editarTarea(tarea); }} className="btn-action" style={{flex: 1}}>
                              <span className="desktop-only"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></span>
                              Editar
                          </button>
                          
                          <button onClick={(e) => { e.stopPropagation(); cambiarEstado(tarea.id, 'Completado'); }} className="btn-action desktop-only" style={{flex: 1}}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              Completar
                          </button>

                          <div className="mobile-only" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                              <button onClick={(e) => { e.stopPropagation(); cambiarEstado(tarea.id, 'Por Hacer'); }} className="btn-action" style={{ flex: 1, backgroundColor: 'var(--bg-body)' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); cambiarEstado(tarea.id, 'Completado'); }} className="btn-action" style={{ flex: 3, backgroundColor: 'var(--accent-green)', color: 'white', border: 'none' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                  Completar Tarea
                              </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* ================= COLUMNA COMPLETADO ================= */}
              <div className="kanban-col done" 
                   style={{ 
                       border: columnaDestino === 'Completado' ? '2px dashed var(--border-color)' : '2px solid transparent', 
                       backgroundColor: columnaDestino === 'Completado' ? 'var(--bg-body)' : 'transparent', 
                       transition: 'all 0.2s',
                       display: 'flex', 
                       flexDirection: 'column', 
                       // Solo aplicamos maxHeight si hemos expandido para que aparezca el scroll
                       maxHeight: mostrarTodasCompletadas ? '75vh' : 'auto'
                   }}
                   onDragOver={(e) => { e.preventDefault(); setColumnaDestino('Completado'); }} 
                   onDragLeave={() => setColumnaDestino(null)}
                   onDrop={(e) => manejarDrop(e, 'Completado')}
              >
                <h2 className="col-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 'none' }}>
                    <span>Completado</span>
                    <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{tareasCompletadas.length}</span>
                </h2>

                {/* Si no está expandido, ocultamos el scroll (hidden). Si se expande, lo activamos (auto) */}
                <div style={{ 
                    overflowY: mostrarTodasCompletadas ? 'auto' : 'hidden', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '15px', 
                    paddingRight: mostrarTodasCompletadas ? '5px' : '0', 
                    paddingBottom: '10px' 
                }}>
                    {tareasCompletadas.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <span style={{ fontSize: '0.9rem' }}>Esperando resolución</span>
                        </div>
                    ) : (
                        <>
                            {/* Filtramos el array: Si no está activo "mostrar todas", hacemos un .slice para coger solo 4 */}
                            {(mostrarTodasCompletadas ? tareasCompletadas : tareasCompletadas.slice(0, LIMITE_COMPLETADAS)).map(tarea => (
                              <div key={tarea.id} draggable={true} onDragStart={(e) => e.dataTransfer.setData('tareaId', tarea.id.toString())} className="task-card" style={{ opacity: 0.7, flex: 'none' }} onClick={() => { setTareaEnVista(tarea); cargarComentarios(tarea.id); }}>
                                <h3 className="task-title" style={{ textDecoration: 'line-through' }}>{tarea.titulo}</h3>
                                
                                <div style={{ fontSize: '0.8rem', marginBottom: '15px' }}>
                                    {renderizarFecha(tarea.fecha_vencimiento, tarea.estado)}
                                </div>

                                <div className="task-actions task-actions-mobile" style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={(e) => { e.stopPropagation(); setTareaEnVista(tarea); cargarComentarios(tarea.id); }} className="btn-action" style={{flex: 1}}>
                                      <span className="desktop-only"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></span>
                                      Detalles
                                  </button>
                                  
                                  <button onClick={(e) => { e.stopPropagation(); borrarTarea(tarea.id); }} className="btn-action btn-delete" style={{flex: 1}}>
                                      <span className="desktop-only"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></span>
                                      Eliminar
                                  </button>
                                  
                                  <button onClick={(e) => { e.stopPropagation(); cambiarEstado(tarea.id, 'En Progreso'); }} className="btn-action mobile-only" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                      Devolver a "En Progreso"
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* EL BOTÓN MÁGICO: Solo aparece si hay más de 4 tareas */}
                            {tareasCompletadas.length > LIMITE_COMPLETADAS && (
                                <button 
                                    onClick={() => setMostrarTodasCompletadas(!mostrarTodasCompletadas)}
                                    style={{ 
                                        width: '100%', padding: '12px', marginTop: '5px', 
                                        backgroundColor: 'transparent', border: '1px dashed var(--border-color)', 
                                        borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer',
                                        fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s', flex: 'none'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-body)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                >
                                    {mostrarTodasCompletadas 
                                        ? "↑ Ocultar tareas" 
                                        : `↓ Pulsa para mostrar más (hay ${tareasCompletadas.length - LIMITE_COMPLETADAS} más)`
                                    }
                                </button>
                            )}
                        </>
                    )}
                </div>
              </div>
            </div>
        </div>
    );
}

export default KanbanBoard;