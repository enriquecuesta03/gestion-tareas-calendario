import React from 'react';

function AbsenceModal({ isOpen, vacacionEnVista, setVacacionEnVista, nombreUsuario, borrarVacacion }) {
    if (!isOpen || !vacacionEnVista) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px', width: '100%', maxWidth: '400px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Información de Ausencia</h2>
                    <button onClick={() => setVacacionEnVista(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Usuario</label>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{vacacionEnVista.usuario_nombre}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Equipo / Empresa</label>
                        <div style={{ fontSize: '1rem' }}>{vacacionEnVista.grupo_nombre}</div>
                    </div>
                </div>
                
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    {vacacionEnVista.usuario_nombre === nombreUsuario ? (
                        <button onClick={() => borrarVacacion(vacacionEnVista.id_real)} className="btn-action btn-delete" style={{ width: '100%' }}>
                            Cancelación de Ausencia
                        </button>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', margin: 0 }}>
                            La gestión de ausencias ajenas requiere permisos de administración de equipos.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AbsenceModal;