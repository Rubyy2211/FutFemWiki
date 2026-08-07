import { handleAutocompletePais } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { API_BASE_URL } from '/js/config.js';

let jugadorasOriginal;
let currentPage = 1;
const itemsPerPage = 25;
let totalPages = 1;
let jugadorasGlobal = []; // Guardaremos todas las jugadoras aquí


export async function iniciarJugadoras(){
    
    const inputPaises = document.getElementsByClassName('input-pais');
    const sectionWiki = document.getElementById('wiki-equipos');
    const cabecera = document.getElementById('cabecera-wiki-equipos');
    const inputPosiciones = document.getElementById('input-posicion');
    const inputEquipo = document.getElementById('input-equipo');


    manejarJugadoras().then(cantidad => {
        console.log(`Total jugadoras cargadas: ${cantidad}`);
        displayJugadoras(jugadorasOriginal);
    });

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
        
}

export async function manejarJugadoras(){
    if (jugadorasOriginal && jugadorasOriginal.length > 0) {
        return;
    }
    jugadorasOriginal = await fetchAllJugadoras();
    return jugadorasOriginal.length;
}

function filtroJugadoras(equipo, nacionalidad, posicion){
    
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

function renderJugadorasPage(page = 1){
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
        let fotoMini;

        if(foto) fotoMini = foto.replace('/clubes/', '/clubes/mini/');
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
            window.location.href = `jugadora_ficha.html?id=${jugadora.id_jugadora}&slug=${slugNombre}`;
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