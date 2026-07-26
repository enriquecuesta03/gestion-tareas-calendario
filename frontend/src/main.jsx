/*********************************************************************************
Punto de entrada principal de la aplicación web.
Este es el primer archivo que se ejecuta al abrir la página. Su función 
es conectar todo nuestro código de React con el documento HTML del 
navegador. Además, envuelve la aplicación en el sistema de enlaces para 
poder navegar entre las diferentes pantallas de forma fluida.
***********************************************************************************/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Importamos el sistema que nos permite movernos entre las páginas web
import { BrowserRouter } from 'react-router-dom';

// Cargamos los estilos de diseño generales para toda la página
import "./assets/styles/index.css";

// Buscamos el contenedor principal en el HTML original y "dibujamos" nuestra aplicación dentro
ReactDOM.createRoot(document.getElementById('root')).render(
  // Activamos un modo de ayuda de React que nos avisa si hay errores de código
  <React.StrictMode>
    {/* Activamos el sistema de navegación general */}
    <BrowserRouter>
      {/* Cargamos el archivo App.jsx, que contiene el resto de las pantallas */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);