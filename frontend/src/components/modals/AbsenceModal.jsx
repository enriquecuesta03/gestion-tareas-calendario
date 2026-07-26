/*********************************************************************************
Ventana emergente de información de ausencias (AbsenceModal).
Este componente muestra un pequeño recuadro por encima de la pantalla 
cuando hacemos clic en un día de vacaciones en el calendario. 
Nos dice quién se va de vacaciones y de qué equipo. Si las vacaciones 
son nuestras, nos da la opción de cancelarlas y borrarlas del sistema.
***********************************************************************************/

import React from 'react';

function AbsenceModal({ isOpen, vacacionEnVista, setVacacionEnVista, nombreUsuario, borrarVacacion }) {
    // Si la ventana está configurada para estar cerrada o no hay datos cargados, no dibujamos nada
    if (!isOpen || !vacacionEnVista) return null;

    return (
        // Fondo oscuro y semitransparente que bloquea el resto de la página para que la ventana resalte
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* Cuadro principal blanco donde va toda la información */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px', width: '100%', maxWidth: '400px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                
                {/* Cabecera con el título y el botón de la "X" para cerrar la ventana */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Información de Ausencia</h2>
                    <button onClick={() => setVacacionEnVista(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                
                {/* Sección donde mostramos el nombre del trabajador y su equipo */}
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
                
                {/* Zona inferior de botones y avisos */}
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    
                    {/* Comprobamos si el usuario actual es el dueño de esas vacaciones */}
                    {vacacionEnVista.usuario_nombre === nombreUsuario ? (
                        // Si son sus propias vacaciones, le enseñamos el botón para poder cancelarlas
                        <button onClick={() => borrarVacacion(vacacionEnVista.id_real)} className="btn-action btn-delete" style={{ width: '100%' }}>
                            Cancelación de Ausencia
                        </button>
                    ) : (
                        // Si son las vacaciones de un compañero, no le dejamos borrarlas y le mostramos este aviso
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