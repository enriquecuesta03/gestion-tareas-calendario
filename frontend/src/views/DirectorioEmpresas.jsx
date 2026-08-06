/*********************************************************************************
Pantalla de gestión de Equipos y Empresas (DirectorioEmpresas).
Esta vista exclusiva permite al usuario ver los grupos a los que pertenece,
revisar quiénes son los miembros y sus roles, unirse a nuevos equipos mediante
códigos de invitación, crear empresas nuevas y notificar ausencias.
***********************************************************************************/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

import { useTareas } from '../hooks/useTareas';
import { useKoraAI } from '../hooks/useKoraAI';

function DirectorioEmpresas({ token, nombreUsuario, onLogout, temaOscuro, setTemaOscuro }) {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://kora-api-tfg.onrender.com';

  const [menuAbierto, setMenuAbierto] = useState(false); 
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Variables para la gestión de las empresas y grupos
  const [misGrupos, setMisGrupos] = useState([]);
  const [miembrosPorGrupo, setMiembrosPorGrupo] = useState({});
  const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');

  // Variables para registrar cuándo nos vamos de vacaciones
  const [vacacionGrupoId, setVacacionGrupoId] = useState('');
  const [vacacionInicio, setVacacionInicio] = useState('');
  const [vacacionFin, setVacacionFin] = useState('');

  // ==========================================
  // HERRAMIENTAS Y ASISTENTE
  // ==========================================
  const { tareas, headersConAuth } = useTareas(token, onLogout);
  
  const { hablando, procesando, reproducirResumen } = useKoraAI({
      token, nombreUsuario, tareas, formulariosActions: { estadoActual: {} } 
  });

  const notificacionesPendientes = tareas.filter(tarea => {
      if (tarea.estado === 'Completado' || !tarea.fecha_notificacion) return false;
      return Date.now() >= new Date(tarea.fecha_notificacion).getTime();
  });
  // ==========================================

  // Función para pedirle al servidor las empresas y, a continuación, los miembros de cada una
  const cargarMisGrupos = () => {
    fetch(`${API_URL}/api/grupos`, { headers: headersConAuth() })
    .then(res => res.json())
    .then(data => {
        const grupos = Array.isArray(data) ? data : [];
        setMisGrupos(grupos);
        
        // Una vez tenemos los grupos, pedimos los miembros de cada uno
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

  const manejarCrearGrupo = (e) => {
    e.preventDefault(); setMensaje({ texto: '', tipo: '' });
    fetch(`${API_URL}/api/grupos`, {
      method: 'POST', headers: headersConAuth(), body: JSON.stringify({ nombre: nombreNuevoGrupo })
    }).then(res => res.json().then(data => ({ status: res.status, body: data }))).then(({ status, body }) => {
      if (status === 200) { setMensaje({ texto: `Empresa creada. Código: ${body.codigo}`, tipo: 'exito' }); setNombreNuevoGrupo(''); cargarMisGrupos(); } 
      else { setMensaje({ texto: body.error, tipo: 'error' }); }
    });
  };

  const manejarUnirseGrupo = (e) => {
    e.preventDefault(); setMensaje({ texto: '', tipo: '' });
    fetch(`${API_URL}/api/grupos/unirse`, {
      method: 'POST', headers: headersConAuth(), body: JSON.stringify({ codigo: codigoInvitacion })
    }).then(res => res.json().then(data => ({ status: res.status, body: data }))).then(({ status, body }) => {
      if (status === 200) { setMensaje({ texto: body.mensaje, tipo: 'exito' }); setCodigoInvitacion(''); cargarMisGrupos(); } 
      else { setMensaje({ texto: body.error, tipo: 'error' }); }
    });
  };

  const manejarCrearVacacion = (e) => {
      e.preventDefault(); setMensaje({ texto: '', tipo: '' });
      if (vacacionFin < vacacionInicio) return setMensaje({ texto: 'La fecha de fin no puede ser anterior a la de inicio', tipo: 'error' });

      fetch(`${API_URL}/api/vacaciones`, {
          method: 'POST',
          headers: headersConAuth(),
          body: JSON.stringify({ grupo_id: vacacionGrupoId, fecha_inicio: vacacionInicio, fecha_fin: vacacionFin })
      })
      .then(res => res.json())
      .then(data => {
          if(data.error) setMensaje({texto: data.error, tipo: 'error'});
          else {
              setMensaje({texto: data.mensaje, tipo: 'exito'});
              setVacacionInicio(''); setVacacionFin(''); setVacacionGrupoId('');
          }
      });
  };

  return (
    <div className="app-layout">
      
      <style>{`
        .native-card { background-color: var(--bg-card); border-radius: 16px; padding: 25px; border: 1px solid var(--border-color); box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 20px; width: 100%; box-sizing: border-box; }
        .native-input { width: 100%; height: 48px; padding: 0 15px; border-radius: 12px; border: 1px solid var(--border-color); background-color: var(--bg-body); color: var(--text-main); font-size: 16px; box-sizing: border-box; font-family: var(--font-main); transition: border-color 0.2s; }
        .native-input:focus { outline: none; border-color: var(--accent-green); }
        .native-btn { width: 100%; height: 48px; border-radius: 12px; background-color: var(--accent-green); color: white; border: none; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .native-btn:hover { background-color: var(--accent-green-hover); }
        .miembro-fila { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-color); }
        .miembro-fila:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .main-content { overflow-x: hidden !important; width: 100vw !important; padding: 15px !important; box-sizing: border-box !important; }
          .native-card { padding: 20px !important; width: 100% !important; box-sizing: border-box !important; }
          .grid-responsive { grid-template-columns: 1fr !important; }
          .flex-responsive { flex-direction: column !important; }
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

          {mensaje.texto && (
              <div style={{ padding: '15px', marginBottom: '25px', borderRadius: '12px', backgroundColor: mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: mensaje.tipo === 'error' ? 'var(--danger-color)' : 'var(--accent-green)', fontWeight: '500', border: `1px solid ${mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {mensaje.texto}
              </div>
          )}

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
                                  <span style={{ backgroundColor: grupo.rol === 'jefe' ? 'var(--text-main)' : 'var(--accent-green)', color: 'var(--bg-card)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                      {grupo.rol}
                                  </span>
                              </div>
                              
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Miembros del equipo</h4>
                              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border-color)' }}>
                                  {miembrosPorGrupo[grupo.id] ? (
                                      miembrosPorGrupo[grupo.id].map(miembro => (
                                          <div key={miembro.id} className="miembro-fila">
                                              <span style={{ color: 'var(--text-main)', fontWeight: '500', fontSize: '0.95rem' }}>{miembro.nombre}</span>
                                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{miembro.rol}</span>
                                          </div>
                                      ))
                                  ) : (
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando miembros...</span>
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