import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login';
import Registro from './views/Registro';

import DashboardLayout from "./components/layout/DashboardLayout";
import TableroOperativo from './views/TableroOperativo';
import AnalisisMetricas from './views/AnalisisMetricas';
import Perfil from './views/Perfil';

import "./assets/styles/App.css";

function App() {
  // BLINDAJE 1: Limpieza destructiva de tokens zombies
  const obtenerTokenSeguro = () => {
    const t = localStorage.getItem('token');
    return (t && t !== 'null' && t !== 'undefined') ? t : null;
  };

  const [token, setToken] = useState(obtenerTokenSeguro());
  const [nombreUsuario, setNombreUsuario] = useState(localStorage.getItem('nombreUsuario') || '');
  const [temaOscuro, setTemaOscuro] = useState(localStorage.getItem('tema') === 'oscuro');

  useEffect(() => {
    if (temaOscuro) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('tema', 'oscuro');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('tema', 'claro');
    }
  }, [temaOscuro]);

  const procesarLoginExitoso = (body) => {
    localStorage.setItem('token', body.token);
    localStorage.setItem('nombreUsuario', body.nombre);
    if (body.fecha_nacimiento) localStorage.setItem('fechaNacUsuario', body.fecha_nacimiento.split('T')[0]);
    setNombreUsuario(body.nombre);
    setToken(body.token);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombreUsuario');
    localStorage.removeItem('fechaNacUsuario');
    setNombreUsuario('');
    setToken(null);
  };

  return (
    // BLINDAJE 2: Color de fondo inyectado a la fuerza por si falla tu archivo App.css
    <div style={{ backgroundColor: 'var(--bg-body, #0f172a)', minHeight: '100dvh', width: '100vw' }}>
        <Routes>
          <Route path="/" element={<Navigate to={token ? "/dashboard/tablero" : "/login"} replace />} />
          <Route path="/login" element={!token ? <Login onLogin={procesarLoginExitoso} /> : <Navigate to="/dashboard/tablero" replace />} />
          <Route path="/registro" element={!token ? <Registro onLogin={procesarLoginExitoso} /> : <Navigate to="/dashboard/tablero" replace />} />
          
          <Route path="/dashboard" element={token ? <DashboardLayout token={token} nombreUsuario={nombreUsuario} onLogout={cerrarSesion} temaOscuro={temaOscuro} setTemaOscuro={setTemaOscuro} /> : <Navigate to="/login" replace />}>
              <Route index element={<Navigate to="tablero" replace />} />
              <Route path="tablero" element={<TableroOperativo />} />
              <Route path="metricas" element={<AnalisisMetricas />} />
          </Route>

          <Route path="/perfil" element={token ? <Perfil token={token} nombreUsuario={nombreUsuario} onLogout={cerrarSesion} temaOscuro={temaOscuro} setTemaOscuro={setTemaOscuro} /> : <Navigate to="/login" replace />} />
          
          {/* BLINDAJE 3: Ruta atrapalotodo para evitar quedarse en el limbo */}
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