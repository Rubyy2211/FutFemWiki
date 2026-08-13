import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { getDominantColors,  rgbToRgba } from '/js/utils/color-thief.js';
import { API_BASE_URL } from '/js/config.js';

const containerDisplay = document.getElementById('container-display')

export async function inicializarLigas(){

    const paisesConLigas = await obtenerPaisesConLigas();

    const sectionWiki = document.getElementById('wiki-equipos');
    const container = document.getElementById('container-display');
    const cabecera = document.getElementById('cabecera-wiki-equipos');
    const cabeceraLigas = document.getElementById('cabecera-equipo');
    const cabeceraJugadoras = document.getElementById('cabecera-jugadora');

    // UI Dropdown Personalizado: Países
    const dropdownMenuPais = document.getElementById('dropdown-pais-list');
    const dropdownBtnPais = document.getElementById('dropdown-pais-btn');
    const selectedFlagPais = document.getElementById('selected-flag');
    const selectedTextPais = document.getElementById('selected-text');

    // UI Dropdown Personalizado: Ligas
    const dropdownMenuLigas = document.getElementById('dropdown-liga-list');
    const dropdownBtnLiga = document.getElementById('dropdown-liga-btn');

    await displayPaises(paisesConLigas);

    // ==========================================
    // 2. COMPORTAMIENTO DE APERTURA/CIERRE (DROPDOWNS)
    // ==========================================
    
    // Despliegue dropdown Países
    dropdownBtnPais.onclick = (e) => {
        e.stopPropagation();
        dropdownMenuPais.classList.toggle('open');
    };

    // Un solo listener global limpio para cerrar ambos menús si hacen clic fuera
    document.onclick = () => {
        dropdownMenuPais.classList.remove('open');
    };

    // ==========================================
    // 3. RENDERIZADO DEL DROPDOWN DE PAÍSES
    // ==========================================
    dropdownMenuPais.innerHTML = ''; // Limpieza anti-duplicados

    paisesConLigas.forEach(pais => {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.dataset.id = pais.id_pais;
        
        const codigoIso = pais.iso ? pais.iso.toLowerCase() : 'xx';

        li.innerHTML = `
            <span class="fi fi-${codigoIso}"></span>
            <span class="pais-name">${pais.nombre}</span>
        `;

        // Evento interactivo de selección
        li.addEventListener('click', () => {
            dropdownBtnPais.dataset.id = pais.iso;
            selectedTextPais.textContent = pais.nombre;
            selectedFlagPais.className = `fi fi-${codigoIso}`;
            
            dropdownMenuPais.classList.remove('open');
            
            const targetPais = document.getElementById(pais.iso);
            if (targetPais) {
                // Cálculo de posición relativa dentro del contenedor
                const containerTop = container.getBoundingClientRect().top;
                const targetTop = targetPais.getBoundingClientRect().top;
                const targetPosition = targetTop - containerTop + container.scrollTop;

                container.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });

        dropdownMenuPais.appendChild(li);
    });

    sectionWiki.classList.add('equipos');
    cabecera.classList.add('equipos');
    cabeceraLigas.classList.add('active');
    
    // 1. Buscamos España (ID: 1) dentro de los datos que devolvió la caché/API
    const paisPorDefecto = paisesConLigas.find(p => Number(p.id_pais) === 1);
    
    if (paisPorDefecto) {
        // 2. Forzamos a la maqueta visual a pintar España y su bandera de inicio
        dropdownBtnPais.dataset.id = paisPorDefecto.id_pais;
        selectedTextPais.textContent = paisPorDefecto.nombre;
        selectedFlagPais.className = `fi fi-${(paisPorDefecto.iso || 'xx').toLowerCase()}`;
    }
}

export function displayPaises(data) {
    
    const containerEquipos = document.getElementById('items-container');
    
    // Limpieza de seguridad: vaciamos el contenedor de equipos y el dropdown de ligas viejo
    containerEquipos.innerHTML = '';
    containerDisplay.innerHTML = '';
    //dropdownMenuLigas.innerHTML = '';

    if (data.error) {
        //dropdownMenuLigas.innerHTML = `<li class="dropdown-item error">Error: ${data.error}</li>`;
        return;
    }

    data.forEach(async (pais, index) => {

        console.log(pais)

        const containerPais = document.createElement('div');
        const headerPais = document.createElement('div');
        const elementosPais = document.createElement('div');
        containerPais.className = 'container-pais';
        containerPais.id = pais.iso;
        headerPais.id = 'header-'+pais.id_pais
        headerPais.className = 'header-pais';

        /*const foto = liga.logo;
        const fotoMini = foto.replace('/ligas/', '/ligas/mini/');*/

        elementosPais.innerHTML = `
            <span class="fi fi-${pais.iso}"></span>
            <span class="liga-name">${pais.nombre}</span>
        `;

        headerPais.appendChild(elementosPais);

        // Auto-selección de la primera liga del lote (Efecto por defecto)
        if (index === 0) {
            // Pequeño timeout para asegurar que el DOM ha procesado el elemento
            //setTimeout(() => li.click(), 50);
        }
        containerPais.appendChild(headerPais)
        // 3. CREAR CONTENEDOR ESPECÍFICO PARA LOS EQUIPOS DE ESTA LIGA
        const ligasGrid = document.createElement('div');
        ligasGrid.className = 'ligas';
        ligasGrid.id = 'ligas-'+pais.id_pais
        containerPais.appendChild(ligasGrid);
        containerDisplay.appendChild(containerPais);

        // 4. OBTENER Y MOSTRAR LOS EQUIPOS
        try {
            // Pasar liga.liga (la ID o slug) en lugar del objeto completo
            const ligas = await ligasxpais(pais.id_pais); 
            
            // Pasamos 'equiposGrid' como segundo parámetro para que pinte ahí los equipos
            displayLigas(ligas.success, ligasGrid); 
        } catch (error) {
            console.error(`Error cargando equipos de ${liga.nombre}:`, error);
        }

        // Efecto Fade progresivo
        setTimeout(() => {
            //li.classList.add('visible');
        }, index * 100);
    });
}

async function ligasxpais(id_pais) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ligasxpais?pais=${id_pais}`); 
        const data = await response.json();
        if (data.success) {
            displayLigas(data.success);
        } 
        else{
            displayLigas(data);
        }
        return data;
    } catch (error) {
        console.error("Error fetching ligas:", error);
        return { error: "Error fetching ligas" };
    }
}

export function displayLigas(data, container) {
   
    //dropdownMenuLigas.innerHTML = '';

    if (data.error) {
        //dropdownMenuLigas.innerHTML = `<li class="dropdown-item error">Error: ${data.error}</li>`;
        return;
    }

    data.forEach(async (liga, index) => {
        if(liga.tipo === 2){ return; }
        ///if(liga.)
        const ligaItem = document.createElement('div');
        const img = document.createElement('img');
        ligaItem.className = 'liga-item';
        ligaItem.dataset.id = liga.id_liga || liga.id; // Asegura capturar la ID
        img.src = liga.logo;
        ligaItem.appendChild(img);

        img.crossOrigin = 'anonymous'
        img.onload = async () => {
            try {
                const colors = await getDominantColors(img, 4);

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
        };

        if(ligaItem && container){
            container.appendChild(ligaItem);

            // NAVEGACIÓN HACIA LA PÁGINA DE LA LIGA
            ligaItem.addEventListener('click', () => {
                const ligaSlug = (liga.nombre || '')
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9\-]/g, '');

                // Redirige a la página dedicada de la liga
                window.location.href = `liga.html?id=${liga.liga || liga.id}&slug=${ligaSlug}`;
            });
        }
    });
}