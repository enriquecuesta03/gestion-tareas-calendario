/*********************************************************************************
Herramienta de Inteligencia Artificial y Voz (useKoraAI).
Este archivo contiene el cerebro de la asistente virtual. Se encarga de dos cosas 
principales: leer en voz alta el resumen de las tareas pendientes del día y 
escuchar al usuario cuando quiere dictar una tarea nueva, transformando su voz 
en texto y rellenando el formulario automáticamente.
***********************************************************************************/

import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Dirección de nuestro servidor para saber a dónde enviar y recibir los datos
const API_URL = import.meta.env.VITE_API_URL || 'https://kora-api-tfg.onrender.com';

export function useKoraAI({ 
    token, 
    nombreUsuario, 
    tareas, 
    formulariosActions 
}) {
    // Controlamos en qué estado se encuentra la asistente en cada momento
    const [hablando, setHablando] = useState(false);
    const [procesando, setProcesando] = useState(false); // Cuando la IA está pensando la respuesta
    const [escuchando, setEscuchando] = useState(false); // Cuando el micrófono está encendido
    const [analizandoVoz, setAnalizandoVoz] = useState(false); // Cuando convierte la voz en texto
    
    // Referencias internas para controlar el audio y el micrófono sin perderlos de vista
    const audioRef = useRef(null);
    const audioUrlRef = useRef(null);
    const reconocimientoRef = useRef(null);
    const textoDictadoRef = useRef('');

    // Preparamos la llave de seguridad para que el servidor nos deje usar la Inteligencia Artificial
    const headersConAuth = () => ({ 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
    });

    // Limpieza de seguridad: si cerramos la pantalla, apagamos el audio y el micrófono para no consumir recursos
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

    // 1. LEER EL RESUMEN DIARIO EN VOZ ALTA (VERSIÓN 2.0 - ELEVENLABS)
    const reproducirResumen = async () => {
        // Si Kora ya está hablando y le damos al botón, se calla y se detiene
        if (hablando && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setHablando(false);
            return;
        }
        // Si ya le hemos pedido que hable y está pensando, no hacemos nada
        if (procesando) return;
        
        setProcesando(true);
        try {
            // Cogemos solo las tareas que no están terminadas
            const tareasPendientes = tareas.filter(t => t.estado !== 'Completado');
            console.log("KORA VOZ 2.0 - Pidiendo guion a Gemini...");
            
            // 1. Pedimos SOLO EL TEXTO al backend
            const respuestaTexto = await fetch(`${API_URL}/api/briefing`, {
                method: 'POST', 
                headers: headersConAuth(), 
                body: JSON.stringify({ tareas: tareasPendientes, nombre: nombreUsuario })
            });
            
            if (!respuestaTexto.ok) throw new Error("Fallo al generar el guion en el backend");
            const dataTexto = await respuestaTexto.json();
            console.log("Texto recibido:", dataTexto.texto);

            // 2. Pedimos el audio a nuestro propio backend (que llama a ElevenLabs por nosotros)
            const respuestaAudio = await fetch(`${API_URL}/api/tts`, {
                method: 'POST',
                headers: headersConAuth(),
                body: JSON.stringify({ texto: dataTexto.texto })
            });

            if (!respuestaAudio.ok) {
                const errorEleven = await respuestaAudio.text();
                console.error("ERROR DE ELEVENLABS:", errorEleven);
                throw new Error("El servidor no pudo generar el audio");
            }
            
            // 3. Convertimos y reproducimos el MP3 real
            const audioBlob = await respuestaAudio.blob();
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            const audioUrl = URL.createObjectURL(audioBlob);
            audioUrlRef.current = audioUrl; 
            
            const reproductor = new Audio(audioUrl);
            audioRef.current = reproductor;
            
            // Cuando termine de hablar, apagamos todo
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
            console.error("DETALLE DEL ERROR DE VOZ:", error);
            toast.error("Fallo de voz: " + error.message.substring(0, 50));
            setProcesando(false); 
            setHablando(false); 
            audioRef.current = null;
        }
    };

    // 2. ESCUCHAR Y ENTENDER LA VOZ DEL USUARIO
    const procesarVoz = () => {
        // Si ya nos estaba escuchando, apagamos el micrófono
        if (escuchando) {
            if (reconocimientoRef.current) reconocimientoRef.current.stop();
            return;
        }
        
        // Comprobamos si el navegador del usuario tiene soporte para grabar voz
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Tu navegador no soporta entrada de voz.");
            return;
        }
        
        // Configuramos el micrófono para que entienda el español y nos escuche del tirón
        const reconocimiento = new SpeechRecognition();
        reconocimientoRef.current = reconocimiento;
        reconocimiento.lang = 'es-ES'; 
        reconocimiento.continuous = true; 
        reconocimiento.interimResults = false; 
        textoDictadoRef.current = ''; 

        // Avisamos a la aplicación de que el micrófono ya está encendido
        reconocimiento.onstart = () => setEscuchando(true);
        
        // Conforme vamos hablando, juntamos todas las palabras en una frase
        reconocimiento.onresult = (event) => {
            let textoTemporal = '';
            for (let i = 0; i < event.results.length; i++) {
                textoTemporal += event.results[i][0].transcript + ' ';
            }
            textoDictadoRef.current = textoTemporal.trim();
        };

        // Cuando dejamos de hablar o apagamos el micrófono, mandamos el texto a la IA
        reconocimiento.onend = async () => {
            setEscuchando(false);
            const textoFinal = textoDictadoRef.current;
            if (!textoFinal) return; 
            
            setAnalizandoVoz(true); 
            try {
                console.log("Enviando transcripción a Kora:", textoFinal);
                
                // Enviamos lo que hemos dicho al servidor para que lo clasifique y ordene
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
                
                // Rellenamos el formulario automáticamente con lo que la IA ha entendido
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
                console.error("DETALLE DEL ERROR DE EXTRACCIÓN:", error);
                toast.error("Error de IA: " + error.message.substring(0, 50)); 
            } finally { 
                setAnalizandoVoz(false); 
            }
        };
        
        // Encendemos el micrófono
        reconocimiento.start();
    };

    return { hablando, procesando, escuchando, analizandoVoz, reproducirResumen, procesarVoz };
}