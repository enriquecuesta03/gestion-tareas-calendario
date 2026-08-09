/*********************************************************************************
Archivo de configuración principal del proyecto (vite.config.js).
Aquí le decimos al sistema cómo tiene que construir nuestra página web. 
Además, incluye toda la configuración necesaria para que la página se 
comporte como una aplicación real y el usuario pueda instalarla en su 
teléfono móvil u ordenador con su propio icono y colores.
***********************************************************************************/

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // Activamos el soporte para leer nuestro código de React
    react(),
    
    // Configuramos la página para que se pueda instalar en dispositivos
    VitePWA({
      // Hacemos que la aplicación se actualice sola si subimos una versión nueva
      registerType: 'autoUpdate',
      
      // Indicamos los archivos básicos que tiene que guardar
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      
      // Este es el "carnet de identidad" de la aplicación cuando se instala
      manifest: {
        name: 'Kora Task Manager',
        short_name: 'Kora',
        description: 'Gestor inteligente de tareas y equipos',
        theme_color: '#1e293b', // Color de la barra superior del móvil
        background_color: '#0f172a', // Color de fondo mientras carga
        display: 'standalone', // Hace que se abra a pantalla completa, sin la barra del navegador
        
        // Los iconos que aparecerán en la pantalla de inicio del teléfono
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Permite que el icono se adapte a cualquier forma de pantalla
          }
        ]
      }
    })
  ],
  // Configuramos el servidor local para hacer pruebas
  server: {
    host: '0.0.0.0', // Abre la red para que podamos probar la app desde el móvil usando el WiFi de casa
    port: 5173
  }
});