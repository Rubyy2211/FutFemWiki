// js/config.js
import { SpeedInsights } from "@vercel/speed-insights/next"

// Configuración global de URLs de la API
export const API_BASE_URL = 'https://futfemgames.onrender.com';
//export const API_BASE_URL = "http://127.0.0.1:8000"

// Opcional: Puedes guardar sub-rutas o configuraciones útiles aquí
export const API_ENDPOINTS = {
    jugadoras: `${API_BASE_URL}/api/jugadoras`,
    equipos: `${API_BASE_URL}/api/equipos`,
    randomPlayer: `${API_BASE_URL}/api/random-player/`,
};