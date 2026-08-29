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

import Sidebar from './Sidebar'; 
import TaskForm from '../forms/TaskForm'; 

import AbsenceModal from '../modals/AbsenceModal';
import TaskDetailModal from '../modals/TaskDetailModal';
import TaskActionModal from '../modals/TaskActionModal';

import { useKoraAI } from '../../hooks/useKoraAI';
import { useTareas } from '../../hooks/useTareas'; 

import '../../assets/styles/DashboardLayout.css';

function DashboardLayout({ token, nombreUsuario, onLogout, temaOscuro, setTemaOscuro }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [fechaNacUsuario, setFechaNacUsuario] = useState(localStorage.getItem('fechaNacUsuario') || '');

  const [menuAbierto, setMenuAbierto] = useState(false); 
  const [modalNuevaTareaAbierto, setModalNuevaTareaAbierto] = useState(false); 
  const [tareaEnEdicion, setTareaEnEdicion] = useState(null);
  const [tareaEnVista, setTareaEnVista] = useState(null);
  const [vacacionEnVista, setVacacionEnVista] = useState(null);

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

  const [filtroVista, setFiltroVista] = useState('todas'); 
  const [columnaDestino, setColumnaDestino] = useState(null);

  // LÓGICA DE TIEMPO REAL: Un reloj oculto que avanza para revisar las notificaciones cada 15 segundos
  // (sin esto, "notificacionesPendientes" de más abajo solo se recalcularía cuando
  // cambiara algo más en el estado; con esto, cada 15s se fuerza un re-render y
  // se comprueba si alguna tarea acaba de cruzar su fecha de aviso)
  const [relojInterno, setRelojInterno] = useState(Date.now());

  useEffect(() => {
      const intervalo = setInterval(() => {
          setRelojInterno(Date.now());
      }, 15000); 
      return () => clearInterval(intervalo);
  }, []);

  const { 
      tareas, festivos, vacaciones, misGrupos, comentarios,
      cargarComentarios, guardarTarea, borrarTarea, cambiarEstado, 
      borrarVacacion, enviarComentario, guardarEdicionComentario, 
      API_URL, headersConAuth
  } = useTareas(token, onLogout);

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

  const limpiarFormulario = () => { setTitulo(''); setDescripcion(''); setFecha(''); setHora(''); setFechaNotificacion(''); setOpcionAviso(''); setRepeticion('ninguna'); setDiasPersonalizados(''); setTareaEnEdicion(null); setTareaGrupoId(''); setTareaAsignadoA(''); setModalNuevaTareaAbierto(false); };
  
  const manejarCancelarEdicion = () => { const tareaOriginal = tareas.find(t => t.id === tareaEnEdicion); limpiarFormulario(); if (tareaOriginal) { setTareaEnVista(tareaOriginal); cargarComentarios(tareaOriginal.id); } };
  
  const manejarEnvioFormulario = async (e) => {
    e.preventDefault();
    // "personalizado" no se guarda tal cual: se codifica en un solo string
    // (personalizado_7, personalizado_15...) porque la columna repeticion de
    // la BD es un simple varchar, no dos columnas separadas. Al editar una
    // tarea (más abajo, en manejarEdicionTarea) se hace el proceso inverso.
    const repeticionFinal = repeticion === 'personalizado' ? `personalizado_${diasPersonalizados}` : repeticion;
    
    const fechaVencimientoFinal = fecha ? `${fecha}T${hora || '00:00'}` : null;
    const fechaNotifFinal = fechaNotificacion ? fechaNotificacion : null;

    const datosTarea = { 
        titulo, 
        descripcion, 
        fecha_vencimiento: fechaVencimientoFinal, 
        fecha_notificacion: fechaNotifFinal, 
        repeticion: repeticionFinal, 
        grupo_id: tareaGrupoId || null, 
        asignado_a: tareaAsignadoA || null 
    };
    
    const url = tareaEnEdicion ? `${API_URL}/api/tareas/${tareaEnEdicion}` : `${API_URL}/api/tareas`;
    
    const exito = await guardarTarea(url, tareaEnEdicion ? 'PUT' : 'POST', datosTarea, !!tareaEnEdicion);
    if(exito) { limpiarFormulario(); setModalNuevaTareaAbierto(false); }
  };

  const manejarEdicionTarea = (tarea) => {
    // aquí se deshace justo lo que se hizo al guardar: si el string de
    // repeticion empieza por "personalizado_", separamos el número de días
    // para que el desplegable y el input numérico del formulario se rellenen
    // cada uno con lo suyo, en vez de mostrar el string completo sin sentido
    setTareaEnEdicion(tarea.id); setTitulo(tarea.titulo); setDescripcion(tarea.descripcion || ''); setTareaGrupoId(tarea.grupo_id || '');
    if (tarea.fecha_vencimiento) { const localStr = obtenerFechaHoraLocalStr(tarea.fecha_vencimiento); const [f, h] = localStr.split('T'); setFecha(f); setHora(h === '00:00' ? '' : h); }
    if (tarea.fecha_notificacion) { setFechaNotificacion(obtenerFechaHoraLocalStr(tarea.fecha_notificacion)); setOpcionAviso('personalizado'); }
    if (tarea.repeticion && tarea.repeticion.startsWith('personalizado_')) { setRepeticion('personalizado'); setDiasPersonalizados(tarea.repeticion.split('_')[1]); } else { setRepeticion(tarea.repeticion || 'ninguna'); }
  };

  const manejarDropKanban = (e, nuevoEstado) => { e.preventDefault(); setColumnaDestino(null); const id = e.dataTransfer.getData('tareaId'); if (id) cambiarEstado(parseInt(id, 10), nuevoEstado, obtenerFechaHoraLocalStr); };

  const manejarEnvioComentario = (e) => { e.preventDefault(); enviarComentario(tareaEnVista?.id, nuevoComentario, () => setNuevoComentario('')); };
  const manejarGuardadoEdicionComentario = (e, comentarioId) => { e.preventDefault(); guardarEdicionComentario(comentarioId, textoComentarioEditado, tareaEnVista?.id, () => setComentarioEnEdicionId(null)); };

  useEffect(() => {
    if (tareaGrupoId) fetch(`${API_URL}/api/grupos/${tareaGrupoId}/miembros`, { headers: headersConAuth() }).then(res => res.json()).then(data => setMiembrosDelGrupo(Array.isArray(data) ? data : []));
    else { setMiembrosDelGrupo([]); setTareaAsignadoA(''); }
  }, [tareaGrupoId]);

  useEffect(() => {
    if (token) fetch(`${API_URL}/api/perfil`, { headers: headersConAuth() }).then(res => res.json()).then(data => { if (data.fecha_nac_limpia) { setFechaNacUsuario(data.fecha_nac_limpia); localStorage.setItem('fechaNacUsuario', data.fecha_nac_limpia); } }).catch(console.error);
  }, [token]);

  // CORRECCION 1: Eliminamos la matematica que sumaba la zona horaria. Rompemos la Z internacional y forzamos la T
  const obtenerFechaHoraLocalStr = (fechaIso) => { 
      if (!fechaIso) return ''; 
      const textoConT = typeof fechaIso === 'string' ? fechaIso.replace(' ', 'T') : fechaIso;
      return textoConT.split('.')[0].replace('Z', '').slice(0, 16); 
  };
  
  // CORRECCION 2: Usamos el relojInterno en lugar de Date.now() directo para que el componente evalue el tiempo real
  const notificacionesPendientes = tareas.filter(tarea => {
      if (tarea.estado === 'Completado' || !tarea.fecha_notificacion) return false;
      
      const textoSeguro = tarea.fecha_notificacion.replace(' ', 'T');
      const fechaLimpia = textoSeguro.endsWith('Z') ? textoSeguro.slice(0, -1) : textoSeguro;
      
      return relojInterno >= new Date(fechaLimpia).getTime();
  });

  const tareasFiltradas = tareas.filter(tarea => filtroVista === 'todas' ? true : (filtroVista === 'personal' ? tarea.grupo_id === null : String(tarea.grupo_id) === String(filtroVista)));
  
  const tareasPorHacer = tareasFiltradas.filter(tarea => tarea.estado === 'Por Hacer');
  const tareasEnProgreso = tareasFiltradas.filter(tarea => tarea.estado === 'En Progreso');
  const tareasCompletadas = tareasFiltradas.filter(tarea => tarea.estado === 'Completado');

  const eventosCalendario = [];
  tareasFiltradas.forEach(tarea => {
    if (tarea.fecha_vencimiento) {
      const fStr = obtenerFechaHoraLocalStr(tarea.fecha_vencimiento);
      let colorFondo = tarea.estado === 'Completado' ? 'var(--text-muted)' : (tarea.estado === 'En Progreso' ? '#3b82f6' : 'var(--accent-green)');
      // las tareas de equipo (no completadas) se pintan siempre en este gris
      // oscuro, pisando el color de estado normal, para distinguirlas de un
      // vistazo de las personales sin tener que abrir cada una
      if (tarea.grupo_id && tarea.estado !== 'Completado') colorFondo = '#0f172a';
      eventosCalendario.push({ id: `tarea-${tarea.id}-base`, title: tarea.titulo, start: fStr, allDay: fStr.endsWith('T00:00'), backgroundColor: colorFondo, borderColor: colorFondo, cursor: 'pointer' });
    }
  });

  const eventosCumpleanos = [];
  // pinto el cumpleaños del año pasado, este año y los dos siguientes (-1 a +3)
  // para que aparezca aunque el usuario navegue el calendario hacia atrás o
  // varios años hacia delante, no solo el de "este año" literal
  if (fechaNacUsuario) { const partes = fechaNacUsuario.split('-'); if (partes.length === 3) { for (let i = -1; i <= 3; i++) eventosCumpleanos.push({ id: `cumple-${new Date().getFullYear() + i}`, title: 'Día Libre (Cumpleaños)', date: `${new Date().getFullYear() + i}-${partes[1]}-${partes[2]}`, allDay: true, backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }); } }

  const vacacionesFiltradas = vacaciones.filter(v => {
      if (filtroVista === 'todas') return true;
      if (filtroVista === 'personal') return false; 
      
      const grupoSeleccionado = misGrupos.find(g => String(g.id) === String(filtroVista));
      
      return (v.grupo_id !== undefined && v.grupo_id !== null && String(v.grupo_id) === String(filtroVista)) || 
             (grupoSeleccionado && v.grupo_nombre === grupoSeleccionado.nombre);
  });

  const eventosVacaciones = vacacionesFiltradas.map(v => {
      // FullCalendar trata el "end" de un evento de varios días como exclusivo
      // (el día que se guarde en end NO se pinta), así que hay que sumarle
      // uno para que el último día de vacaciones se vea también sombreado
      const dFin = new Date(v.fecha_fin); dFin.setDate(dFin.getDate() + 1); 
      return { id: `vacacion-${v.id}`, title: `Ausencia: ${v.usuario_nombre}`, start: `${new Date(v.fecha_inicio).getFullYear()}-${String(new Date(v.fecha_inicio).getMonth() + 1).padStart(2, '0')}-${String(new Date(v.fecha_inicio).getDate()).padStart(2, '0')}`, end: `${dFin.getFullYear()}-${String(dFin.getMonth() + 1).padStart(2, '0')}-${String(dFin.getDate()).padStart(2, '0')}`, allDay: true, backgroundColor: '#f59e0b', borderColor: '#f59e0b', extendedProps: { usuario_nombre: v.usuario_nombre, grupo_nombre: v.grupo_nombre, id_real: v.id }};
  });

  const eventosFestivosFormateados = festivos.map((f, i) => ({ id: `festivo-${i}`, title: f.name, date: f.date.iso.split('T')[0], allDay: true, backgroundColor: 'var(--danger-color)', borderColor: 'var(--danger-color)' }));
  
  const todosLosEventos = [...eventosCalendario, ...eventosVacaciones, ...eventosCumpleanos, ...eventosFestivosFormateados];

  // el filtro de '-proy-' descarta las ocurrencias futuras "fantasma" que
  // useTareas genera para pintar tareas recurrentes en el calendario; en el
  // backlog solo interesa la tarea real, no sus proyecciones
  const backlogOrdenado = [...tareasFiltradas.filter(t => !t.id.toString().includes('-proy-'))].filter(t => t.estado !== 'Completado').sort((a, b) => {
        if (!a.fecha_vencimiento) return 1; if (!b.fecha_vencimiento) return -1; return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento);
  });
  
  const datosGraficoEstado = [ { name: 'Por Hacer', value: tareasPorHacer.length, color: '#ef4444' }, { name: 'En Progreso', value: tareasEnProgreso.length, color: '#3b82f6' }, { name: 'Completado', value: tareasCompletadas.length, color: '#10b981' } ];

  return (
    <div className="app-layout">
      <Toaster position="bottom-right" />

      <Sidebar 
          onVerPerfil={() => navigate('/perfil')} reproducirResumen={reproducirResumen}
          procesando={procesando} hablando={hablando} notificacionesPendientes={notificacionesPendientes} onVerNotificacion={(t) => { setTareaEnVista(t); cargarComentarios(t.id); }}
          filtroVista={filtroVista} setFiltroVista={setFiltroVista} misGrupos={misGrupos} temaOscuro={temaOscuro} setTemaOscuro={setTemaOscuro}
          nombreUsuario={nombreUsuario} onLogout={onLogout} menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto}  
      />

      <header className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setMenuAbierto(true)}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
          <h1 className="mobile-logo">Kora<span>.</span></h1>
          <div style={{width: '28px'}}></div> 
      </header>

      <main className="main-content">
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          
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
          
          <div style={{ flex: '2', minWidth: '0', width: '100%' }}>
            {/* el Outlet es de react-router: aquí se pinta la página hija que
                toque según la URL (tablero, métricas, equipos...), y el
                "context" es cómo le llega todo lo que ya se calculó aquí
                arriba sin tener que volver a pedirlo. Cada página hija lo lee
                con useOutletContext() en vez de recibirlo como props normales */}
            <Outlet context={{
                tareasPorHacer, tareasEnProgreso, tareasCompletadas, columnaDestino, setColumnaDestino,
                manejarDrop: manejarDropKanban, cambiarEstado, editarTarea: manejarEdicionTarea, borrarTarea: (id) => borrarTarea(id, setTareaEnVista), setTareaEnVista, cargarComentarios,
                datosGraficoEstado, backlogOrdenado
            }} />
          </div>
        </div>

        <div className="calendar-wrapper">
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '20px' }}>Cronograma</h2>
          <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin]} initialView="dayGridMonth" headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,multiMonthYear' }} events={todosLosEventos} height="auto" locale={esLocale} firstDay={1} eventClick={(info) => { if (info.event.id.startsWith('tarea-')) { const idExtraido = parseInt(info.event.id.split('-')[1], 10); const t = tareas.find(t => t.id === idExtraido); if (t) { setTareaEnVista(t); cargarComentarios(t.id); } } else if (info.event.id.startsWith('vacacion-')) { setVacacionEnVista(info.event.extendedProps); } }} />
        </div>

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

      <button className="fab-button" onClick={() => setModalNuevaTareaAbierto(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Tarea
      </button>

    </div>
  );
}

export default DashboardLayout;