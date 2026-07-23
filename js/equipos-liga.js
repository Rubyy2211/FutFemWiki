import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { inicializarMapaEquipos, añadirEquipoMapa, centrarMapaEnEquipos, centrarEnEquipoActivo, marcarEquipoSeleccionadoPorId } from '/js/mapa.js'; // Ajusta la ruta relativa según corresponda
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { activarGrabAndScroll } from '/js/utils/interaccion.js';
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
        equipoItem.dataset.id = equipo.id || equipo.id; // Asegura capturar la ID
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
            window.location.href = `equipo_ficha.html?id=${equipo.id || equipo.id}&slug=${ligaSlug}`;
        });
    });

    activarSeleccionPorScroll(container);
    activarGrabAndScroll(container);
    requestAnimationFrame(() => {
        actualizarElementoActivo(container);
    });
}

export async function cargarVistaMapaEquipos(equipos) {
    if (!containerDisplay || !equipos || equipos.length === 0) return;

    // 1. Inyectar contenedor del mapa
    containerDisplay.innerHTML = `
        <div class="mapa-wrapper" style="width: 100%; height: 500px; position: relative; border-radius: 16px; overflow: hidden;">
            <div id="mapa-equipos" style="width: 100%; height: 100%;"></div>
        </div>
    `;

    // 🎯 2. CALCULAR CENTRO INICIAL: Promedio de coordenadas de tus equipos
    let sumLat = 0;
    let sumLon = 0;
    let validos = 0;

    equipos.forEach(eq => {
        const lat = parseFloat(eq.lat);
        const lon = parseFloat(eq.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
            sumLat += lat;
            sumLon += lon;
            validos++;
        }
    });

    // Si hay coordenadas válidas calculamos la media; si no, fallback
    const centroInicial = validos > 0 
        ? [sumLon / validos, sumLat / validos] 
        : [7, 40];

    // 🎯 3. Inicializar el mapa NACIENDO ya en las coordenadas calculadas
    const map = inicializarMapaEquipos(centroInicial);

    // 4. Renderizar marcadores
    const renderizarMarcadores = () => {
        equipos.forEach(equipo => {
            const { id, nombre, lat, lon, escudo, color } = equipo;
            añadirEquipoMapa(id, nombre, lat, lon, escudo, color || '#c000ff');
        });

        // Ajuste fino instantáneo (duración 0) para ajustar el zoom exacto con padding
        centrarEnEquipoActivo(true)
    };

    if (map.isStyleLoaded()) {
        renderizarMarcadores();
    } else {
        map.once('load', renderizarMarcadores);
    }
}

// Función única para gestionar la clase CSS 'selected'
export function seleccionarEquipo(itemSeleccionado, container) {
    const items = container.querySelectorAll('.equipo-item');
    if (items.length === 0) return;

    // CASO 1: Si no se pasa un ítem específico, lo calculamos por porcentaje de scroll
    if (!itemSeleccionado) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        const porcentajeScroll = maxScroll > 0 ? (container.scrollLeft / maxScroll) : 0;
        const containerRect = container.getBoundingClientRect();
        
        // Punto de referencia dinámico (de 0% a 100% de la pantalla)
        const puntoReferencia = containerRect.left + (porcentajeScroll * containerRect.width);

        let menorDistancia = Infinity;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const centroItem = itemRect.left + (itemRect.width / 2);
            const distancia = Math.abs(centroItem - puntoReferencia);

            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                itemSeleccionado = item; // Asignamos el más cercano
            }
        });
    }

    // CASO 2: Aplicamos la clase 'selected'
    // 2. Aplicamos la clase 'selected' a la tarjeta
    if (itemSeleccionado && !itemSeleccionado.classList.contains('selected')) {
        items.forEach(item => item.classList.remove('selected'));
        itemSeleccionado.classList.add('selected');

        // 🎯 AQUÍ ESTÁ LA CLAVE: Notificar al mapa cuál es la ID del equipo activo
        const equipoId = itemSeleccionado.dataset.id;
        marcarEquipoSeleccionadoPorId(equipoId);
    }
}

// Función que detecta cuál es el equipo más cercano según el scroll
export function activarSeleccionPorScroll(container) {
    let ticking = false;

    container.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Pasamos null para que la función calcule cuál es el más cercano por scroll
                seleccionarEquipo(null, container);
                ticking = false;
            });
            ticking = true;
        }
    });
}

function actualizarElementoActivo(container) {
    const items = container.querySelectorAll('.equipo-item');
    if (items.length === 0) return;

    // 1. Calculamos cuánto porcentaje de scroll hemos recorrido (de 0.0 a 1.0)
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    // Evitamos división por cero si no hay scroll disponible
    const porcentajeScroll = maxScroll > 0 ? (container.scrollLeft / maxScroll) : 0;

    // 2. Mapeamos ese porcentaje dinámicamente a la zona activa visual
    const containerRect = container.getBoundingClientRect();
    
    // Punto de referencia que viaja desde el borde izquierdo (0%) al borde derecho (100%)
    const puntoReferencia = containerRect.left + (porcentajeScroll * containerRect.width);

    let itemMasCercano = null;
    let menorDistancia = Infinity;

    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        // Centro propio de cada tarjeta
        const centroItem = itemRect.left + (itemRect.width / 2);
        
        const distancia = Math.abs(centroItem - puntoReferencia);

        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            itemMasCercano = item;
        }
    });

    // 3. Aplicamos la clase al elemento correspondiente
    if (itemMasCercano && !itemMasCercano.classList.contains('selected')) {
        items.forEach(item => item.classList.remove('selected'));
        itemMasCercano.classList.add('selected');
    }
}