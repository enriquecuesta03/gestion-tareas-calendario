/*********************************************************************************
Pantalla de gestión de perfil y cuenta (Perfil).
Aquí el usuario puede ver su información personal y cambiar su contraseña.
***********************************************************************************/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

import { useTareas } from '../hooks/useTareas';
import { useKoraAI } from '../hooks/useKoraAI';

import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import es from 'date-fns/locale/es';

registerLocale('es', es);

function Perfil({ token, nombreUsuario, onLogout, temaOscuro, setTemaOscuro }) {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'https://kora-api-tfg.onrender.com';

  const [datosUsuario, setDatosUsuario] = useState({ nombre: '', email: '', fecha_nac_limpia: '' });
  const [cargando, setCargando] = useState(true);
  
  const [vistaActiva, setVistaActiva] = useState('info'); 
  const [menuAbierto, setMenuAbierto] = useState(false); 
  
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFechaNac, setEditFechaNac] = useState('');
  
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const { tareas, misGrupos } = useTareas(token, onLogout);
  
  const { hablando, procesando, reproducirResumen } = useKoraAI({
      token, nombreUsuario, tareas, formulariosActions: { estadoActual: {} } 
  });

  const notificacionesPendientes = tareas.filter(tarea => {
      if (tarea.estado === 'Completado' || !tarea.fecha_notificacion) return false;
      return Date.now() >= new Date(tarea.fecha_notificacion).getTime();
  });

  useEffect(() => {
    fetch(`${API_URL}/api/perfil`, { headers: { 'Authorization': `Bearer ${token}` }})
    .then(res => res.json())
    .then(data => {
      setDatosUsuario(data); setEditNombre(data.nombre); setEditEmail(data.email); setEditFechaNac(data.fecha_nac_limpia); setCargando(false);
    }).catch(() => setCargando(false));
  }, [token, API_URL]);

  const manejarActualizarPerfil = (e) => {
    e.preventDefault(); setMensaje({ texto: '', tipo: '' });
    fetch(`${API_URL}/api/perfil`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nombre: editNombre, email: editEmail, fecha_nacimiento: editFechaNac })
    }).then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200) {
        setMensaje({ texto: 'Datos actualizados correctamente.', tipo: 'exito' });
        setDatosUsuario({ nombre: body.nombre, email: editEmail, fecha_nac_limpia: body.fecha_nacimiento });
        localStorage.setItem('token', body.token); 
        localStorage.setItem('nombreUsuario', body.nombre);
        localStorage.setItem('fechaNacUsuario', body.fecha_nacimiento);
        setTimeout(() => window.location.reload(), 1500);
      } else { setMensaje({ texto: body.error, tipo: 'error' }); }
    });
  };

  const manejarCambioPassword = (e) => {
    e.preventDefault(); setMensaje({ texto: '', tipo: '' });
    if (nuevaPassword !== confirmarPassword) return setMensaje({ texto: 'Las contraseñas no coinciden', tipo: 'error' });
    
    fetch(`${API_URL}/api/cambiar-password`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ passwordActual, nuevaPassword })
    }).then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200) {
        setMensaje({ texto: 'Contraseña actualizada.', tipo: 'exito' });
        setPasswordActual(''); setNuevaPassword(''); setConfirmarPassword('');
      } else { setMensaje({ texto: body.error, tipo: 'error' }); }
    });
  };

  if (cargando) return <div className="app-layout"><main className="main-content">Cargando...</main></div>;

  return (
    <div className="app-layout">
      
      <style>{`
        .perfil-tab-btn { background: transparent; border: none; text-align: left; padding: 12px 16px; border-radius: 8px; color: var(--text-muted); font-weight: 500; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; font-family: var(--font-main); display: flex; align-items: center; gap: 10px; }
        .perfil-tab-btn:hover { background-color: var(--bg-body); color: var(--text-main); }
        .perfil-tab-btn.active { background-color: var(--bg-card); color: var(--text-main); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .fade-in-section { animation: fadeInPerfil 0.3s ease-out forwards; }
        @keyframes fadeInPerfil { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .native-card { background-color: var(--bg-card); border-radius: 16px; padding: 25px; border: 1px solid var(--border-color); box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 20px; width: 100%; box-sizing: border-box; }
        .native-input { width: 100%; height: 48px; padding: 0 15px; border-radius: 12px; border: 1px solid var(--border-color); background-color: var(--bg-body); color: var(--text-main); font-size: 16px; box-sizing: border-box; font-family: var(--font-main); transition: border-color 0.2s; }
        .native-input:focus { outline: none; border-color: var(--accent-green); }
        .native-btn { width: 100%; height: 48px; border-radius: 12px; background-color: var(--accent-green); color: white; border: none; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .native-btn:hover { background-color: var(--accent-green-hover); }

        .react-datepicker-wrapper { width: 100%; display: block; }
        .react-datepicker__input-container { display: block; width: 100%; }
        .react-datepicker { font-family: var(--font-main); border: 1px solid var(--border-color); }
        .react-datepicker__header { background-color: var(--bg-body); border-bottom: 1px solid var(--border-color); }
        .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background-color: var(--accent-green) !important; color: white !important; }

        @media (max-width: 768px) {
          .main-content { overflow-x: hidden !important; width: 100vw !important; padding: 15px !important; box-sizing: border-box !important; }
          .contenedor-perfil { flex-direction: column !important; gap: 15px !important; width: 100% !important; margin: 0 !important; box-sizing: border-box !important; }
          .menu-perfil-movil { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; overflow-x: auto !important; padding-bottom: 10px !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none; width: 100% !important; margin: 0 !important; gap: 10px !important; box-sizing: border-box !important; }
          .menu-perfil-movil::-webkit-scrollbar { display: none; }
          .menu-perfil-movil::after { content: ''; flex: 0 0 5px; }
          .perfil-tab-btn { flex: 0 0 auto !important; white-space: nowrap !important; text-align: center !important; border-radius: 24px !important; padding: 10px 20px !important; background-color: var(--bg-card) !important; border: 1px solid var(--border-color) !important; box-shadow: 0 2px 5px rgba(0,0,0,0.02) !important; }
          .perfil-tab-btn.active { background-color: var(--text-main) !important; color: var(--bg-card) !important; border-color: var(--text-main) !important; }
          .panel-contenido-perfil { min-width: 0 !important; width: 100% !important; padding: 0 !important; background: transparent !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
          .native-card { padding: 20px !important; width: 100% !important; box-sizing: border-box !important; overflow: hidden; }
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
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
          </button>
          <h1 className="mobile-logo">Kora<span>.</span></h1>
          <div style={{width: '28px'}}></div> 
      </header>

      <main className="main-content">
        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          <h2 className="section-title" style={{ fontSize: '1.5rem', borderBottom: 'none', marginBottom: '10px' }}>
            Ajustes de Cuenta
          </h2>

          <div className="contenedor-perfil" style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
            
            <div className="menu-perfil-movil" style={{ flex: '1', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              <button onClick={() => {setVistaActiva('info'); setMensaje({texto:'', tipo:''})}} className={`perfil-tab-btn ${vistaActiva === 'info' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Información
              </button>
              
              <button onClick={() => {setVistaActiva('editar'); setMensaje({texto:'', tipo:''})}} className={`perfil-tab-btn ${vistaActiva === 'editar' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Editar Datos
              </button>
              
              <button onClick={() => {setVistaActiva('password'); setMensaje({texto:'', tipo:''})}} className={`perfil-tab-btn ${vistaActiva === 'password' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Seguridad
              </button>

            </div>

            <div className="panel-contenido-perfil fade-in-section" key={vistaActiva} style={{ flex: '3', minWidth: '0', width: '100%', backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
                
                {mensaje.texto && (
                    <div style={{ padding: '15px', marginBottom: '25px', borderRadius: '12px', backgroundColor: mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: mensaje.tipo === 'error' ? 'var(--danger-color)' : 'var(--accent-green)', fontWeight: '500', border: `1px solid ${mensaje.tipo === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {mensaje.texto}
                    </div>
                )}

                {vistaActiva === 'info' && (
                  <div className="native-card">
                    <h2 className="section-title" style={{ borderBottom: 'none', marginBottom: '25px' }}>Perfil del Usuario</h2>
                    
                    <div className="flex-responsive" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '25px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ width: '70px', height: '70px', minWidth: '70px', borderRadius: '35px', backgroundColor: 'var(--text-main)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        {datosUsuario.nombre ? datosUsuario.nombre.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: 'var(--text-main)' }}>{datosUsuario.nombre}</h3>
                        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>Cuenta Activa</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div><label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Correo Electrónico</label><div style={{ fontWeight: '500', fontSize: '1.1rem', wordBreak: 'break-word' }}>{datosUsuario.email}</div></div>
                      <div><label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Fecha de Nacimiento</label><div style={{ fontWeight: '500', fontSize: '1.1rem' }}>{datosUsuario.fecha_nac_limpia}</div></div>
                    </div>
                  </div>
                )}

                {vistaActiva === 'editar' && (
                  <div className="native-card">
                    <h2 className="section-title">Actualizar Datos</h2>
                    <form onSubmit={manejarActualizarPerfil}>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Nombre completo</label>
                        <input type="text" required value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="native-input" />
                      </div>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Correo electrónico</label>
                        <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="native-input" />
                      </div>
                      <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Fecha de nacimiento</label>
                        <DatePicker
                            selected={editFechaNac ? new Date(`${editFechaNac}T00:00:00`) : null}
                            onChange={(date) => {
                                if (date) {
                                    const dia = String(date.getDate()).padStart(2, '0');
                                    const mes = String(date.getMonth() + 1).padStart(2, '0');
                                    setEditFechaNac(`${date.getFullYear()}-${mes}-${dia}`);
                                } else {
                                    setEditFechaNac('');
                                }
                            }}
                            dateFormat="dd/MM/yyyy"
                            locale="es"
                            placeholderText="Día/Mes/Año"
                            className="native-input"
                            required
                        />
                      </div>
                      <button type="submit" className="native-btn">
                         Guardar Cambios
                      </button>
                    </form>
                  </div>
                )}

                {vistaActiva === 'password' && (
                  <div className="native-card">
                    <h2 className="section-title">Seguridad</h2>
                    <form onSubmit={manejarCambioPassword}>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Contraseña actual</label>
                        <input type="password" required value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className="native-input" />
                      </div>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Nueva contraseña</label>
                        <input type="password" required value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} className="native-input" />
                      </div>
                      <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Confirmar nueva contraseña</label>
                        <input type="password" required value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)} className="native-input" />
                      </div>
                      <button type="submit" className="native-btn" style={{ backgroundColor: 'var(--text-main)' }}>
                        Actualizar Contraseña
                      </button>
                    </form>
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Perfil;