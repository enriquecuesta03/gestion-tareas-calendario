/*********************************************************************************
Componente principal de enrutamiento y estado global (App.jsx).
Controla la persistencia de la sesión del usuario validando tokens JWT
en LocalStorage. Gestiona las preferencias de interfaz (tema claro/oscuro)
y define el árbol de navegación de la aplicación, implementando
guardias de ruta (Route Guards) para proteger el acceso a las vistas 
privadas y redirigir flujos de navegación no autorizados o erróneos.
***********************************************************************************/

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importamos las pantallas públicas (Login y Registro)
import Login from './views/Login';
import Registro from './views/Registro';

// Importamos las pantallas privadas y la plantilla principal
import DashboardLayout from "./components/layout/DashboardLayout";
import TableroOperativo from './views/TableroOperativo';
import AnalisisMetricas from './views/AnalisisMetricas';
import Perfil from './views/Perfil';

import "./assets/styles/App.css";

function App() {
  // Comprobamos que el token guardado sea válido para evitar errores de sesión
  const obtenerTokenSeguro = () => {
    const t = localStorage.getItem('token');
    return (t && t !== 'null' && t !== 'undefined') ? t : null;
  };

  // Cargamos los datos del usuario y sus preferencias desde la memoria del navegador
  const [token, setToken] = useState(obtenerTokenSeguro());
  const [nombreUsuario, setNombreUsuario] = useState(localStorage.getItem('nombreUsuario') || '');
  const [temaOscuro, setTemaOscuro] = useState(localStorage.getItem('tema') === 'oscuro');

  // Cambiamos el color de fondo de toda la página web según el tema elegido
  useEffect(() => {
    if (temaOscuro) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('tema', 'oscuro');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('tema', 'claro');
    }
  }, [temaOscuro]);

  // Guardamos los datos del usuario en el navegador cuando inicia sesión correctamente
  const procesarLoginExitoso = (body) => {
    localStorage.setItem('token', body.token);
    localStorage.setItem('nombreUsuario', body.nombre);
    
    // Guardamos la fecha de nacimiento solo si la base de datos nos la envía
    if (body.fecha_nacimiento) localStorage.setItem('fechaNacUsuario', body.fecha_nacimiento.split('T')[0]);
    
    // Actualizamos la aplicación para que muestre la sesión iniciada
    setNombreUsuario(body.nombre);
    setToken(body.token);
  };

  // Borramos todos los datos del navegador al cerrar sesión
  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombreUsuario');
    localStorage.removeItem('fechaNacUsuario');
    
    setNombreUsuario('');
    setToken(null);
  };

  return (
    // Contenedor principal con un color de fondo por si falla el archivo CSS
    <div style={{ backgroundColor: 'var(--bg-body, #0f172a)', minHeight: '100dvh', width: '100vw' }}>
        {/* Definimos las rutas de la web y protegemos las que necesitan inicio de sesión */}
        <Routes>
          {/* Si entras a la raíz, te manda al tablero si estás logueado, o al login si no lo estás */}
          <Route path="/" element={<Navigate to={token ? "/dashboard/tablero" : "/login"} replace />} />
          
          {/* Rutas públicas: Si ya has iniciado sesión, no puedes volver a entrar aquí */}
          <Route path="/login" element={!token ? <Login onLogin={procesarLoginExitoso} /> : <Navigate to="/dashboard/tablero" replace />} />
          <Route path="/registro" element={!token ? <Registro onLogin={procesarLoginExitoso} /> : <Navigate to="/dashboard/tablero" replace />} />
          
          {/* Rutas privadas: Solo puedes entrar si tienes un token válido */}
          <Route path="/dashboard" element={token ? <DashboardLayout token={token} nombreUsuario={nombreUsuario} onLogout={cerrarSesion} temaOscuro={temaOscuro} setTemaOscuro={setTemaOscuro} /> : <Navigate to="/login" replace />}>
              <Route index element={<Navigate to="tablero" replace />} />
              <Route path="tablero" element={<TableroOperativo />} />
              <Route path="metricas" element={<AnalisisMetricas />} />
          </Route>

          {/* Ruta para ver y editar el perfil del usuario */}
          <Route path="/perfil" element={token ? <Perfil token={token} nombreUsuario={nombreUsuario} onLogout={cerrarSesion} temaOscuro={temaOscuro} setTemaOscuro={setTemaOscuro} /> : <Navigate to="/login" replace />} />
          
          {/* Pantalla de error por si el usuario escribe una URL que no existe */}
          <Route path="*" element={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white' }}>
              <h1 style={{ color: '#ef4444' }}>Error: Ruta Perdida</h1>
              <p>El navegador se ha atascado en una URL inválida.</p>
              <button onClick={() => { cerrarSesion(); window.location.href='/'; }} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}>
                FORZAR REINICIO
              </button>
            </div>
          } />
        </Routes>
    </div>
  );
}

export default App;