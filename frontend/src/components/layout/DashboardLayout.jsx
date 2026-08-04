/*********************************************************************************
Plantilla principal de la aplicación (DashboardLayout).
Este es el esqueleto de la página. Se encarga de juntar el menú lateral, 
el formulario para crear tareas, el calendario y todas las ventanas 
emergentes. También hace de intermediario, pasando la información de 
la base de datos y la Inteligencia Artificial al resto de los componentes.
***********************************************************************************/

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid'; 
import multiMonthPlugin from '@fullcalendar/multimonth'; 
import esLocale from '@fullcalendar/core/locales/es';
import { Toaster } from 'react-hot-toast';

// Importamos las piezas visuales que componen la página principal
import Sidebar from './Sidebar'; 
import TaskForm from '../forms/TaskForm'; 

// Importamos las ventanas flotantes que aparecen por encima del contenido
import AbsenceModal from '../modals/AbsenceModal';
import TaskDetailModal from '../modals/TaskDetailModal';
import TaskActionModal from '../modals/TaskActionModal';

// Importamos las herramientas de lógica que manejan los datos y la voz
import { useKoraAI } from '../../hooks/useKoraAI';
import { useTareas } from '../../hooks/useTareas'; 

// Estilos de diseño de la plantilla
import '../../assets/styles/DashboardLayout.css';

function DashboardLayout({ token, nombreUsuario, onLogout, temaOscuro, setTemaOscuro }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [fechaNacUsuario, setFechaNacUsuario] = useState(localStorage.getItem('fechaNacUsuario') || '');

  // ==========================================
  // Control de ventanas y menús desplegables
  // ==========================================
  const [menuAbierto, setMenuAbierto] = useState(false); 
  const [modalNuevaTareaAbierto, setModalNuevaTareaAbierto] = useState(false); 
  const [tareaEnEdicion, setTareaEnEdicion] = useState(null);
  const [tareaEnVista, setTareaEnVista] = useState(null);
  const [vacacionEnVista, setVacacionEnVista] = useState(null);

  // ==========================================
  // Datos temporales para rellenar el formulario de tareas
  // ==========================================
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState(''); 
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [opcionAviso, setOpcionAviso] = useState('');
  const [repeticion, setRepeticion] = useState('ninguna');
  const [diasPersonalizados, setDiasPersonalizados] = useState('');
  const [tareaGrupoId, setTareaGrupoId] = useState('');
  const [miembrosDelGrupo, setMiembrosDelGrupo] = useState([]);
  const [tareaAsignadoA, setTareaAsignadoA] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [comentarioEnEdicionId, setComentarioEnEdicionId] = useState(null);
  const [textoComentarioEditado, setTextoComentarioEditado] = useState('');

  // Control del filtro para ver tareas de distintas empresas
  const [filtroVista, setFiltroVista] = useState('todas'); 
  const [columnaDestino, setColumnaDestino] = useState(null);

  // ==========================================
  // 1. Conexión principal con la base de datos
  // ==========================================
  const { 
      tareas, festivos, vacaciones, misGrupos, comentarios,
      cargarComentarios, guardarTarea, borrarTarea, cambiarEstado, 
      borrarVacacion, enviarComentario, guardarEdicionComentario, 
      API_URL, headersConAuth
  } = useTareas(token, onLogout);

  // ==========================================
  // 2. Conexión con el asistente de voz e Inteligencia Artificial
  // ==========================================
  
  // Función para calcular automáticamente cuándo tiene que sonar la alarma de una tarea
  const manejarCambioAviso = (e) => {
    const opcion = e.target.value; setOpcionAviso(opcion);
    if (opcion === '') return setFechaNotificacion('');
    if (opcion === 'personalizado') return; 
    const f = new Date();
    if (opcion === 'hoy') f.setHours(f.getHours() + 2);
    else if (opcion === 'manana') { f.setDate(f.getDate() + 1); f.setHours(9, 0, 0, 0); } 
    else if (opcion === 'semana') { f.setDate(f.getDate() + 7); f.setHours(9, 0, 0, 0); }
    setFechaNotificacion(`${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}T${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`);
  };

  const { hablando, procesando, escuchando, analizandoVoz, reproducirResumen, procesarVoz } = useKoraAI({
      token, nombreUsuario, tareas,
      formulariosActions: { setTitulo, setDescripcion, setFecha, setHora, setRepeticion, manejarCambioAviso, opcionAviso, estadoActual: { titulo, descripcion, fecha, hora, opcionAviso, repeticion } }
  });

  // ==========================================
  // 3. Funciones para limpiar formularios y guardar información
  // ==========================================
  const limpiarFormulario = () => { setTitulo(''); setDescripcion(''); setFecha(''); setHora(''); setFechaNotificacion(''); setOpcionAviso(''); setRepeticion('ninguna'); setDiasPersonalizados(''); setTareaEnEdicion(null); setTareaGrupoId(''); setTareaAsignadoA(''); setModalNuevaTareaAbierto(false); };
  
  const manejarCancelarEdicion = () => { const tareaOriginal = tareas.find(t => t.id === tareaEnEdicion); limpiarFormulario(); if (tareaOriginal) { setTareaEnVista(tareaOriginal); cargarComentarios(tareaOriginal.id); } };
  
  const manejarEnvioFormulario = async (e) => {
    e.preventDefault();
    const repeticionFinal = repeticion === 'personalizado' ? `personalizado_${diasPersonalizados}` : repeticion;
    const datosTarea = { titulo, descripcion, fecha_vencimiento: `${fecha}T${hora || '00:00'}`, fecha_notificacion: fechaNotificacion, repeticion: repeticionFinal, grupo_id: tareaGrupoId || null, asignado_a: tareaAsignadoA || null };
    const url = tareaEnEdicion ? `${API_URL}/api/tareas/${tareaEnEdicion}` : `${API_URL}/api/tareas`;
    
    const exito = await guardarTarea(url, tareaEnEdicion ? 'PUT' : 'POST', datosTarea, !!tareaEnEdicion);
    if(exito) { limpiarFormulario(); setModalNuevaTareaAbierto(false); }
  };

  // Función para rellenar las casillas cuando queremos editar una tarea que ya existía
  const manejarEdicionTarea = (tarea) => {
    setTareaEnEdicion(tarea.id); setTitulo(tarea.titulo); setDescripcion(tarea.descripcion || ''); setTareaGrupoId(tarea.grupo_id || '');
    if (tarea.fecha_vencimiento) { const localStr = obtenerFechaHoraLocalStr(tarea.fecha_vencimiento); const [f, h] = localStr.split('T'); setFecha(f); setHora(h === '00:00' ? '' : h); }
    if (tarea.fecha_notificacion) { setFechaNotificacion(obtenerFechaHoraLocalStr(tarea.fecha_notificacion)); setOpcionAviso('personalizado'); }
    if (tarea.repeticion && tarea.repeticion.startsWith('personalizado_')) { setRepeticion('personalizado'); setDiasPersonalizados(tarea.repeticion.split('_')[1]); } else { setRepeticion(tarea.repeticion || 'ninguna'); }
  };

  // Función que se activa al soltar una tarea en otra columna del tablero
  const manejarDropKanban = (e, nuevoEstado) => { e.preventDefault(); setColumnaDestino(null); const id = e.dataTransfer.getData('tareaId'); if (id) cambiarEstado(parseInt(id, 10), nuevoEstado, obtenerFechaHoraLocalStr); };

  const manejarEnvioComentario = (e) => { e.preventDefault(); enviarComentario(tareaEnVista?.id, nuevoComentario, () => setNuevoComentario('')); };
  const manejarGuardadoEdicionComentario = (e, comentarioId) => { e.preventDefault(); guardarEdicionComentario(comentarioId, textoComentarioEditado, tareaEnVista?.id, () => setComentarioEnEdicionId(null)); };

  // Busca a los miembros de un equipo cuando lo seleccionamos en el formulario para poder asignarles la tarea
  useEffect(() => {
    if (tareaGrupoId) fetch(`${API_URL}/api/grupos/${tareaGrupoId}/miembros`, { headers: headersConAuth() }).then(res => res.json()).then(data => setMiembrosDelGrupo(Array.isArray(data) ? data : []));
    else { setMiembrosDelGrupo([]); setTareaAsignadoA(''); }
  }, [tareaGrupoId]);

  useEffect(() => {
    if (token) fetch(`${API_URL}/api/perfil`, { headers: headersConAuth() }).then(res => res.json()).then(data => { if (data.fecha_nac_limpia) { setFechaNacUsuario(data.fecha_nac_limpia); localStorage.setItem('fechaNacUsuario', data.fecha_nac_limpia); } }).catch(console.error);
  }, [token]);

  // ==========================================
  // 4. Preparación de los datos para dibujarlos en el tablero y el calendario
  // ==========================================
  const obtenerFechaLocalStr = (fechaIso) => { if (!fechaIso) return ''; const d = new Date(fechaIso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const obtenerFechaHoraLocalStr = (fechaIso) => { if (!fechaIso) return ''; const d = new Date(fechaIso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  
  // Filtramos la lista principal según la empresa que hayamos elegido ver
  const notificacionesPendientes = tareas.filter(tarea => tarea.estado !== 'Completado' && tarea.fecha_notificacion && Date.now() >= new Date(tarea.fecha_notificacion).getTime());
  const tareasFiltradas = tareas.filter(tarea => filtroVista === 'todas' ? true : (filtroVista === 'personal' ? tarea.grupo_id === null : tarea.grupo_id === parseInt(filtroVista)));
  const limiteVisibleStr = obtenerFechaLocalStr(new Date());
  
  // Separamos las tareas en sus tres columnas correspondientes
  const tareasPorHacer = tareasFiltradas.filter(tarea => tarea.estado === 'Por Hacer' && (!tarea.fecha_vencimiento || obtenerFechaLocalStr(tarea.fecha_vencimiento) <= limiteVisibleStr));
  const tareasEnProgreso = tareasFiltradas.filter(tarea => tarea.estado === 'En Progreso' && (!tarea.fecha_vencimiento || obtenerFechaLocalStr(tarea.fecha_vencimiento) <= limiteVisibleStr));
  const tareasCompletadas = tareasFiltradas.filter(tarea => tarea.estado === 'Completado' && (!tarea.fecha_vencimiento || obtenerFechaLocalStr(tarea.fecha_vencimiento) <= limiteVisibleStr));

  // Pintamos de colores las tareas para ponerlas en el calendario
  const eventosCalendario = [];
  tareasFiltradas.forEach(tarea => {
    if (tarea.fecha_vencimiento) {
      const fStr = obtenerFechaHoraLocalStr(tarea.fecha_vencimiento);
      let colorFondo = tarea.estado === 'Completado' ? 'var(--text-muted)' : (tarea.estado === 'En Progreso' ? '#3b82f6' : 'var(--accent-green)');
      if (tarea.grupo_id && tarea.estado !== 'Completado') colorFondo = '#0f172a';
      eventosCalendario.push({ id: `tarea-${tarea.id}-base`, title: tarea.titulo, start: fStr, allDay: fStr.endsWith('T00:00'), backgroundColor: colorFondo, borderColor: colorFondo, cursor: 'pointer' });
    }
  });

  // Añadimos nuestro cumpleaños al calendario en color morado
  const eventosCumpleanos = [];
  if (fechaNacUsuario) { const partes = fechaNacUsuario.split('-'); if (partes.length === 3) { for (let i = -1; i <= 3; i++) eventosCumpleanos.push({ id: `cumple-${new Date().getFullYear() + i}`, title: 'Día Libre (Cumpleaños)', date: `${new Date().getFullYear() + i}-${partes[1]}-${partes[2]}`, allDay: true, backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }); } }

  // Filtramos las vacaciones igual que hacemos con las tareas
  const vacacionesFiltradas = vacaciones.filter(v => filtroVista === 'todas' ? true : (filtroVista === 'personal' ? v.grupo_id === null : v.grupo_id === parseInt(filtroVista)));

  // Añadimos las vacaciones en color naranja
  const eventosVacaciones = vacacionesFiltradas.map(v => {
      const dFin = new Date(v.fecha_fin); dFin.setDate(dFin.getDate() + 1); 
      return { id: `vacacion-${v.id}`, title: `Ausencia: ${v.usuario_nombre}`, start: `${new Date(v.fecha_inicio).getFullYear()}-${String(new Date(v.fecha_inicio).getMonth() + 1).padStart(2, '0')}-${String(new Date(v.fecha_inicio).getDate()).padStart(2, '0')}`, end: `${dFin.getFullYear()}-${String(dFin.getMonth() + 1).padStart(2, '0')}-${String(dFin.getDate()).padStart(2, '0')}`, allDay: true, backgroundColor: '#f59e0b', borderColor: '#f59e0b', extendedProps: { usuario_nombre: v.usuario_nombre, grupo_nombre: v.grupo_nombre, id_real: v.id }};
  });

  // Añadimos los festivos en color rojo
  const eventosFestivosFormateados = festivos.map((f, i) => ({ id: `festivo-${i}`, title: f.name, date: f.date.iso.split('T')[0], allDay: true, backgroundColor: 'var(--danger-color)', borderColor: 'var(--danger-color)' }));
  
  // Unimos todo en un solo bloque para pasárselo al componente del calendario
  const todosLosEventos = [...eventosCalendario, ...eventosVacaciones, ...eventosCumpleanos, ...eventosFestivosFormateados];

  // Ordenamos la lista de tareas pendientes por fecha para la sección de métricas
  const backlogOrdenado = [...tareasFiltradas.filter(t => !t.id.toString().includes('-proy-'))].filter(t => t.estado !== 'Completado').sort((a, b) => {
        if (!a.fecha_vencimiento) return 1; if (!b.fecha_vencimiento) return -1; return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
  });
  
  const datosGraficoEstado = [ { name: 'Por Hacer', value: tareasPorHacer.length, color: '#ef4444' }, { name: 'En Progreso', value: tareasEnProgreso.length, color: '#3b82f6' }, { name: 'Completado', value: tareasCompletadas.length, color: '#10b981' } ];

  return (
    <div className="app-layout">
      {/* Sistema que dibuja las alertas en pantalla */}
      <Toaster position="bottom-right" />

      {/* Menú lateral izquierdo */}
      <Sidebar 
          onVerPerfil={() => navigate('/perfil')} reproducirResumen={reproducirResumen}
          procesando={procesando} hablando={hablando} notificacionesPendientes={notificacionesPendientes} onVerNotificacion={(t) => { setTareaEnVista(t); cargarComentarios(t.id); }}
          filtroVista={filtroVista} setFiltroVista={setFiltroVista} misGrupos={misGrupos} temaOscuro={temaOscuro} setTemaOscuro={setTemaOscuro}
          nombreUsuario={nombreUsuario} onLogout={onLogout} menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto}  
      />

      {/* Barra superior visible solo en teléfonos móviles */}
      <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setMenuAbierto(true)}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
          <h1 className="mobile-logo">Kora<span>.</span></h1>
          <div style={{width: '28px'}}></div> 
      </header>

      {/* Contenido central de la página */}
      <main className="main-content">
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          
          {/* Columna de la izquierda: Formulario para tareas nuevas */}
          <div className="panel-formulario" style={{ flex: '1', minWidth: '300px', backgroundColor: 'var(--bg-card)', padding: '25px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Nueva Tarea</h2>
            <TaskForm 
                esEdicion={false} manejarEnvio={manejarEnvioFormulario} titulo={titulo} setTitulo={setTitulo}
                procesarVoz={procesarVoz} analizandoVoz={analizandoVoz} escuchando={escuchando} descripcion={descripcion} setDescripcion={setDescripcion}
                tareaGrupoId={tareaGrupoId} setTareaGrupoId={setTareaGrupoId} misGrupos={misGrupos} tareaAsignadoA={tareaAsignadoA} setTareaAsignadoA={setTareaAsignadoA} miembrosDelGrupo={miembrosDelGrupo}
                fecha={fecha} setFecha={setFecha} hora={hora} setHora={setHora} opcionAviso={opcionAviso} manejarCambioAviso={manejarCambioAviso}
                fechaNotificacion={fechaNotificacion} setFechaNotificacion={setFechaNotificacion} repeticion={repeticion} setRepeticion={setRepeticion}
                diasPersonalizados={diasPersonalizados} setDiasPersonalizados={setDiasPersonalizados} manejarCancelarEdicion={manejarCancelarEdicion}
            />
          </div>
          
          {/* Columna de la derecha: Aquí se carga el tablero visual o los gráficos dependiendo del menú */}
          <div style={{ flex: '2', minWidth: '0', width: '100%' }}>
            <Outlet context={{
                tareasPorHacer, tareasEnProgreso, tareasCompletadas, columnaDestino, setColumnaDestino,
                manejarDrop: manejarDropKanban, cambiarEstado, editarTarea: manejarEdicionTarea, borrarTarea: (id) => borrarTarea(id, setTareaEnVista), setTareaEnVista, cargarComentarios,
                datosGraficoEstado, backlogOrdenado
            }} />
          </div>
        </div>

        {/* Zona inferior permanente: El calendario interactivo */}
        <div className="calendar-wrapper">
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '20px' }}>Cronograma</h2>
          <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin]} initialView="dayGridMonth" headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,multiMonthYear' }} events={todosLosEventos} height="auto" locale={esLocale} firstDay={1} eventClick={(info) => { if (info.event.id.startsWith('tarea-')) { const idExtraido = parseInt(info.event.id.split('-')[1], 10); const t = tareas.find(t => t.id === idExtraido); if (t) { setTareaEnVista(t); cargarComentarios(t.id); } } else if (info.event.id.startsWith('vacacion-')) { setVacacionEnVista(info.event.extendedProps); } }} />
        </div>

        {/* Ventanas emergentes ocultas que saltan por encima de la pantalla cuando es necesario */}
        <TaskDetailModal 
            isOpen={!!tareaEnVista && !tareaEnEdicion} tareaEnVista={tareaEnVista} setTareaEnVista={setTareaEnVista}
            editarTarea={manejarEdicionTarea} comentarios={comentarios} nombreUsuario={nombreUsuario}
            comentarioEnEdicionId={comentarioEnEdicionId} iniciarEdicionComentario={(c) => { setComentarioEnEdicionId(c.id); setTextoComentarioEditado(c.texto); }} guardarEdicionComentario={manejarGuardadoEdicionComentario}
            textoComentarioEditado={textoComentarioEditado} setTextoComentarioEditado={setTextoComentarioEditado} setComentarioEnEdicionId={setComentarioEnEdicionId}
            enviarComentario={manejarEnvioComentario} nuevoComentario={nuevoComentario} setNuevoComentario={setNuevoComentario}
        />

        <AbsenceModal 
            isOpen={!!vacacionEnVista} vacacionEnVista={vacacionEnVista}
            setVacacionEnVista={setVacacionEnVista} nombreUsuario={nombreUsuario} borrarVacacion={(id) => borrarVacacion(id, setVacacionEnVista)}
        />

        <TaskActionModal 
            isOpen={tareaEnEdicion !== null || modalNuevaTareaAbierto}
            tituloModal={tareaEnEdicion ? "Editando Tarea" : "Nueva Tarea"} esEdicion={!!tareaEnEdicion}
            limpiarFormulario={limpiarFormulario} manejarEnvio={manejarEnvioFormulario} titulo={titulo} setTitulo={setTitulo}
            procesarVoz={procesarVoz} analizandoVoz={analizandoVoz} escuchando={escuchando} descripcion={descripcion} setDescripcion={setDescripcion}
            tareaGrupoId={tareaGrupoId} setTareaGrupoId={setTareaGrupoId} misGrupos={misGrupos} tareaAsignadoA={tareaAsignadoA} setTareaAsignadoA={setTareaAsignadoA} miembrosDelGrupo={miembrosDelGrupo}
            fecha={fecha} setFecha={setFecha} hora={hora} setHora={setHora} opcionAviso={opcionAviso} manejarCambioAviso={manejarCambioAviso}
            fechaNotificacion={fechaNotificacion} setFechaNotificacion={setFechaNotificacion} repeticion={repeticion} setRepeticion={setRepeticion}
            diasPersonalizados={diasPersonalizados} setDiasPersonalizados={setDiasPersonalizados}
            manejarCancelarEdicion={tareaEnEdicion ? manejarCancelarEdicion : limpiarFormulario}
            borrarTarea={(id) => borrarTarea(id, setTareaEnVista)} tareaEnEdicion={tareaEnEdicion}
        />

      </main>

      {/* Botón flotante para crear tareas (solo visible en dispositivos móviles) */}
      <button className="fab-button" onClick={() => setModalNuevaTareaAbierto(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Tarea
      </button>

    </div>
  );
}

export default DashboardLayout;