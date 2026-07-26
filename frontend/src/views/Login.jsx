/*********************************************************************************
Pantalla de inicio de sesión (Login).
Aquí es donde el usuario introduce su correo y contraseña para entrar a 
la aplicación. También incluye las opciones para entrar directamente usando 
una cuenta de Google o de GitHub sin tener que recordar contraseñas.
***********************************************************************************/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Claves de identificación para poder usar los sistemas de Google y GitHub
const GOOGLE_CLIENT_ID = '374057828390-89sst7497o9mu099of83n5oluabu5rvp.apps.googleusercontent.com';
const GITHUB_CLIENT_ID = 'Ov23liHuJKItfZMT9Qks';

// Dirección de nuestro servidor para saber a dónde enviar los datos
const API_URL = import.meta.env.VITE_API_URL || 'https://kora-api-tfg.onrender.com';

function Login({ onLogin }) {
  const navigate = useNavigate();
  // Guardamos lo que el usuario escribe en las casillas
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Comprobamos si el usuario acaba de volver de la página de GitHub
  useEffect(() => {
    // Buscamos si en el enlace (URL) hay un código secreto de autorización
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Limpiamos la barra de direcciones para ocultar el código por seguridad
      window.history.replaceState({}, document.title, window.location.pathname);

      // Le enviamos el código a nuestro servidor para que lo compruebe
      fetch(`${API_URL}/api/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json().then(data => ({ status: res.status, body: data })))
      .then(({ status, body }) => {
        if (status === 200) {
          onLogin(body); // Si todo va bien, le dejamos entrar
        } else if (status === 206) {
          setError('Registro parcial: Falta tu fecha de nacimiento.');
        } else {
          setError(body.error || 'Error al iniciar sesión con GitHub');
        }
      })
      .catch(() => setError('Error de conexión al verificar GitHub'));
    }
  }, [onLogin]);

  // Función para entrar con el correo y la contraseña de siempre
  const manejarLogin = async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue sola
    setError('');
    try {
      // Enviamos los datos al servidor
      const respuesta = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await respuesta.json();
      
      if (respuesta.ok) onLogin(data);
      else setError(data.error || 'Error al iniciar sesión');
    } catch (err) { setError('Error de conexión'); }
  };

  // Función que se activa cuando Google nos confirma que el usuario es quien dice ser
  const manejarGoogleSuccess = (credentialResponse) => {
    setError('');
    fetch(`${API_URL}/api/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credentialResponse.credential })
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200) onLogin(body);
      else setError(body.error || 'Por favor, regístrate primero con Google.');
    }).catch(() => setError('Error de conexión'));
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-body)', fontFamily: 'var(--font-main)' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '40px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', margin: '20px', boxSizing: 'border-box' }}>
          
          {/* Título de la aplicación */}
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-main)' }}>Kora<span style={{ color: 'var(--accent-green)' }}>.</span></span>
          </div>

          {/* Mensaje rojo por si hay algún fallo al intentar entrar */}
          {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

          <h2 style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: '500', marginBottom: '30px' }}>Bienvenido de nuevo</h2>
          
          {/* Formulario clásico de correo y contraseña */}
          <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
              <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
              <button type="submit" className="btn-add" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>Entrar</button>
          </form>

          {/* Línea separadora */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>O iniciar sesión con</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          </div>

          {/* Botones para entrar con Google o GitHub */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <div style={{ width: '100%', height: '40px', overflow: 'hidden', borderRadius: '4px', display: 'flex', justifyContent: 'center' }}>
                      <GoogleLogin onSuccess={manejarGoogleSuccess} onError={() => setError('Error al conectar con Google')} width="340" text="signin_with" />
                  </div>
              </GoogleOAuthProvider>

          <button type="button" onClick={() => window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=${window.location.origin}${window.location.pathname}`}
              style={{ width: '100%', height: '40px', borderRadius: '4px', backgroundColor: '#24292e', border: 'none', color: '#ffffff', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxSizing: 'border-box' }}>
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" alt="GitHub" style={{ width: '18px', filter: 'invert(1)' }} />
              Entrar con GitHub
          </button>
          </div>

          {/* Enlace para ir a la pantalla de registro si no tienes cuenta */}
          <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', margin: '30px 0 0 0' }}>¿No tienes cuenta? <span onClick={() => navigate('/registro')} style={{ color: 'var(--accent-green)', fontWeight: '600', cursor: 'pointer' }}>Regístrate aquí</span></p>
      </div>
    </div>
  );
}

export default Login;