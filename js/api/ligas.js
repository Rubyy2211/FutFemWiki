import { API_BASE_URL } from '../config.js';

export async function fetchLigasById(ids){
    // Generar la URL para obtener las banderas con IDs como parámetros de consulta
    const response = await fetch(`${API_BASE_URL}/api/ligasxid?id[]=${ids.join('&id[]=')}`)
    if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
    }
    const data = await response.json();
    if (data !== null) {
        return data.success;
    } else {
        return null;
    }
}