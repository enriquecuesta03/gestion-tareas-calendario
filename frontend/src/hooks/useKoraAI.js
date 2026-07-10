import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Usamos el .env si existe, o el backend de producción
const API_URL = import.meta.env.VITE_API_URL || 'https://kora-api-tfg.onrender.com';

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
    const audioUrlRef = useRef(null);
    const reconocimientoRef = useRef(null);
    const textoDictadoRef = useRef('');

    const headersConAuth = () => ({ 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
    });

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
            
            console.log("🎙️ Pidiendo audio a:", `${API_URL}/api/briefing`);
            
            const respuesta = await fetch(`${API_URL}/api/briefing`, {
                method: 'POST', 
                headers: headersConAuth(), 
                body: JSON.stringify({ tareas: tareasPendientes, nombre: nombreUsuario })
            });
            
            if (!respuesta.ok) {
                // Sacamos el error real que escupe el servidor
                const errorTexto = await respuesta.text();
                throw new Error(`Código ${respuesta.status}: ${errorTexto}`);
            }
            
            const audioBlob = await respuesta.blob();
            
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            const audioUrl = URL.createObjectURL(audioBlob);
            audioUrlRef.current = audioUrl; 
            
            const reproductor = new Audio(audioUrl);
            audioRef.current = reproductor;
            
            reproductor.onended = () => { 
                setHablando(false); 
                audioRef.current = null; 
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
            };
            
            setProcesando(false);
            setHablando(true);
            await reproductor.play();
            
        } catch (error) {
            console.error("🕵️‍♂️ DETALLE DEL ERROR DE VOZ:", error);
            
            if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
                toast.error("El servidor está apagado o bloqueando la conexión (CORS).");
            } else {
                // Mostramos el error real en el toast (limitado a 50 letras para no desbordar)
                toast.error("Fallo del servidor: " + error.message.substring(0, 50));
            }
            
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
            toast.error("Tu navegador no soporta entrada de voz (Usa Chrome/Edge).");
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
                console.log("🧠 Enviando transcripción a Kora:", textoFinal);
                
                const respuesta = await fetch(`${API_URL}/api/extraer-tarea`, {
                    method: 'POST', 
                    headers: headersConAuth(), 
                    body: JSON.stringify({ 
                        texto: textoFinal, 
                        estadoActual: formulariosActions.estadoActual 
                    })
                });
                
                if (!respuesta.ok) {
                    const errorTexto = await respuesta.text();
                    throw new Error(`Código ${respuesta.status}: ${errorTexto}`);
                }
                
                const datosEstructurados = await respuesta.json();
                
                if (datosEstructurados.titulo !== undefined) formulariosActions.setTitulo(datosEstructurados.titulo);
                if (datosEstructurados.descripcion !== undefined) formulariosActions.setDescripcion(datosEstructurados.descripcion);
                if (datosEstructurados.fecha !== undefined) formulariosActions.setFecha(datosEstructurados.fecha);
                if (datosEstructurados.hora !== undefined) formulariosActions.setHora(datosEstructurados.hora);
                if (datosEstructurados.repeticion !== undefined) formulariosActions.setRepeticion(datosEstructurados.repeticion);
                if (datosEstructurados.opcionAviso !== undefined && datosEstructurados.opcionAviso !== formulariosActions.opcionAviso) {
                    formulariosActions.manejarCambioAviso({ target: { value: datosEstructurados.opcionAviso } });
                }
                
                toast.success("Mágia hecha: Datos extraídos");
            } catch (error) { 
                console.error("🕵️‍♂️ DETALLE DEL ERROR DE EXTRACCIÓN:", error);
                toast.error("Error de IA: " + error.message.substring(0, 50)); 
            } finally { 
                setAnalizandoVoz(false); 
            }
        };
        
        reconocimiento.start();
    };

    return { hablando, procesando, escuchando, analizandoVoz, reproducirResumen, procesarVoz };
}