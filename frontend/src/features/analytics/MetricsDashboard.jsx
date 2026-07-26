/*********************************************************************************
Panel de métricas y estadísticas (MetricsDashboard).
Este componente dibuja la pantalla donde el usuario puede ver los gráficos 
de rendimiento. Incluye un gráfico redondo que muestra cuántas tareas hay 
en cada estado, un contador rápido de las tareas terminadas frente a las 
pendientes y una lista (backlog) con todo el trabajo que queda por hacer, 
ordenado por fecha de entrega.
***********************************************************************************/

import React from 'react';

// Importamos las herramientas de la librería Recharts para dibujar los gráficos matemáticos
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function MetricsDashboard({ 
    datosGraficoEstado, 
    tareasCompletadas, 
    tareasPorHacer, 
    tareasEnProgreso, 
    backlogOrdenado, 
    setTareaEnVista, 
    cargarComentarios,
    editarTarea
}) {
    // 1. ASIGNACIÓN DE COLORES PARA EL GRÁFICO
    // Cogemos los datos que nos llegan y le asignamos un color específico a cada trozo del pastel
    const datosConColoresPremium = datosGraficoEstado.map(dato => {
        if (dato.name === 'Por Hacer') return { ...dato, color: '#f59e0b' }; // Naranja
        if (dato.name === 'En Progreso') return { ...dato, color: '#3b82f6' }; // Azul
        if (dato.name === 'Completado') return { ...dato, color: '#10b981' }; // Verde de la marca Kora
        return dato;
    });

    // 2. DISEÑO DEL CARTELITO DE INFORMACIÓN (TOOLTIP)
    // Esto es lo que aparece cuando el usuario pasa el ratón por encima de un trozo del gráfico
    const CustomTooltip = ({ active, payload }) => {
        // Solo lo dibujamos si el ratón está encima (active) y hay datos reales
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontWeight: '600', fontSize: '0.9rem' }}>{payload[0].name}</p>
                    <p style={{ margin: 0, color: payload[0].payload.color, fontWeight: '800', fontSize: '1.1rem' }}>
                        {payload[0].value} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>tareas</span>
                    </p>
                </div>
            );
        }
        return null; // Si no hay ratón encima, lo ocultamos
    };

    // Función para mostrar los números justo al lado de los trozos del pastel
    const renderizarEtiqueta = ({ name, value }) => {
        // Si hay cero tareas en esa categoría, no ponemos ningún número para que quede más limpio
        if (value === 0) return null; 
        return `${value}`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Estilos integrados para asegurar que los gráficos se ven bien tanto en el móvil como en PC */}
            <style>{`
                .metrics-top-row { display: flex; gap: 20px; flex-wrap: wrap; }
                .metric-card { flex: 1 1 300px; background-color: var(--bg-card); padding: 25px; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 4px 15px rgba(0,0,0,0.03); box-sizing: border-box; }
                .backlog-container { background-color: var(--bg-card); padding: 25px; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
                .backlog-header { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 15px; padding: 12px 15px; border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .backlog-item { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 15px; align-items: center; padding: 16px 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background-color 0.2s ease; }
                .backlog-item:hover { background-color: var(--bg-body); }

                /* Forzamos que la leyenda de los colores use la misma letra y color que el resto de la app */
                .recharts-default-legend { padding-top: 15px !important; }
                .recharts-legend-item-text { color: var(--text-main) !important; font-family: var(--font-main); font-weight: 500; }

                /* En teléfonos móviles, reordenamos la lista de tareas para que sea vertical en vez de una tabla horizontal */
                @media (max-width: 768px) {
                    .metrics-top-row { gap: 15px; }
                    .metric-card { padding: 20px; min-width: 100%; }
                    .backlog-container { padding: 20px 15px; }
                    .backlog-header { display: none; }
                    .backlog-item { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 20px; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 12px; background-color: var(--bg-body); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                    .backlog-item:last-child { margin-bottom: 0; }
                    .mobile-row-wrapper { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                    .mobile-full-btn { width: 100%; padding: 12px !important; font-size: 0.95rem !important; font-weight: 600 !important; margin-top: 8px; display: flex; justify-content: center; align-items: center; gap: 8px; }
                }
                @media (min-width: 769px) { .mobile-row-wrapper { display: contents; } }
            `}</style>

            <div className="metrics-top-row">
                
                {/* CAJA IZQUIERDA: El gráfico de pastel */}
                <div className="metric-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
                    <h3 className="section-title" style={{ textAlign: 'center', borderBottom: 'none', margin: '0 0 10px 0' }}>Distribución de Carga Operativa</h3>
                    <div style={{ flex: 1, width: '100%' }}>
                        {/* Esta caja ajusta el tamaño del gráfico automáticamente si estiramos la ventana */}
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={datosConColoresPremium} 
                                    cx="50%" cy="50%" 
                                    innerRadius={55} 
                                    outerRadius={85} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    label={renderizarEtiqueta}
                                    stroke="var(--bg-card)" // Le ponemos el borde del mismo color que el fondo para que se vean separados
                                    strokeWidth={2}
                                >
                                    {/* Pintamos cada porción con el color que definimos al principio */}
                                    {datosConColoresPremium.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                {/* Añadimos el cartelito y la leyenda de colores */}
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CAJA DERECHA: Los contadores numéricos rápidos */}
                <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
                    <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '20px' }}>Rendimiento General</h3>
                    
                    <div style={{ textAlign: 'center', margin: '15px 0' }}>
                        {/* Número grande verde con las tareas hechas */}
                        <div style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--accent-green)', lineHeight: '1', textShadow: '0 4px 10px rgba(16,185,129,0.2)' }}>
                            {tareasCompletadas.length}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>
                            Tareas Finalizadas
                        </div>
                    </div>

                    {/* Línea divisoria */}
                    <div style={{ width: '60%', height: '2px', backgroundColor: 'var(--border-color)', margin: '20px 0', borderRadius: '2px' }}></div>

                    <div style={{ textAlign: 'center', margin: '15px 0' }}>
                        {/* Número grande con las tareas que quedan sumando las dos columnas */}
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1' }}>
                            {tareasPorHacer.length + tareasEnProgreso.length}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>
                            Pendientes Restantes
                        </div>
                    </div>
                </div>
            </div>

            {/* ZONA INFERIOR: La lista completa de tareas pendientes (Backlog) */}
            <div className="backlog-container">
                <h3 className="section-title" style={{ marginBottom: '20px' }}>Backlog Global</h3>
                
                <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '5px' }}>
                    {/* Si no hay tareas pendientes, mostramos un mensaje bonito de victoria */}
                    {backlogOrdenado.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: 'var(--bg-body)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" style={{ color: 'var(--text-muted)', marginBottom: '15px', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <p style={{ color: 'var(--text-main)', margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>Bandeja impecable</p>
                            <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', fontSize: '0.9rem' }}>No hay tareas atascadas en el sistema.</p>
                        </div>
                    ) : (
                        <div className="backlog-list">
                            {/* Cabecera de la tabla (Solo se ve en PC) */}
                            <div className="backlog-header">
                                <div>Referencia</div>
                                <div>Estado Actual</div>
                                <div>Vencimiento</div>
                                <div style={{ textAlign: 'center' }}>Acciones</div>
                            </div>
                            
                            {/* Imprimimos cada tarea como una fila en la lista */}
                            {backlogOrdenado.map(tarea => (
                                <div 
                                    key={tarea.id} 
                                    className="backlog-item" 
                                    onClick={() => { setTareaEnVista(tarea); cargarComentarios(tarea.id); }} // Si le damos clic, se abre la ventana con los detalles
                                >
                                    <div style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '1.05rem', wordBreak: 'break-word', lineHeight: '1.3' }}>
                                        {tarea.titulo}
                                    </div>
                                    
                                    <div className="mobile-row-wrapper">
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {/* Pintamos la etiqueta del estado de un color u otro */}
                                            <span style={{ 
                                                padding: '6px 12px', 
                                                borderRadius: '16px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                backgroundColor: tarea.estado === 'En Progreso' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                                                color: tarea.estado === 'En Progreso' ? '#3b82f6' : '#f59e0b' 
                                            }}>
                                                {tarea.estado}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            {/* Si tiene fecha límite la mostramos formateada, si no, ponemos que no tiene asignada */}
                                            {tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin asignar'}
                                        </div>
                                    </div>

                                    {/* Botón rápido para abrir el formulario y editarla */}
                                    <div style={{ textAlign: 'center', width: '100%' }}>
                                        <button 
                                            className="btn-action mobile-full-btn" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); // Evita que se abra también la ventana de detalles al darle a este botón
                                                editarTarea(tarea); 
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="desktop-hide" style={{ display: 'none' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            Editar
                                        </button>
                                        <style>{`
                                            /* Hacemos que el icono del lápiz solo salga en el móvil */
                                            @media (max-width: 768px) { .desktop-hide { display: block !important; } }
                                        `}</style>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MetricsDashboard;