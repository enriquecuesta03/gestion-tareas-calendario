/*********************************************************************************
Menú lateral de navegación (Sidebar).
Esta es la barra que aparece a la izquierda de la pantalla. Contiene los enlaces 
para moverse entre el tablero, las estadísticas y el perfil. También incluye los 
botones para el resumen por voz, las alertas, el filtro de empresas, el cambio 
de tema (claro/oscuro) y la opción de cerrar sesión.
***********************************************************************************/

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Importamos los estilos de diseño específicos para esta barra lateral
import '../../assets/styles/DashboardLayout.css';

function Sidebar({ 
    onVerPerfil, 
    reproducirResumen, 
    procesando, 
    hablando, 
    notificacionesPendientes, 
    onVerNotificacion, 
    filtroVista, 
    setFiltroVista, 
    misGrupos, 
    temaOscuro, 
    setTemaOscuro, 
    nombreUsuario, 
    onLogout,
    menuAbierto,       
    setMenuAbierto,
    mostrarFiltro = true
}) {
    // Controlamos si la caja de notificaciones está abierta o cerrada
    const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
    
    // Herramientas para movernos de una pantalla a otra y saber dónde estamos
    const navigate = useNavigate();
    const location = useLocation();

    // Memoria interna para no repetir la misma notificación al sistema operativo
    const tareasYaNotificadas = useRef(new Set());

    // =======================================================
    // MOTOR DE NOTIFICACIONES NATIVAS DEL SISTEMA
    // =======================================================
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            notificacionesPendientes.forEach((tarea, index) => {
                
                // Creamos una clave única que une el ID de la tarea y su hora exacta de aviso
                const tiempoAlarma = new Date(tarea.fecha_notificacion).getTime();
                const claveNotificacion = 'alerta_enviada_' + tarea.id + '_' + tiempoAlarma;
                
                // Comprobamos en el almacenamiento global del navegador si ESTA alerta ya saltó
                if (!localStorage.getItem(claveNotificacion)) {
                    
                    let textoCaducidad = 'Sin fecha límite';
                    if (tarea.fecha_vencimiento) {
                        textoCaducidad = new Date(tarea.fecha_vencimiento).toLocaleString('es-ES', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                        });
                    }

                    // Retrasamos cada notificación 1.5 segundos (1500ms * posición)
                    // para que el sistema operativo no las agrupe ni las borre por salir a la vez.
                    setTimeout(() => {
                        const notificacion = new Notification('Tarea por hacer', {
                            body: tarea.titulo + '\nCaduca el: ' + textoCaducidad,
                            icon: '/favicon.png',
                            requireInteraction: true 
                        });

                        notificacion.onclick = () => {
                            window.focus(); 
                            onVerNotificacion(tarea);
                        };
                    }, index * 1500);

                    // Guardamos la clave en el navegador para que ninguna otra pestaña la repita
                    localStorage.setItem(claveNotificacion, 'true');
                }
            });
        }
    }, [notificacionesPendientes, onVerNotificacion]);
    // =======================================================

    // Función para saber en qué pantalla estamos y poder marcar el botón correspondiente
    const isActive = (path) => location.pathname.includes(path);

    return (
        <>
            {/* Fondo oscuro que aparece en móviles cuando el menú está abierto. Si haces clic, se cierra */}
            <div 
                className={`sidebar-overlay ${menuAbierto ? 'open' : ''}`} 
                onClick={() => setMenuAbierto(false)}
            ></div>

            <aside className={`sidebar ${menuAbierto ? 'open' : ''}`}>
                
                {/* Cabecera del menú con el nombre de la aplicación y el botón para cerrarlo en móviles */}
                <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div className="sidebar-brand" style={{ fontSize: '1.8rem', letterSpacing: '-1px', margin: 0, border: 'none' }}>
                        Kora<span style={{ color: 'var(--accent-green)' }}>.</span>
                    </div>
                    <button className="close-sidebar-btn" onClick={() => setMenuAbierto(false)}>
                        &times;
                    </button>
                </div>
                
                {/* Zona con barra de desplazamiento para los enlaces principales */}
                <div className="sidebar-scroll-area">
                    <nav className="sidebar-nav">
                        {/* Botón para ir al Tablero */}
                        <button 
                            className={isActive('/dashboard/tablero') ? 'active' : ''} 
                            onClick={() => { navigate('/dashboard/tablero'); setMenuAbierto(false); }} 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="15" y1="3" x2="15" y2="21"></line>
                            </svg>
                            Tablero Operativo
                        </button>
                        
                        {/* Botón para ir a los Gráficos */}
                        <button 
                            className={isActive('/dashboard/metricas') ? 'active' : ''} 
                            onClick={() => { navigate('/dashboard/metricas'); setMenuAbierto(false); }} 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                                <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                            </svg>
                            Análisis y Métricas
                        </button>
                        
                        {/* Botón para ir al Perfil */}
                        <button 
                            className={isActive('/perfil') ? 'active' : ''}
                            onClick={() => { onVerPerfil(); setMenuAbierto(false); }} 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Gestión de Cuenta
                        </button>

                        {/* Botón especial para pedirle el resumen del día a la Inteligencia Artificial */}
                        <div style={{ marginTop: '10px' }}>
                            <button 
                                onClick={reproducirResumen} 
                                disabled={procesando} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    background: hablando ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)', 
                                    border: `1px solid ${hablando ? 'var(--accent-green)' : 'var(--border-color)'}`, 
                                    color: hablando ? 'var(--accent-green)' : (procesando ? 'var(--text-muted)' : 'var(--text-main)'), 
                                    cursor: procesando ? 'wait' : 'pointer', 
                                    width: '100%', 
                                    padding: '12px 15px', 
                                    borderRadius: '8px', 
                                    transition: 'all 0.3s', 
                                    fontWeight: '500', 
                                    fontSize: '0.95rem' 
                                }}
                            >
                                {/* Cambiamos el texto y el icono dependiendo de si está cargando, hablando o en reposo */}
                                {procesando ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 22h14"></path>
                                            <path d="M5 2h14"></path>
                                            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                                            <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
                                        </svg> 
                                        Procesando...
                                    </>
                                ) : hablando ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="6" y="4" width="4" height="16"></rect>
                                            <rect x="14" y="4" width="4" height="16"></rect>
                                        </svg> 
                                        Interrumpir
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                        </svg> 
                                        Reporte diario
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Botón para ver las notificaciones de tareas pendientes */}
                        <div style={{ position: 'relative', marginTop: '10px' }}>
                            <button 
                                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'var(--text-main)', 
                                    cursor: 'pointer', 
                                    width: '100%', 
                                    padding: '12px 15px', 
                                    borderRadius: '8px', 
                                    backgroundColor: mostrarNotificaciones ? 'var(--bg-body)' : 'transparent', 
                                    transition: 'background 0.2s' 
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: '500' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                                    </svg>
                                    Alertas
                                </div>
                                {/* Si hay notificaciones, mostramos un pequeño globo rojo con la cantidad */}
                                {notificacionesPendientes.length > 0 && (
                                    <span style={{ 
                                        background: 'var(--danger-color)', 
                                        color: 'white', 
                                        borderRadius: '50%', 
                                        width: '22px', 
                                        height: '22px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 'bold' 
                                    }}>
                                        {notificacionesPendientes.length}
                                    </span>
                                )}
                            </button>
                            
                            {/* Caja desplegable con la lista de notificaciones */}
                            {mostrarNotificaciones && (
                                <div style={{ position: 'absolute', top: '100%', left: '10px', width: '250px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', zIndex: 100 }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-main)' }}>
                                        Notificaciones
                                    </h4>
                                    {notificacionesPendientes.length === 0 ? (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>Sin alertas.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                            {notificacionesPendientes.map(t => (
                                                <div 
                                                    key={t.id} 
                                                    style={{ fontSize: '0.85rem', padding: '10px', background: 'var(--bg-body)', borderRadius: '6px', cursor: 'pointer', borderLeft: '3px solid var(--danger-color)' }} 
                                                    onClick={() => { onVerNotificacion(t); setMostrarNotificaciones(false); setMenuAbierto(false); }}
                                                >
                                                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>{t.titulo}</strong>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                        Venció: {new Date(t.fecha_notificacion).toLocaleString('es-ES', { hour: '2-digit', minute:'2-digit' })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </nav>
                    
                    {/* Condición para mostrar u ocultar el filtro de grupos según la pantalla */}
                    {mostrarFiltro && (
                        <div style={{ padding: '0 20px', marginTop: '20px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                                Filtro
                            </label>
                            <select 
                                value={filtroVista} 
                                onChange={(e) => { setFiltroVista(e.target.value); setMenuAbierto(false); }} 
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', fontFamily: 'var(--font-main)' }}
                            >
                                <option value="todas">Global</option>
                                <option value="personal">Personal</option>
                                {misGrupos && misGrupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                
                {/* Zona fija en la parte inferior de la barra lateral */}
                <div className="sidebar-footer-fixed">
                    {/* Botón para cambiar entre el tema oscuro y el claro */}
                    <div className="theme-switch-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Tema Oscuro</span>
                        <label className="theme-switch">
                            <input type="checkbox" checked={temaOscuro} onChange={() => setTemaOscuro(!temaOscuro)} />
                            <span className="theme-slider"></span>
                        </label>
                    </div>
                    
                    {/* Información del usuario con la inicial de su nombre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--text-main)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                            {nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {nombreUsuario}
                        </span>
                    </div>

                    {/* Botón para cerrar sesión */}
                    <div style={{ padding: '0 20px' }}>
                        <button 
                            onClick={onLogout} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px', 
                                width: '100%', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                border: '1px solid var(--danger-color)', 
                                backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                                color: 'var(--danger-color)', 
                                cursor: 'pointer', 
                                fontWeight: '600', 
                                fontSize: '0.95rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;