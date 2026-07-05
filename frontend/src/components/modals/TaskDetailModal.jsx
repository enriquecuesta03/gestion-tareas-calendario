import React from 'react';

function TaskDetailModal({
    isOpen, tareaEnVista, setTareaEnVista, editarTarea, comentarios, nombreUsuario,
    comentarioEnEdicionId, iniciarEdicionComentario, guardarEdicionComentario,
    textoComentarioEditado, setTextoComentarioEditado, setComentarioEnEdicionId,
    enviarComentario, nuevoComentario, setNuevoComentario
}) {
    if (!isOpen || !tareaEnVista) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px', width: '100%', maxWidth: '600px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)' }}>Detalles de la Tarea</h2>
                    <button onClick={() => setTareaEnVista(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: 'var(--text-main)', marginBottom: '30px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Título</label>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600', marginTop: '4px' }}>
                                {tareaEnVista.titulo} 
                                {tareaEnVista.nombre_grupo && <span className="badge-empresa" style={{ marginLeft: '10px' }}>{tareaEnVista.nombre_grupo}</span>}
                            </div>
                        </div>
                        {tareaEnVista.descripcion && (
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Descripción</label>
                                <div style={{ marginTop: '4px', lineHeight: '1.5' }}>{tareaEnVista.descripcion}</div>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '30px', marginTop: '5px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Estado</label>
                                <div style={{ marginTop: '4px' }}>{tareaEnVista.estado}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Vencimiento</label>
                                <div style={{ marginTop: '4px' }}>
                                    {tareaEnVista.fecha_vencimiento ? new Date(tareaEnVista.fecha_vencimiento).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin fecha'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '15px' }}>Actividad y Notas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {comentarios.length === 0 ? (
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay comentarios todavía.</p> 
                            ) : (
                                comentarios.map(c => (
                                    <div key={c.id} style={{ backgroundColor: 'var(--bg-body)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <div>
                                                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{c.autor}</span>
                                                {c.autor === nombreUsuario && comentarioEnEdicionId !== c.id && (
                                                    <button onClick={() => iniciarEdicionComentario(c)} style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '10px', padding: 0, fontWeight: '600' }}>Editar</button>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.fecha_creacion).toLocaleString()}</span>
                                        </div>
                                        {comentarioEnEdicionId === c.id ? (
                                            <form onSubmit={(e) => guardarEdicionComentario(e, c.id)} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <input type="text" value={textoComentarioEditado} onChange={(e) => setTextoComentarioEditado(e.target.value)} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }} autoFocus />
                                                <button type="submit" className="btn-add" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Guardar</button>
                                                <button type="button" onClick={() => setComentarioEnEdicionId(null)} className="btn-action" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Cancelar</button>
                                            </form>
                                        ) : (
                                            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{c.texto}</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <form onSubmit={enviarComentario} style={{ display: 'flex', gap: '10px' }}>
                            <input type="text" required placeholder="Escribe una nota o comentario..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }} />
                            <button type="submit" className="btn-add" style={{ padding: '10px 20px' }}>Enviar</button>
                        </form>
                    </div>
                </div>
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <button onClick={() => { setTareaEnVista(null); editarTarea(tareaEnVista); }} className="btn-action" style={{ width: '100%', fontWeight: '600' }}>Editar Tarea</button>
                </div>
            </div>
        </div>
    );
}

export default TaskDetailModal;