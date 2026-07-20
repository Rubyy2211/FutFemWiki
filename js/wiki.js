import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { API_BASE_URL } from '/js/config.js';

//import { calcularEdad } from '/static/js/games/funciones-comunes.js';
//import { getDominantColors, rgbToRgba } from '/static/js/utils/color.thief.js';

let jugadorasOriginal;
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let jugadorasGlobal = []; // Guardaremos todas las jugadoras aquí
const btnMapa = document.getElementById("ver-mapa");
const mapa = document.getElementById("mapa-equipos");
const item = document.getElementById("items-container");

export async function inicializarWiki(arg) {
    // ==========================================
    // 1. CARGA DE DATOS Y CAPTURA DE ELEMENTOS DOM
    // ==========================================
    const paisesConLigas = await obtenerPaisesConLigas();
    console.log("Paises con ligas cargados:", paisesConLigas);

    // Inputs y contenedores generales
    const inputPaises = document.getElementsByClassName('input-pais');
    const sectionWiki = document.getElementById('wiki-equipos');
    const cabecera = document.getElementById('cabecera-wiki-equipos');
    const inputPosiciones = document.getElementById('input-posicion');
    const ligasContainer = document.getElementById('ligas-container');
    const inputEquipo = document.getElementById('input-equipo');
    
    // Botones y pestañas de navegación
    const cabeceraLigas = document.getElementById('cabecera-equipo');
    const cabeceraJugadoras = document.getElementById('cabecera-jugadora');
    const botonConfirmar = document.getElementById('confirmarPais');
    const botonFiltro = document.getElementById('jugadoras-filtros');

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
        dropdownMenuLigas.classList.remove('open'); // Evita solapamiento
        dropdownMenuPais.classList.toggle('open');
    };

    // Despliegue dropdown Ligas
    dropdownBtnLiga.onclick = (e) => {
        e.stopPropagation();
        dropdownMenuPais.classList.remove('open'); // Evita solapamiento
        dropdownMenuLigas.classList.toggle('open');
    };

    // Un solo listener global limpio para cerrar ambos menús si hacen clic fuera
    document.onclick = () => {
        dropdownMenuPais.classList.remove('open');
        dropdownMenuLigas.classList.remove('open');
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

    // ==========================================
    // 4. CONTROL DE PESTAÑAS (PRECARGA INICIAL)
    // ==========================================
    if (arg === 'jugadoras') {
        cabeceraJugadoras.classList.add('active');
        cabeceraLigas.classList.remove('active');
        manejarJugadoras().then(cantidad => {
            console.log(`Total jugadoras cargadas: ${cantidad}`);
            displayJugadoras(jugadorasOriginal);
        });
    } else if (arg === 'equipos') {
        sectionWiki.classList.add('equipos');
        cabecera.classList.add('equipos');
        cabeceraJugadoras.classList.remove('active');
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
            displayLigas(ligas.success);
        });

        if (ligasContainer && ligasContainer.firstChild) {
            ligasContainer.firstChild.classList.add('selected');
        }
    }

    // ==========================================
    // 5. LISTENERS DE FILTROS Y AUTOCOMPLETADOS
    // ==========================================
    /*botonFiltro.addEventListener('click', () => {
        const paisInput = inputPaises[0];
        if (!paisInput) return;
        filtroJugadoras(Number(inputEquipo.dataset.id), Number(paisInput.dataset.id), Number(inputPosiciones.dataset.id));
    });*/

    // --- LISTENER DE EQUIPO ---
    inputEquipo.addEventListener('input', (event) => {
        handleAutocompleteEquipo(event, 'sugerencias-equipo', (equipo) => {
            // Al elegir equipo, rescatamos el país y posición actuales si existen
            const idPais = inputPaises[0] && inputPaises[0].dataset.id ? Number(inputPaises[0].dataset.id) : null;
            const idPosicion = inputPosiciones.dataset.id ? Number(inputPosiciones.dataset.id) : null;

            filtroJugadoras(Number(equipo.id_equipo), idPais, idPosicion);
        });
    });

    // --- LISTENER DE POSICIONES (Si usa la misma lógica de callback, aplícale esto mismo) ---
    inputPosiciones.addEventListener('input', (event) => {
        handleAutocompletePosicion(event);
    });

    // --- LISTENER DE PAÍSES ---
    if (inputPaises[0]) {
        inputPaises[0].addEventListener('input', (event) => {
            handleAutocompletePais(event, 'sugerencias-pais2', (idPaisSeleccionado) => {
                // Al elegir país, rescatamos el equipo y posición actuales si existen
                const idEquipo = inputEquipo.dataset.id ? Number(inputEquipo.dataset.id) : null;
                const idPosicion = inputPosiciones.dataset.id ? Number(inputPosiciones.dataset.id) : null;

                // Usamos idPaisSeleccionado (que viene del callback y controla si es el ID o null si se borró)
                filtroJugadoras(idEquipo, idPaisSeleccionado, idPosicion);
            });
        });
    }

    botonConfirmar.addEventListener('click', async () => {
        const paisId = Number(inputPaises[0].dataset.id);
        if (paisId) {
            await ligasxpais(paisId);
        } else {
            alert('Por favor, selecciona un país válido de las sugerencias.');
        }
    });
}


export async function manejarJugadoras() {
    if (jugadorasOriginal && jugadorasOriginal.length > 0) {
        return;
    }
    jugadorasOriginal = await fetchAllJugadoras();
    return jugadorasOriginal.length;
}

function filtroJugadoras(equipo, nacionalidad, posicion) {
    
    let nuevasJugadoras = jugadorasOriginal.filter(jugadora => {
        // 1. Filtro de Equipo
        // Comparamos el ID del equipo (o club) según cómo venga en tu JSON
        if (equipo && jugadora.equipo.id !== parseInt(equipo)) return false;

        // 2. Filtro de Nacionalidad
        // Si hay una nacionalidad seleccionada, comprobamos si está en su lista de IDs
        if (nacionalidad) {
            const nacioId = parseInt(nacionalidad);
            if (!jugadora.nacionalidades_ids.includes(nacioId)) {
                return false;
            }
        }

        // 3. Filtro de Posición
        if (posicion && !jugadora.posiciones_ids.includes(parseInt(posicion))) return false;

        // Si sobrevive a todos los 'return false', la jugadora es válida
        return true;
    });

    if (window.screen.width < 768) {
        document.getElementById('cabecera-wiki-equipos').classList.remove('active');
    }

    displayJugadoras(nuevasJugadoras);
}


function displayJugadoras(jugadoras){
    console.log(jugadoras)
    jugadorasGlobal = jugadoras; // Guardar todas las jugadoras
    currentPage = 1;
    totalPages = Math.ceil(jugadorasGlobal.length / itemsPerPage);
    renderJugadorasPage(currentPage);
}

function renderJugadorasPage(page = 1) {
    const container = document.getElementById('items-container');
    const cabecera = document.getElementById('cabecera-wiki-equipos');
    //const containerLigas = document.getElementById('ligas-container');
    container.innerHTML = '';
    //containerLigas.innerHTML = '';
    container.className = '';
    container.className = 'jugadoras';
    cabecera.classList.add('jugadoras');
    cabecera.style.borderBottom = 'none';    
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const jugadoras = jugadorasGlobal.slice(start, end);
    
    container.innerHTML = ''; // Limpiamos
    //containerLigas.innerHTML = '';
    container.className = 'jugadoras-grid-container'; // Clase para el contenedor padre

    // --- CREACIÓN DEL ENCABEZADO ---
    /*const header = document.createElement('div');
    header.className = 'jugadora-item header-list'; // Usamos la misma clase para heredar el grid
    header.innerHTML = `
        <div class="jugadora-div1"><p><b>${gettext('JUGADORA')}</b></p></div>
        <div class="header-label"><p><b>${gettext('EDAD')}</b></p></div>
        <div class="header-label"><p><b>${gettext('CLUB')}</b></p></div>
        <div class="header-label"><p><b>${gettext('VALOR')}</b></p></div>
    `;
    container.appendChild(header);*/

    jugadoras.forEach((jugadora, index) => {
        const nombreCompleto = jugadora.nombre_completo || 'Desconocida';
        const slugNombre = nombreCompleto.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''); // Limpiamos caracteres especiales para el slug
        const div = document.createElement('div');
        div.classList.add('jugadora-item');
        div.classList.add('glass');

        const div1 = document.createElement('div');
        const div1_2 = document.createElement('div');
        div1.className = 'jugadora-div1';

        const img = document.createElement('img');
        img.src = '/img/predeterm.png';
        if(jugadora.imagen) {img.src = jugadora.imagen;}
        img.className = 'jugadora-imagen';
        img.alt = jugadora.apodo;
        div1.appendChild(img)

        const imgClub = document.createElement('img');
        const foto = jugadora.equipo.escudo;
        const fotoMini = foto.replace('/clubes/', '/clubes/mini/');
        imgClub.src = fotoMini;
        imgClub.className = 'equipo-imagen';
        imgClub.alt = jugadora.equipo.nombre;

        const pNombre = document.createElement('p');
        pNombre.className = 'jugadora-nombre';
        pNombre.textContent = nombreCompleto; 
        div1_2.appendChild(pNombre);

        const pValor = document.createElement('p');
        pValor.className = 'jugadora-valor';
        pValor.textContent = formatearValorMercado(jugadora.market_value) || 'N/A';

        const divBanderaYPosicion = document.createElement('div');
        divBanderaYPosicion.className = 'jugadora-banderas-posicion';

        // Contenedor para las banderas
        const divBanderas = document.createElement('div');
        divBanderas.className = 'jugadora-banderas';

        // Recorremos la lista de ISOs para crear los iconos
        jugadora.nacionalidades_isos.forEach((iso, index) => {
            const icon = document.createElement('span');
            icon.className = `fi fi-${iso}`; 

            icon.onclick = filtroJugadoras.bind(null, null, jugadora.nacionalidades_ids[index], null);
            
            // Si el index es 0, es la primaria. Si es mayor, es secundaria.
            if (index > 0) {
                icon.style.opacity = "0.5";       // La "apagamos" un poco
                icon.style.filter = "grayscale(20%)"; // Opcional: le quitamos un poco de color
                icon.style.transform = "scale(0.9)";   // Opcional: la hacemos un pelín más pequeña
            } else {
                icon.style.boxShadow = "0 0 3px rgba(0,0,0,0.3)"; // Destacamos la principal
            }

            icon.title = `País ID: ${jugadora.nacionalidades_ids[index]}`;
            divBanderas.appendChild(icon);
        });

        const pNacimiento = document.createElement('p');
        pNacimiento.textContent = calcularEdad(jugadora.nacimiento);

        const pPosicion = document.createElement('div');
        pPosicion.className = 'jugadora-posicion';
        jugadora.posiciones_abrev.forEach(pos => {
            const span = document.createElement('span');
            span.textContent = pos;
            span.id = jugadora.posiciones_ids[jugadora.posiciones_abrev.indexOf(pos)];
            span.className = 'pos-'+pos;
            pPosicion.appendChild(span);
        });
        div1_2.appendChild(divBanderaYPosicion);
        divBanderaYPosicion.appendChild(divBanderas);
        divBanderaYPosicion.appendChild(pPosicion);
        
        
        div1.appendChild(div1_2)
        const colorPrimario = jugadora.equipo.color || 'var(--color-primario)'; // fallback
        const colorSecundario = jugadora.equipo.colorSecundario || 'transparent'; // fallback
        if(colorPrimario){
        div.style.background = `
            linear-gradient(
                to bottom,
                color-mix(in srgb, ${colorPrimario} 70%, transparent),
                color-mix(in srgb, var(--color-secundario) 70%, transparent)
            )
        `;
        }

        /*div.style.border = `1px solid color-mix(in srgb, ${colorPrimario} 50%, transparent)`;*/

        pNombre.addEventListener('click', () => {
            window.location.href = `/jugadora/${jugadora.id_jugadora}/${slugNombre}/`;
        });
        div.appendChild(div1);
        div.appendChild(pNacimiento);
        div.appendChild(imgClub);
        div.appendChild(pValor);
        container.appendChild(div);

        // Retraso progresivo para efecto fade
        setTimeout(() => {
            div.classList.add('visible');
        }, index * 150); // cada liga 150ms después de la anterior
    });
    // Actualizar paginación
    updatePaginationUI();
}

function updatePaginationUI() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    const prevBtn = document.createElement('button');
    prevBtn.id = 'prevPage';
    prevBtn.textContent = '←';

    const nextBtn = document.createElement('button');
    nextBtn.id = 'nextPage';
    nextBtn.textContent = '→';

    const indicator = document.createElement('span');
    indicator.id = 'pageIndicator';

    paginationContainer.innerHTML = '';
    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(indicator);
    paginationContainer.appendChild(nextBtn);

    // Texto tipo "Página 2 / 8"
    indicator.textContent = `Página ${currentPage} / ${totalPages}`;

    // Estado de botones
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderJugadorasPage(currentPage);
        }
    };

    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderJugadorasPage(currentPage);
        }
    };
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
    dropdownMenuLigas.innerHTML = '';

    if (data.error) {
        dropdownMenuLigas.innerHTML = `<li class="dropdown-item error">Error: ${data.error}</li>`;
        return;
    }

    data.forEach((liga, index) => {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        li.dataset.id = liga.liga;

        const foto = liga.logo;
        const fotoMini = foto.replace('/ligas/', '/ligas/mini/');

        // Estructura de la opción con la imagen mini de la liga
        li.innerHTML = `
            <img src="${fotoMini}" alt="${liga.nombre} Logo" class="liga-logo-dropdown" style="width: 24px; height: 24px; object-fit: contain;">
            <span class="liga-name">${liga.nombre}</span>
        `;

        // Extracción y aplicación de la paleta de colores reactiva al logo
        const img = li.querySelector('.liga-logo-dropdown');
        img.onload = async () => {
            try {
                const colors = await getDominantColors(img, 3);
                li.style.background = `
                    linear-gradient(
                        to right,
                        color-mix(in srgb, ${rgbToRgba(colors[0], 1)} 40%, transparent),
                        color-mix(in srgb, ${rgbToRgba(colors[1], 1)} 80%, transparent)
                    )
                `;
                li.style.borderColor = rgbToRgba(colors[2], 0.5);
                li.style.setProperty('--liga-shadow-color', rgbToRgba(colors[2], 1));
            } catch (err) {
                console.error("Error obteniendo colores del logo de la liga:", err);
            }
        };

        // Evento de selección de la liga
        li.addEventListener('click', async () => {
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
        });

        dropdownMenuLigas.appendChild(li);

        // Auto-selección de la primera liga del lote (Efecto por defecto)
        if (index === 0) {
            // Pequeño timeout para asegurar que el DOM ha procesado el elemento
            setTimeout(() => li.click(), 50);
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
            window.location.href = `/equipo/${equipo.id}/${equipoSlug}/`;
        });

        // Retraso progresivo para efecto fade
        setTimeout(() => {
            equipoElement.classList.add('visible');
        }, index * 150); // cada liga 150ms después de la anterior
    });
}

/*export function displayEquiposMapa(equipos) {
    inicializarMapaEquipos();

    // Guardamos los equipos para añadirlos cuando el mapa esté listo
    let equiposPendientes = equipos.filter(e => e.lat && e.lon);

    map.once("idle", () => {
        map.resize();

        requestAnimationFrame(() => {
            equiposPendientes.forEach(e => {
                añadirEquipoMapa(
                    e.id,
                    e.nombre,
                    e.lat,
                    e.lon,
                    '/' + e.escudo,
                    e.color
                );
            });

            requestAnimationFrame(() => {
                centrarMapaEnEquipos();
            });
        });
    });

}*/