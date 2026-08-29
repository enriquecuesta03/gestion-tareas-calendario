/*********************************************************************************
Pantalla de gestión de Equipos y Empresas (DirectorioEmpresas).
Esta vista exclusiva permite al usuario ver los grupos a los que pertenece,
revisar quiénes son los miembros y sus roles, unirse a nuevos equipos mediante
códigos de invitación, crear empresas nuevas y notificar ausencias.
Incluye controles de administración para los jefes (expulsar, ascender, degradar, borrar).
***********************************************************************************/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { Toaster } from 'react-hot-toast';

import { useTareas } from '../hooks/useTareas';
import { useKoraAI } from '../hooks/useKoraAI';

// Lee el ID del usuario directamente desde su propio token (sin verificar firma,
// solo lectura: la verificación real ya la hace el backend en cada petición).
// Así comparamos "es esta fila mi propia fila" por ID y no por nombre, que puede repetirse.
function obtenerIdDesdeToken(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
    } catch {
        return null;
    }
}

function DirectorioEmpresas({ token, nombreUsuario, onLogout, temaOscuro, setTemaOscuro }) {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://kora-api-tfg.onrender.com';
  const idUsuario = obtenerIdDesdeToken(token);

  const [menuAbierto, setMenuAbierto] = useState(false); 

  const [misGrupos, setMisGrupos] = useState([]);
  const [miembrosPorGrupo, setMiembrosPorGrupo] = useState({});
  const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');

  const [vacacionGrupoId, setVacacionGrupoId] = useState('');
  const [vacacionInicio, setVacacionInicio] = useState('');
  const [vacacionFin, setVacacionFin] = useState('');

  const { tareas, headersConAuth, notificarExito, notificarError } = useTareas(token, onLogout);
  
  const { hablando, procesando, reproducirResumen } = useKoraAI({
      token, nombreUsuario, tareas, formulariosActions: { estadoActual: {} } 
  });

  const notificacionesPendientes = tareas.filter(tarea => {
      if (tarea.estado === 'Completado' || !tarea.fecha_notificacion) return false;
      return Date.now() >= new Date(tarea.fecha_notificacion).getTime();
  });

  const cargarMisGrupos = () => {
    // primero pido la lista de equipos, y por cada uno lanzo otra petición para
    // sus miembros; con pocos equipos por usuario no compensa complicar esto
    // con un endpoint que lo devuelva todo junto
    fetch(`${API_URL}/api/grupos`, { headers: headersConAuth() })
    .then(res => res.json())
    .then(data => {
        const grupos = Array.isArray(data) ? data : [];
        setMisGrupos(grupos);
        
        grupos.forEach(grupo => {
            fetch(`${API_URL}/api/grupos/${grupo.id}/miembros`, { headers: headersConAuth() })
            .then(res => res.json())
            .then(miembros => {
                setMiembrosPorGrupo(prev => ({ ...prev, [grupo.id]: Array.isArray(miembros) ? miembros : [] }));
            }).catch(console.error);
        });
    }).catch(console.error);
  };

  useEffect(() => {
    if (token) cargarMisGrupos();
  }, [token]);

  // ==========================================
  // ACCIONES ADMINISTRATIVAS DE LA EMPRESA
  // ==========================================

  const manejarCrearGrupo = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/grupos`, {
      method: 'POST', headers: headersConAuth(), body: JSON.stringify({ nombre: nombreNuevoGrupo })
    }).then(res => res.json().then(data => ({ status: res.status, body: data }))).then(({ status, body }) => {
      if (status === 200) { notificarExito(`Empresa creada. Código: ${body.codigo}`); setNombreNuevoGrupo(''); cargarMisGrupos(); } 
      else { notificarError(body.error); }
    });
  };

  const manejarUnirseGrupo = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/grupos/unirse`, {
      method: 'POST', headers: headersConAuth(), body: JSON.stringify({ codigo: codigoInvitacion })
    }).then(res => res.json().then(data => ({ status: res.status, body: data }))).then(({ status, body }) => {
      if (status === 200) { notificarExito(body.mensaje); setCodigoInvitacion(''); cargarMisGrupos(); } 
      else { notificarError(body.error); }
    });
  };

  const manejarEliminarGrupo = (id, nombre) => {
      if (!window.confirm(`¿Seguro que quieres eliminar el equipo "${nombre}" por completo? Esta acción es irreversible.`)) return;
      fetch(`${API_URL}/api/grupos/${id}`, { method: 'DELETE', headers: headersConAuth() })
      .then(res => res.json().then(data => ({ status: res.status, body: data })))
      .then(({ status, body }) => {
          if (status === 200) { notificarExito('Equipo eliminado con éxito'); cargarMisGrupos(); }
          else { notificarError(body.error || 'Error al eliminar el equipo'); }
      }).catch(() => notificarError('Error de conexión al eliminar'));
  };

  const manejarExpulsarMiembro = (grupoId, miembroId, nombre) => {
      if (!window.confirm(`¿Seguro que quieres expulsar a ${nombre} del equipo?`)) return;
      fetch(`${API_URL}/api/grupos/${grupoId}/miembros/${miembroId}`, { method: 'DELETE', headers: headersConAuth() })
      .then(res => res.json().then(data => ({ status: res.status, body: data })))
      .then(({ status, body }) => {
          if (status === 200) { notificarExito(`${nombre} ha sido expulsado`); cargarMisGrupos(); }
          else { notificarError(body.error || 'Error al expulsar al miembro'); }
      }).catch(() => notificarError('Error de conexión al expulsar'));
  };

  // Función combinada para ascender y degradar roles
  const manejarCambiarRol = (grupoId, miembroId, nombre, nuevoRol) => {
      const accion = nuevoRol === 'jefe' ? 'ascender a Jefe a' : 'degradar a Empleado a';
      if (!window.confirm(`¿Seguro que quieres ${accion} ${nombre}?`)) return;
      
      fetch(`${API_URL}/api/grupos/${grupoId}/miembros/${miembroId}/rol`, { 
          method: 'PUT', headers: headersConAuth(), body: JSON.stringify({ rol: nuevoRol })
      })
      .then(res => res.json().then(data => ({ status: res.status, body: data })))
      .then(({ status, body }) => {
          if (status === 200) { notificarExito(`El rol de ${nombre} ha sido actualizado`); cargarMisGrupos(); }
          else { notificarError(body.error || 'Error al cambiar el rol'); }
      }).catch(() => notificarError('Error de conexión al cambiar rol'));
  };

  const manejarSalirGrupo = (id, nombre) => {
      if (!window.confirm(`¿Seguro que quieres abandonar el equipo "${nombre}"?`)) return;
      fetch(`${API_URL}/api/grupos/${id}/salir`, { method: 'POST', headers: headersConAuth() })
      .then(res => res.json().then(data => ({ status: res.status, body: data })))
      .then(({ status, body }) => {
          if (status === 200) { notificarExito('Has abandonado el equipo'); cargarMisGrupos(); }
          else { notificarError(body.error || 'Error al salir del equipo'); }
      }).catch(() => notificarError('Error de conexión al salir'));
  };

  const manejarCrearVacacion = (e) => {
      e.preventDefault();
      // las fechas vienen del input type="date" en formato YYYY-MM-DD, así que
      // comparar como strings ya da el orden cronológico correcto sin tener
      // que pasar por new Date() para esto
      if (vacacionFin < vacacionInicio) return notificarError('La fecha de fin no puede ser anterior a la de inicio');
      fetch(`${API_URL}/api/vacaciones`, {
          method: 'POST', headers: headersConAuth(), body: JSON.stringify({ grupo_id: vacacionGrupoId, fecha_inicio: vacacionInicio, fecha_fin: vacacionFin })
      })
      .then(res => res.json())
      .then(data => {
          if (data.error) { notificarError(data.error); } 
          else { notificarExito(data.mensaje || "Ausencia registrada correctamente"); setVacacionInicio(''); setVacacionFin(''); setVacacionGrupoId(''); }
      });
  };

  return (
    <div className="app-layout">
      <Toaster position="bottom-right" />
      
      <style>{`
        .native-card { background-color: var(--bg-card); border-radius: 16px; padding: 25px; border: 1px solid var(--border-color); box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 20px; width: 100%; box-sizing: border-box; }
        .native-input { width: 100%; height: 48px; padding: 0 15px; border-radius: 12px; border: 1px solid var(--border-color); background-color: var(--bg-body); color: var(--text-main); font-size: 16px; box-sizing: border-box; font-family: var(--font-main); transition: border-color 0.2s; }
        .native-input:focus { outline: none; border-color: var(--accent-green); }
        .native-btn { width: 100%; height: 48px; border-radius: 12px; background-color: var(--accent-green); color: white; border: none; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .native-btn:hover { background-color: var(--accent-green-hover); }
        .miembro-fila { display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; border-bottom: 1px solid var(--border-color); }
        .miembro-fila:last-child { border-bottom: none; }
        .btn-accion-rol { border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
        .btn-ascender { background: rgba(16, 185, 129, 0.1); color: var(--accent-green); border-color: rgba(16, 185, 129, 0.3); }
        .btn-ascender:hover { background: rgba(16, 185, 129, 0.2); }
        .btn-degradar { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
        .btn-degradar:hover { background: rgba(245, 158, 11, 0.2); }
        .btn-expulsar { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border-color: rgba(239, 68, 68, 0.3); }
        .btn-expulsar:hover { background: rgba(239, 68, 68, 0.2); }
        
        @media (max-width: 768px) {
          .main-content { overflow-x: hidden !important; width: 100vw !important; padding: 15px !important; box-sizing: border-box !important; }
          .native-card { padding: 20px !important; width: 100% !important; box-sizing: border-box !important; }
          .grid-responsive { grid-template-columns: 1fr !important; }
          .flex-responsive { flex-direction: column !important; }
          .acciones-miembro-movil { flex-direction: column !important; gap: 5px !important; align-items: flex-end !important; }
        }
      `}</style>

      <Sidebar 
          mostrarFiltro={false}
          onVerPerfil={() => navigate('/perfil')} 
          reproducirResumen={reproducirResumen}
          procesando={procesando} 
          hablando={hablando} 
          notificacionesPendientes={notificacionesPendientes} 
          onVerNotificacion={() => navigate('/dashboard/tablero')} 
          filtroVista={'todas'} 
          setFiltroVista={() => {}} 
          misGrupos={misGrupos} 
          temaOscuro={temaOscuro} 
          setTemaOscuro={setTemaOscuro}
          nombreUsuario={nombreUsuario} 
          onLogout={onLogout}
          menuAbierto={menuAbierto} 
          setMenuAbierto={setMenuAbierto}
      />

      <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setMenuAbierto(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <h1 className="mobile-logo">Kora<span>.</span></h1>
          <div style={{width: '28px'}}></div> 
      </header>

      <main className="main-content">
        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          <h2 className="section-title" style={{ fontSize: '1.5rem', borderBottom: 'none', marginBottom: '20px' }}>
            Directorio de Equipos
          </h2>

          <div className="native-card">
              <h2 className="section-title" style={{ borderBottom: 'none', marginBottom: '10px' }}>Mis Empresas</h2>
              {misGrupos.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-body)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                      <p style={{ color: 'var(--text-muted)', margin: 0 }}>No perteneces a ningún equipo operativo.</p>
                  </div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {misGrupos.map(grupo => (
                          <div key={grupo.id} style={{ backgroundColor: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
                                  <div>
                                      <strong style={{ fontSize: '1.2rem', display: 'block', color: 'var(--text-main)', marginBottom: '4px' }}>{grupo.nombre}</strong>
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Código de invitación: {grupo.codigo_invitacion}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                      <span style={{ backgroundColor: grupo.rol === 'jefe' ? 'var(--text-main)' : 'var(--accent-green)', color: 'var(--bg-card)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                          {grupo.rol}
                                      </span>
                                      
                                      {grupo.rol === 'jefe' ? (
                                          <button onClick={() => manejarEliminarGrupo(grupo.id, grupo.nombre)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '5px' }} title="Eliminar equipo de Kora">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                          </button>
                                      ) : (
                                          <button onClick={() => manejarSalirGrupo(grupo.id, grupo.nombre)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '5px' }} title="Abandonar equipo">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                          </button>
                                      )}
                                  </div>
                              </div>
                              
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Directorio de Integrantes</h4>
                              
                              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border-color)' }}>
                                  {miembrosPorGrupo[grupo.id] ? (
                                      miembrosPorGrupo[grupo.id].map(miembro => (
                                          <div key={miembro.id} className="miembro-fila flex-responsive">
                                              
                                              <div style={{ flex: 1, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                  <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '1rem', display: 'block' }}>
                                                      {miembro.nombre} 
                                                      {/* comparación por id, no por nombre (ver obtenerIdDesdeToken
                                                          al principio del archivo) para que el "(Tú)" salga en la
                                                          fila correcta aunque hubiera dos miembros con el mismo nombre */}
                                                      {miembro.id === idUsuario && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>(Tú)</span>}
                                                  </span>
                                                  <span style={{ backgroundColor: miembro.rol === 'jefe' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: miembro.rol === 'jefe' ? 'var(--accent-green)' : 'var(--text-muted)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                      {miembro.rol}
                                                  </span>
                                              </div>

                                              {grupo.rol === 'jefe' && miembro.id !== idUsuario && (
                                                  <div className="acciones-miembro-movil" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                      {miembro.rol !== 'jefe' ? (
                                                          <button onClick={() => manejarCambiarRol(grupo.id, miembro.id, miembro.nombre, 'jefe')} className="btn-accion-rol btn-ascender">
                                                              Ascender a Jefe
                                                          </button>
                                                      ) : (
                                                          <button onClick={() => manejarCambiarRol(grupo.id, miembro.id, miembro.nombre, 'empleado')} className="btn-accion-rol btn-degradar">
                                                              Degradar a Empleado
                                                          </button>
                                                      )}
                                                      <button onClick={() => manejarExpulsarMiembro(grupo.id, miembro.id, miembro.nombre)} className="btn-accion-rol btn-expulsar">
                                                          Expulsar
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                      ))
                                  ) : (
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando directorio...</span>
                                  )}
                              </div>

                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'minmax(min(100%, 250px), 1fr)', gap: '20px', marginBottom: '20px' }}>
              <div className="native-card" style={{ marginBottom: 0 }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '20px' }}>Unirse a Equipo</h3>
                  <form onSubmit={manejarUnirseGrupo}>
                      <input type="text" required placeholder="Código de invitación" value={codigoInvitacion} onChange={(e) => setCodigoInvitacion(e.target.value)} className="native-input" style={{ marginBottom: '15px' }} />
                      <button type="submit" className="native-btn" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>Unirse</button>
                  </form>
              </div>
              <div className="native-card" style={{ marginBottom: 0 }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '20px' }}>Crear Equipo</h3>
                  <form onSubmit={manejarCrearGrupo}>
                      <input type="text" required placeholder="Nombre de la empresa" value={nombreNuevoGrupo} onChange={(e) => setNombreNuevoGrupo(e.target.value)} className="native-input" style={{ marginBottom: '15px' }} />
                      <button type="submit" className="native-btn">Crear Empresa</button>
                  </form>
              </div>
          </div>

          <div className="native-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '10px' }}>Notificar Ausencia / Vacaciones</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '25px' }}>Bloquea días en el calendario para que tu equipo sepa que no estás disponible.</p>
              <form onSubmit={manejarCrearVacacion} className="flex-responsive" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500', color: 'var(--text-muted)' }}>Empresa / Equipo</label>
                      <select required value={vacacionGrupoId} onChange={(e) => setVacacionGrupoId(e.target.value)} className="native-input">
                          <option value="">Selecciona un equipo...</option>
                          {misGrupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                      </select>
                  </div>
                  <div className="flex-responsive" style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500', color: 'var(--text-muted)' }}>Desde el día</label>
                          <input type="date" required value={vacacionInicio} onChange={(e) => setVacacionInicio(e.target.value)} className="native-input" />
                      </div>
                      <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500', color: 'var(--text-muted)' }}>Hasta el día</label>
                          <input type="date" required value={vacacionFin} onChange={(e) => setVacacionFin(e.target.value)} className="native-input" />
                      </div>
                  </div>
                  <button type="submit" className="native-btn" style={{ marginTop: '10px' }}>
                      Registrar Ausencia
                  </button>
              </form>
          </div>

        </div>
      </main>
    </div>
  );
}

export default DirectorioEmpresas;