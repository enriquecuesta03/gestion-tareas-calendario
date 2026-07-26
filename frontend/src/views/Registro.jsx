/*********************************************************************************
Pantalla de registro de nuevos usuarios (Registro).
Aquí es donde los usuarios nuevos crean su cuenta rellenando sus datos 
personales. Al igual que en la pantalla de inicio de sesión, permite 
registrarse de forma tradicional o utilizando una cuenta existente 
de Google o GitHub para que sea mucho más rápido.
***********************************************************************************/

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'; 

// Claves de identificación para poder usar los sistemas de Google y GitHub
const GOOGLE_CLIENT_ID = '374057828390-89sst7497o9mu099of83n5oluabu5rvp.apps.googleusercontent.com';
const GITHUB_CLIENT_ID = 'Ov23liHuJKItfZMT9Qks';

// Dirección de nuestro servidor para saber a dónde enviar los datos
const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.54:3000';

function Registro({ onLogin }) {
  const navigate = useNavigate();
  
  // Guardamos los datos que el usuario va escribiendo en las casillas
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  
  // Controlamos si mostramos un mensaje de error o de éxito
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  // Variables especiales por si el usuario se registra con Google y necesitamos pedirle su fecha de nacimiento
  const [oauthProvider, setOauthProvider] = useState(''); 
  const [oauthTokenTemp, setOauthTokenTemp] = useState('');
  const [oauthNeedsBirthday, setOauthNeedsBirthday] = useState(false);
  const [oauthNombreTemp, setOauthNombreTemp] = useState('');
  const [authFechaNac, setAuthFechaNac] = useState('');

  // Función para registrarnos con el formulario tradicional de correo y contraseña
  const manejarRegistro = async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue sola
    setError('');
    try {
      // Enviamos todos los datos al servidor
      const respuesta = await fetch(`${API_URL}/api/registro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, fecha_nacimiento: fechaNacimiento })
      });
      const data = await respuesta.json();
      
      if (respuesta.ok) {
        // Si todo va bien, mostramos el mensaje verde y le mandamos a la pantalla de entrar
        setExito(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Error al registrarse');
      }
    } catch (err) { setError('Error de conexión'); }
  };

  // Función que se activa cuando Google nos confirma los datos del usuario
  const manejarGoogleSuccess = (credentialResponse) => {
    setError('');
    fetch(`${API_URL}/api/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credentialResponse.credential })
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      // Si el servidor nos devuelve un código 206, significa que Google no nos ha dado la fecha de nacimiento
      if (status === 206) {
        setOauthTokenTemp(credentialResponse.credential);
        setOauthNombreTemp(body.nombre);
        setOauthProvider('google');
        // Activamos esta opción para mostrarle la pantalla extra pidiendo la fecha
        setOauthNeedsBirthday(true);
      } else if (status === 200) {
        // Si ya teníamos todos los datos de antes, le dejamos entrar directamente
        onLogin(body);
      } else {
        setError(body.error || 'Error con Google');
      }
    }).catch(() => setError('Error de conexión'));
  };

  // Función para terminar el registro si faltaba la fecha de nacimiento al usar Google
  const manejarRegistroOauthCompletado = (e) => {
    e.preventDefault();
    setError('');
    fetch(`${API_URL}/api/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: oauthTokenTemp, fecha_nacimiento: authFechaNac })
    }).then(res => res.json().then(data => ({ status: res.status, body: data })))
      .then(({ status, body }) => {
      if (status === 200) onLogin(body);
      else setError(body.error || 'Error al completar registro');
    }).catch(() => setError('Error de conexión'));
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-body)', fontFamily: 'var(--font-main)' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '40px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', margin: '20px', boxSizing: 'border-box' }}>
          
          {/* Título de la aplicación */}
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-main)' }}>Kora<span style={{ color: 'var(--accent-green)' }}>.</span></span>
          </div>

          {/* Mensajes de aviso (rojo para errores, verde para cuando todo sale bien) */}
          {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
          {exito && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>¡Registro completado! Redirigiendo...</div>}

          {/* Si el usuario ha usado Google pero nos falta su fecha, le enseñamos esta pantalla */}
          {oauthNeedsBirthday ? (
              <>
                  <h2 style={{ textAlign: 'center', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '600', marginBottom: '10px' }}>Completa tu perfil</h2>
                  <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '25px' }}>Hola <strong>{oauthNombreTemp}</strong>, ya casi estamos.</p>
                  <form onSubmit={manejarRegistroOauthCompletado} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <input type="date" required value={authFechaNac} onChange={(e) => setAuthFechaNac(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
                      <button type="submit" className="btn-add" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>Finalizar Registro</button>
                  </form>
              </>
          ) : (
              /* Si es un registro normal, le enseñamos el formulario completo de toda la vida */
              <>
                  <h2 style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: '500', marginBottom: '30px', marginTop: 0 }}>Crea tu cuenta de equipo</h2>
                  <form onSubmit={manejarRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <input type="text" required placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
                      <input type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
                      <input type="password" required placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
                      <input type="date" required value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
                      <button type="submit" className="btn-add" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>Crear Cuenta</button>
                  </form>

                  {/* Línea separadora */}
                  <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      <span style={{ padding: '0 10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>O continuar con</span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                  </div>

                  {/* Botones para hacer el registro rápido usando Google o GitHub */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                        <div style={{ width: '100%', height: '40px', overflow: 'hidden', borderRadius: '4px', display: 'flex', justifyContent: 'center' }}>
                            <GoogleLogin onSuccess={manejarGoogleSuccess} onError={() => setError('Error al conectar con Google')} width="340" text="signup_with" />
                        </div>
                      </GoogleOAuthProvider>

                      <button type="button" onClick={() => window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`}
                          style={{ width: '100%', height: '40px', borderRadius: '4px', backgroundColor: '#24292e', border: 'none', color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxSizing: 'border-box' }}>
                          <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" alt="GitHub" style={{ width: '18px', filter: 'invert(1)' }} />
                          Registrarse con GitHub
                      </button>
                  </div>

                  {/* Enlace para volver a la pantalla de iniciar sesión si el usuario ya tenía cuenta */}
                  <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '30px' }}>¿Ya tienes cuenta? <span onClick={() => navigate('/login')} style={{ color: 'var(--accent-green)', fontWeight: '600', cursor: 'pointer' }}>Inicia sesión</span></p>
              </>
          )}
      </div>
    </div>
  );
}

export default Registro;