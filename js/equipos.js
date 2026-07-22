import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { getDominantColors,  rgbToRgba } from '/js/utils/color-thief.js';
import { API_BASE_URL } from '/js/config.js';

const containerDisplay = document.getElementById('container-display')

export async function inicializarEquipos(){

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

    // ==========================================
    // 2. COMPORTAMIENTO DE APERTURA/CIERRE (DROPDOWNS)
    // ==========================================
    
    // Despliegue dropdown Países
    dropdownBtnPais.onclick = (e) => {
        e.stopPropagation();
        //dropdownMenuLigas.classList.remove('open'); // Evita solapamiento
        dropdownMenuPais.classList.toggle('open');
    };

    // Despliegue dropdown Ligas
    /*dropdownBtnLiga.onclick = (e) => {
        e.stopPropagation();
        dropdownMenuPais.classList.remove('open'); // Evita solapamiento
        //dropdownMenuLigas.classList.toggle('open');
    };*/

    // Un solo listener global limpio para cerrar ambos menús si hacen clic fuera
    document.onclick = () => {
        dropdownMenuPais.classList.remove('open');
        //dropdownMenuLigas.classList.remove('open');
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
            dropdownBtnPais.dataset.id = pais.id_pais;
            selectedTextPais.textContent = pais.nombre;
            selectedFlagPais.className = `fi fi-${codigoIso}`;
            
            dropdownMenuPais.classList.remove('open');
            
            if (typeof ligasxpais === 'function') {
                ligasxpais(pais.id_pais);
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
    
            // 3. Traemos las ligas de España (esto llamará a displayLigas que rellenará el 2º dropdown)
            await ligasxpais(1).then(ligas => {
                //displayLigas(ligas.success);
            });
    
            if (ligasContainer && ligasContainer.firstChild) {
                ligasContainer.firstChild.classList.add('selected');
            }

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

export function displayLigas(data) {
    const dropdownMenuLigas = document.getElementById('dropdown-liga-list');
    const dropdownBtnLiga = document.getElementById('dropdown-liga-btn');
    const selectedLigaLogo = document.getElementById('selected-liga-logo');
    const selectedLigaText = document.getElementById('selected-liga-text');
    
    const containerEquipos = document.getElementById('items-container');
    
    // Limpieza de seguridad: vaciamos el contenedor de equipos y el dropdown de ligas viejo
    containerEquipos.innerHTML = '';
    containerDisplay.innerHTML = '';
    //dropdownMenuLigas.innerHTML = '';

    if (data.error) {
        //dropdownMenuLigas.innerHTML = `<li class="dropdown-item error">Error: ${data.error}</li>`;
        return;
    }

    data.forEach(async (liga, index) => {

        const containerLiga = document.createElement('div');
        const headerLiga = document.createElement('div');
        const elementosLiga = document.createElement('div');
        containerLiga.className = 'container-liga';
        headerLiga.id = 'header-'+liga.liga
        headerLiga.className = 'header-liga';
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.dataset.id = liga.liga;

        const foto = liga.logo;
        const fotoMini = foto.replace('/ligas/', '/ligas/mini/');

        headerLiga.innerHTML = `
            <img src="${fotoMini}" alt="${liga.nombre} Logo" class="liga-logo-dropdown" style="width: 24px; height: 24px; object-fit: contain;">
            <span class="liga-name">${liga.nombre}</span>
        `;
        

        // Estructura de la opción con la imagen mini de la liga
        li.innerHTML = `
            <img src="${fotoMini}" alt="${liga.nombre} Logo" class="liga-logo-dropdown" style="width: 24px; height: 24px; object-fit: contain;">
            <span class="liga-name">${liga.nombre}</span>
        `;

        // Extracción y aplicación de la paleta de colores reactiva al logo
        const img = headerLiga.querySelector('.liga-logo-dropdown');
        let colors;
        // 1. Añadir el atributo crossOrigin ANTES de cargar o procesar la imagen
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            try {
                colors = await getDominantColors(img, 3);
                
                if (colors && colors.length >= 2) {
                    const bgGradient = `linear-gradient(
                        to right,
                        color-mix(in srgb, ${rgbToRgba(colors[0], 1)} 40%, transparent),
                        color-mix(in srgb, ${rgbToRgba(colors[1], 1)} 80%, transparent)
                    )`;

                    // APLICAMOS EL ESTILO DENTRO DEL ONLOAD (Cuando ya existen los colores)
                    headerLiga.style.background = bgGradient;
                    li.style.background = bgGradient;
                    li.style.borderColor = rgbToRgba(colors[2], 0.5);
                    li.style.setProperty('--liga-shadow-color', rgbToRgba(colors[2], 1));
                }
            } catch (err) {
                console.error("Error obteniendo colores del logo de la liga:", err);
            }
        };

        // Si la imagen se crea mediante HTML string (innerHTML), vuelve a asignar el src 
        // para forzar al navegador a aplicar el parámetro crossOrigin en el re-fetch:
        img.src = fotoMini;

        console.log(colors)

        // Evento de selección de la liga
        /*li.addEventListener('click', async () => {
            // Actualizar interfaz del botón principal de ligas
            dropdownBtnLiga.dataset.id = liga.liga;
            selectedLigaText.textContent = liga.nombre;
            selectedLigaLogo.src = fotoMini;
            selectedLigaLogo.style.display = 'inline-block';

            // Cerrar menú
            dropdownMenuLigas.classList.remove('open');

            // Cargar y mostrar los equipos pertenecientes a esta liga
            const equipos = await equiposxliga(liga.liga);
            displayEquipos(equipos.success);
        });*/

        //dropdownMenuLigas.appendChild(li);

        // Auto-selección de la primera liga del lote (Efecto por defecto)
        if (index === 0) {
            // Pequeño timeout para asegurar que el DOM ha procesado el elemento
            setTimeout(() => li.click(), 50);
        }
        headerLiga.style.background = `${colors}`;
        containerLiga.appendChild(headerLiga)
        // 3. CREAR CONTENEDOR ESPECÍFICO PARA LOS EQUIPOS DE ESTA LIGA
        const equiposGrid = document.createElement('div');
        equiposGrid.className = 'equipos-liga-grid';
        containerLiga.appendChild(equiposGrid);
        containerDisplay.appendChild(containerLiga);

        // 4. OBTENER Y MOSTRAR LOS EQUIPOS
        try {
            // Pasar liga.liga (la ID o slug) en lugar del objeto completo
            const equipos = await equiposxliga(liga.liga); 
            
            // Pasamos 'equiposGrid' como segundo parámetro para que pinte ahí los equipos
            displayEquipos(equipos.success, equiposGrid); 
        } catch (error) {
            console.error(`Error cargando equipos de ${liga.nombre}:`, error);
        }

        // Efecto Fade progresivo
        setTimeout(() => {
            li.classList.add('visible');
        }, index * 100);
    });
}

function seleccionarLiga(ligaElement) {
    const ligas = document.getElementsByClassName('liga-item');
    for (const liga of ligas) {
        liga.classList.remove('selected');
    }
    ligaElement.classList.add('selected');
}

export function displayEquipos(equipos, container) {
    if (!container) {
        container = document.getElementById('items-container');
    }
    container.innerHTML = '';
    container.className = '';
    container.className = 'equipos';
    if (equipos.error) {
        container.innerHTML = `<p>Error: ${equipos.error}</p>`;
        return;
    }
    equipos.forEach((equipo, index) => {
        const equipoSlug = equipo.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
        const equipoElement = document.createElement('div');
        const foto = equipo.escudo;
        const fotoMini = foto.replace('/clubes/', '/clubes/mini/');
        equipoElement.className = 'equipo-item';
        equipoElement.innerHTML = `
            <img src="${fotoMini}" alt="${equipo.nombre} Escudo" class="equipo-escudo">
            <!--<div class="equipo-info">
                <h4>${equipo.nombre}</h4> 
            </div>-->
        `;

        // Aplicar degradado usando los colores de la BD
        const colorPrimario = equipo.color || 'var(--color-primario)'; // fallback
        const colorSecundario = equipo.colorSecundario || 'transparent'; // fallback
        equipoElement.style.background = `
            linear-gradient(
                to bottom,
                color-mix(in srgb, ${colorPrimario} 100%, transparent 0%),
                color-mix(in srgb, var(--color-secundario) 100%, transparent 0%)
            )
        `;
        
        //equipoElement.style.border = '0.5px solid rgba(255, 255, 255, 0.7)';
        equipoElement.style.setProperty('--equipo-shadow-color', colorPrimario);

        container.appendChild(equipoElement);

        equipoElement.addEventListener('click', () => {
            window.location.href = `equipo_ficha.html?id=${equipo.id}&slug=${equipoSlug}`;
        });

        // Retraso progresivo para efecto fade
        setTimeout(() => {
            equipoElement.classList.add('visible');
        }, index * 150); // cada liga 150ms después de la anterior
    });
}