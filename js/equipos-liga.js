import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { inicializarMapaEquipos, añadirEquipoMapa, centrarMapaEnEquipos } from '/js/mapa.js'; // Ajusta la ruta relativa según corresponda
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { getDominantColors,  rgbToRgba } from '/js/utils/color-thief.js';
import { API_BASE_URL } from '/js/config.js';

const containerDisplay = document.getElementById('container-display')

export async function inicializarEquiposLiga(id){

    const equiposLiga = await equiposxliga(id);
    console.log(equiposLiga)

    displayEquipos(equiposLiga.success, document.getElementById('items-container'))
    cargarVistaMapaEquipos(equiposLiga.success);

}

export function displayEquipos(data, container) {
   
    //dropdownMenuLigas.innerHTML = '';

    if (data.error) {
        //dropdownMenuLigas.innerHTML = `<li class="dropdown-item error">Error: ${data.error}</li>`;
        return;
    }

    data.forEach(async (equipo, index) => {
        const equipoItem = document.createElement('div');
        const img = document.createElement('img');
        const p = document.createElement('p');
        equipoItem.className = 'equipo-item';
        equipoItem.dataset.id = equipo.id_liga || equipo.id; // Asegura capturar la ID
        img.src = equipo.escudo;
        p.textContent = equipo.nombre;
        equipoItem.appendChild(img);
        equipoItem.appendChild(p);

        //img.crossOrigin = 'anonymous'
        /*img.onload = async () => {
            try {
                const colors = await getDominantColors(img, 4);

                console.log(colors)

                colors.forEach((color, index) => {
                    // Si 'color' viene como array [r, g, b], lo formateamos a rgb()
                    const colorFormatted = Array.isArray(color) 
                        ? `rgb(${color.join(',')})` 
                        : color;

                    // CORRECCIÓN: Usar .style.setProperty y ajustar el índice a 1..4
                    ligaItem.style.setProperty(`--liga-color-${index + 1}`, colorFormatted);
                });
            } catch (error) {
                console.error('Error extrayendo colores de la imagen:', error);
            }
        };*/
        container.appendChild(equipoItem);

        // NAVEGACIÓN HACIA LA PÁGINA DE LA LIGA
        equipoItem.addEventListener('click', () => {
            const ligaSlug = (equipo.nombre || '')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '');

            // Redirige a la página dedicada de la liga
            window.location.href = `liga.html?id=${liga.liga || liga.id}&slug=${ligaSlug}`;
        });
    });
}

export async function cargarVistaMapaEquipos(equipos) {
    if (!containerDisplay) return;

    // 1. Inyectar el contenedor del mapa en containerDisplay con estilos mínimos
    containerDisplay.innerHTML = `
        <div class="mapa-wrapper" style="width: 100%; height: 500px; position: relative; border-radius: 16px; overflow: hidden;">
            <div id="mapa-equipos" style="width: 100%; height: 100%;"></div>
        </div>
    `;

    // 2. Inicializar MapLibre
    const map = inicializarMapaEquipos();

    // 3. Añadir los marcadores cuando el mapa termine de cargar su estilo base
    const renderizarMarcadores = () => {
        equipos.forEach(equipo => {
            // Asegúrate de que los nombres de propiedades coincidan con los de tu backend
            const { id, nombre, lat, lon, escudo, color } = equipo;
            
            añadirEquipoMapa(
                id,
                nombre,
                lat,
                lon,
                escudo,
                color || '#c000ff' // Fallback si no hay color
            );
        });

        // Centrar automáticamente la cámara en el grupo de estadios cargados
        centrarMapaEnEquipos();
    };

    if (map.isStyleLoaded()) {
        renderizarMarcadores();
    } else {
        map.once('load', renderizarMarcadores);
    }
}