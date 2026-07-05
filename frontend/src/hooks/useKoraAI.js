import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.54:3000';

export function useKoraAI({ 
    token, 
    nombreUsuario, 
    tareas, 
    formulariosActions 
}) {
    const [hablando, setHablando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [escuchando, setEscuchando] = useState(false);
    const [analizandoVoz, setAnalizandoVoz] = useState(false);
    
    const audioRef = useRef(null);
    const audioUrlRef = useRef(null); // Ref para guardar la URL del blob y poder borrarla
    const reconocimientoRef = useRef(null);
    const textoDictadoRef = useRef('');

    const headersConAuth = () => ({ 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
    });

    // LIMPIEZA DE MEMORIA: Se ejecuta si el usuario cambia de página de golpe
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
            }
            if (reconocimientoRef.current) {
                reconocimientoRef.current.stop();
            }
        };
    }, []);

    // 1. LÓGICA DEL DAILY BRIEFING
    const reproducirResumen = async () => {
        // Si ya está hablando, lo paramos
        if (hablando && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setHablando(false);
            return;
        }
        if (procesando) return;
        
        setProcesando(true);
        try {
            const tareasPendientes = tareas.filter(t => t.estado !== 'Completado');
            const respuesta = await fetch(`${API_URL}/api/briefing`, {
                method: 'POST', 
                headers: headersConAuth(), 
                body: JSON.stringify({ tareas: tareasPendientes, nombre: nombreUsuario })
            });
            
            if (!respuesta.ok) throw new Error("No se pudo obtener el flujo de audio");
            
            const audioBlob = await respuesta.blob();
            
            // Limpiamos el blob anterior si existía para no saturar la RAM
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            
            const audioUrl = URL.createObjectURL(audioBlob);
            audioUrlRef.current = audioUrl; // Lo guardamos en la referencia
            
            const reproductor = new Audio(audioUrl);
            audioRef.current = reproductor;
            
            reproductor.onended = () => { 
                setHablando(false); 
                audioRef.current = null; 
                // Borramos el blob de la memoria cuando termina
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
            };
            
            setProcesando(false);
            setHablando(true);
            await reproductor.play();
        } catch (error) {
            toast.error("Error de conexión con el servicio de voz");
            setProcesando(false); 
            setHablando(false); 
            audioRef.current = null;
        }
    };

    // 2. LÓGICA DEL DICTADO POR VOZ
    const procesarVoz = () => {
        if (escuchando) {
            if (reconocimientoRef.current) reconocimientoRef.current.stop();
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Entrada de voz no soportada en este navegador.");
            return;
        }
        
        const reconocimiento = new SpeechRecognition();
        reconocimientoRef.current = reconocimiento;
        reconocimiento.lang = 'es-ES'; 
        reconocimiento.continuous = true; 
        reconocimiento.interimResults = false; 
        textoDictadoRef.current = ''; 

        reconocimiento.onstart = () => setEscuchando(true);
        
        reconocimiento.onresult = (event) => {
            let textoTemporal = '';
            for (let i = 0; i < event.results.length; i++) {
                textoTemporal += event.results[i][0].transcript + ' ';
            }
            textoDictadoRef.current = textoTemporal.trim();
        };

        reconocimiento.onend = async () => {
            setEscuchando(false);
            const textoFinal = textoDictadoRef.current;
            if (!textoFinal) return; 
            
            setAnalizandoVoz(true); 
            try {
                const respuesta = await fetch(`${API_URL}/api/extraer-tarea`, {
                    method: 'POST', 
                    headers: headersConAuth(), 
                    body: JSON.stringify({ 
                        texto: textoFinal, 
                        estadoActual: formulariosActions.estadoActual 
                    })
                });
                
                if (!respuesta.ok) throw new Error("Fallo en extracción");
                
                const datosEstructurados = await respuesta.json();
                
                if (datosEstructurados.titulo !== undefined) formulariosActions.setTitulo(datosEstructurados.titulo);
                if (datosEstructurados.descripcion !== undefined) formulariosActions.setDescripcion(datosEstructurados.descripcion);
                if (datosEstructurados.fecha !== undefined) formulariosActions.setFecha(datosEstructurados.fecha);
                if (datosEstructurados.hora !== undefined) formulariosActions.setHora(datosEstructurados.hora);
                if (datosEstructurados.repeticion !== undefined) formulariosActions.setRepeticion(datosEstructurados.repeticion);
                if (datosEstructurados.opcionAviso !== undefined && datosEstructurados.opcionAviso !== formulariosActions.opcionAviso) {
                    formulariosActions.manejarCambioAviso({ target: { value: datosEstructurados.opcionAviso } });
                }
                
                toast.success("Datos extraídos correctamente");
            } catch (error) { 
                toast.error("No se pudo procesar la instrucción de voz"); 
            } finally { 
                setAnalizandoVoz(false); 
            }
        };
        
        reconocimiento.start();
    };

    return { hablando, procesando, escuchando, analizandoVoz, reproducirResumen, procesarVoz };
}