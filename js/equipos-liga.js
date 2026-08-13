import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { inicializarMapaEquipos, añadirEquipoMapa, centrarMapaEnEquipos, centrarEnEquipoActivo, marcarEquipoSeleccionadoPorId } from '/js/mapa.js'; // Ajusta la ruta relativa según corresponda
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { activarGrabAndScroll } from '/js/utils/interaccion.js';
import { API_BASE_URL } from '/js/config.js';
import styleMorado from './mapstyles/style-morado.json';

const containerDisplay = document.getElementById('container-display')

export async function inicializarEquiposLiga(id){

    const equiposLiga = await equiposxliga(id);
    console.log(equiposLiga)

    displayEquipos(equiposLiga.success, document.getElementById('items-container'))
    cargarVistaMapaEquipos(equiposLiga.success);

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

// Función única para gestionar la clase CSS 'selected' y centrado
export function seleccionarEquipo(itemSeleccionado, container) {
    const items = container.querySelectorAll('.equipo-item');
    if (items.length === 0) return;

    // CASO 1: Si se hace clic o no se especifica item, tomamos el centro estricto del contenedor
    const containerRect = container.getBoundingClientRect();
    const centroContenedor = containerRect.left + (containerRect.width / 2);

    if (!itemSeleccionado) {
        let menorDistancia = Infinity;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const centroItem = itemRect.left + (itemRect.width / 2);
            const distancia = Math.abs(centroItem - centroContenedor);

            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                itemSeleccionado = item; // Asignamos la tarjeta más cercana al centro
            }
        });
    }

    // Aplicar la clase 'selected'
    if (itemSeleccionado && !itemSeleccionado.classList.contains('selected')) {
        items.forEach(item => item.classList.remove('selected'));
        itemSeleccionado.classList.add('selected');

        // Notificar al mapa la ID del equipo activo
        const equipoId = itemSeleccionado.dataset.id;
        marcarEquipoSeleccionadoPorId(equipoId);
    }
}

export function displayEquipos(data, container) {
    if (data.error) return;

    container.innerHTML = ''; // Limpiar contenedor por seguridad

    data.forEach((equipo) => {
        const equipoItem = document.createElement('div');
        const img = document.createElement('img');
        
        // 🎯 Contenedor envolvente para medir y recortar el texto
        const pWrapper = document.createElement('div');
        pWrapper.className = 'equipo-nombre-wrapper';
        
        const p = document.createElement('p');
        p.textContent = equipo.nombre;
        
        pWrapper.appendChild(p);

        equipoItem.className = 'equipo-item';
        equipoItem.dataset.id = equipo.id;
        img.src = equipo.escudo;

        equipoItem.appendChild(img);
        equipoItem.appendChild(pWrapper); // Añadir el wrapper en lugar de <p> directo

        container.appendChild(equipoItem);

        // Generar slug limpio para la URL
        const equipoSlug = (equipo.nombre || '')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '');

        // Manejo del evento Click
        equipoItem.addEventListener('click', () => {
            const yaEstaSeleccionado = equipoItem.classList.contains('selected');

            if (yaEstaSeleccionado) {
                // 🚀 Si ya es la tarjeta activa, navegar a la ficha del equipo
                window.location.href = `equipo_ficha.html?id=${equipo.id}&slug=${equipoSlug}`;
            } else {
                // 🎯 Si no está activa, centrarla y seleccionarla en el mapa
                equipoItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
                seleccionarEquipo(equipoItem, container);
            }
        });
    });

    activarSeleccionPorScroll(container);
    activarGrabAndScroll(container);

    // 🎯 Detectar desborde de texto una vez renderizados los elementos
    requestAnimationFrame(() => {
        ajustarTextosMarquee(container);

        const primerItem = container.querySelector('.equipo-item');
        if (primerItem) {
            primerItem.scrollIntoView({
                behavior: 'auto',
                block: 'nearest',
                inline: 'center'
            });
            seleccionarEquipo(primerItem, container);
        }
    });
}

// 🚀 Función para medir el exceso de ancho y activar la animación
function ajustarTextosMarquee(container) {
    const wrappers = container.querySelectorAll('.equipo-nombre-wrapper');
    wrappers.forEach((wrapper) => {
        const p = wrapper.querySelector('p');
        const item = wrapper.closest('.equipo-item');

        // Calcula cuánto espacio falta por mostrar
        const overflowDistance = p.scrollWidth - wrapper.clientWidth;

        if (overflowDistance > 2) {
            // Añade la clase que activa el keyframe y le pasa los píxeles exactos a trasladar
            item.classList.add('is-overflowing');
            p.style.setProperty('--overflow-distance', `-${overflowDistance + 6}px`);
        } else {
            item.classList.remove('is-overflowing');
        }
    });
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