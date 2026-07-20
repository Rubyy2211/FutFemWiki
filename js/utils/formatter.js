import { API_BASE_URL } from '../config.js';

/**
 * Normaliza la URL de una imagen para asegurar que cargue
 * tanto si viene de Cloudinary como si es relativa o vacía.
 */
export function obtenerUrlImagen(pathImagen, imagenPredeterminada = './img/predeterm.jpg') {
    if (!pathImagen) {
        return imagenPredeterminada;
    }

    // 1. Si ya es una URL completa (Cloudinary, AWS, HTTP/HTTPS externa)
    if (pathImagen.startsWith('http://') || pathImagen.startsWith('https://')) {
        return pathImagen;
    }

    // 2. Si es una ruta relativa que viene del backend Django (ej: /media/fotos/...)
    if (pathImagen.startsWith('/')) {
        return `${API_BASE_URL}${pathImagen}`;
    }

    // 3. Si viene sin la barra inicial
    return `${API_BASE_URL}/${pathImagen}`;
}