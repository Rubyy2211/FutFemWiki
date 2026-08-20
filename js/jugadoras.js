import { handleAutocompletePais } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { equiposxliga, handleAutocompleteEquipo, fetchEquipoById } from '/js/api/equipos.js';
import { fetchAllJugadoras, formatearValorMercado, calcularEdad } from '/js/api/jugadora.js';
import { API_BASE_URL } from '/js/config.js';

let jugadorasOriginal = [];
let currentPage = 1;
const itemsPerPage = 25;
let totalPages = 1;
let jugadorasGlobal = [];

// 🎯 Estado global de todos los filtros acumulativos
const filtrosEstado = {
    equipos: [],    // Array de objetos: { id, nombre }
    paises: [],     // Array de objetos: { id, nombre, iso }
    posiciones: [], // Array de objetos: { id, nombre }
    valorMin: null,
    valorMax: null,
    alturaMin: null,
    alturaMax: null
};

export async function iniciarJugadoras() {
    const inputPaises = document.getElementsByClassName('input-pais');
    const inputPosiciones = document.getElementById('input-posicion');
    const inputEquipo = document.getElementById('input-equipo');

    const inputValorMin = document.getElementById('input-valor-min');
    const inputValorMax = document.getElementById('input-valor-max');
    const inputAlturaMin = document.getElementById('input-altura-min');
    const inputAlturaMax = document.getElementById('input-altura-max');

    await manejarJugadoras();
    displayJugadoras(jugadorasOriginal);

    // --- AUTOCOMPLETE EQUIPO ---
    if (inputEquipo) {
        inputEquipo.addEventListener('input', (event) => {
            handleAutocompleteEquipo(event, 'sugerencias-equipo', (equipo) => {
                if (equipo && equipo.id_equipo) {
                    agregarTag('equipos', { id: Number(equipo.id_equipo), nombre: equipo.nombre });
                    inputEquipo.value = '';
                }
            });
        });
    }

    // --- AUTOCOMPLETE PAÍS ---
    if (inputPaises[0]) {
        inputPaises[0].addEventListener('input', (event) => {
            handleAutocompletePais(event, 'sugerencias-pais2', (pais) => {
                // Si el handler devuelve un objeto o ID
                const idPais = typeof pais === 'object' ? pais.id : pais;
                const nombrePais = typeof pais === 'object' ? pais.nombre : (pais.nombre || 'País');
                const isoPais = typeof pais === 'object' ? pais.iso : '';

                if (idPais) {
                    agregarTag('paises', { id: Number(idPais), nombre: nombrePais, iso: isoPais });
                    inputPaises[0].value = '';
                }
            });
        });
    }

    // --- AUTOCOMPLETE POSICIÓN ---
    if (inputPosiciones) {
        inputPosiciones.addEventListener('input', (event) => {
            handleAutocompletePosicion(event, 'sugerencias-posicion', (posicion) => {
                if (posicion && posicion.id) {
                    agregarTag('posiciones', { id: Number(posicion.id), nombre: posicion.nombre || posicion.abrev });
                    inputPosiciones.value = '';
                }
            });
        });
    }

    // --- FILTROS DE RANGO (VALOR Y ALTURA) ---
    const listenerRango = () => {
        filtrosEstado.valorMin = inputValorMin.value ? Number(inputValorMin.value) : null;
        filtrosEstado.valorMax = inputValorMax.value ? Number(inputValorMax.value) : null;
        filtrosEstado.alturaMin = inputAlturaMin.value ? Number(inputAlturaMin.value) : null;
        filtrosEstado.alturaMax = inputAlturaMax.value ? Number(inputAlturaMax.value) : null;
        
        aplicarFiltros();
    };

    [inputValorMin, inputValorMax, inputAlturaMin, inputAlturaMax].forEach(input => {
        if (input) input.addEventListener('input', listenerRango);
    });
}

// 🏷️ Funciones para gestión de Etiquetas / Tags estilo SoFifa
function agregarTag(categoria, item) {
    // Evitar duplicados
    const existe = filtrosEstado[categoria].some(e => e.id === item.id);
    if (!existe) {
        filtrosEstado[categoria].push(item);
        renderizarTags(categoria);
        aplicarFiltros();
    }
}

function eliminarTag(categoria, id) {
    filtrosEstado[categoria] = filtrosEstado[categoria].filter(e => e.id !== id);
    renderizarTags(categoria);
    aplicarFiltros();
}

function renderizarTags(categoria) {
    const contenedorMap = {
        equipos: 'tags-equipo',
        paises: 'tags-pais',
        posiciones: 'tags-posicion'
    };

    const container = document.getElementById(contenedorMap[categoria]);
    if (!container) return;

    container.innerHTML = '';

    filtrosEstado[categoria].forEach(item => {
        const tag = document.createElement('div');
        tag.className = 'tag-item';
        
        let contenidoHtml = '';
        if (item.iso) {
            contenidoHtml += `<span class="fi fi-${item.iso}"></span> `;
        }
        contenidoHtml += `<span>${item.nombre}</span><span class="remove-tag">×</span>`;
        tag.innerHTML = contenidoHtml;

        tag.querySelector('.remove-tag').onclick = () => eliminarTag(categoria, item.id);
        container.appendChild(tag);
    });
}

export async function manejarJugadoras() {
    if (jugadorasOriginal && jugadorasOriginal.length > 0) return jugadorasOriginal.length;
    jugadorasOriginal = await fetchAllJugadoras();
    return jugadorasOriginal.length;
}

// 🔍 Motor principal de filtrado acumulativo
function aplicarFiltros() {
    let resultado = jugadorasOriginal.filter(jugadora => {
        // 1. Filtro por Equipos (Múltiple)
        if (filtrosEstado.equipos.length > 0) {
            const coincideEquipo = filtrosEstado.equipos.some(eq => jugadora.equipo && jugadora.equipo.id === eq.id);
            if (!coincideEquipo) return false;
        }

        // 2. Filtro por Países / Nacionalidad (Múltiple)
        if (filtrosEstado.paises.length > 0) {
            const coincidePais = filtrosEstado.paises.some(p => jugadora.nacionalidades_ids && jugadora.nacionalidades_ids.includes(p.id));
            if (!coincidePais) return false;
        }

        // 3. Filtro por Posición (Múltiple)
        if (filtrosEstado.posiciones.length > 0) {
            const coincidePos = filtrosEstado.posiciones.some(pos => jugadora.posiciones_ids && jugadora.posiciones_ids.includes(pos.id));
            if (!coincidePos) return false;
        }

        // 4. Filtro por Valor de Mercado
        const valorMercado = jugadora.market_value || 0;
        if (filtrosEstado.valorMin !== null && valorMercado < filtrosEstado.valorMin) return false;
        if (filtrosEstado.valorMax !== null && valorMercado > filtrosEstado.valorMax) return false;

        // 5. Filtro por Altura (cm)
        const altura = jugadora.altura || 0;
        if (filtrosEstado.alturaMin !== null && altura < filtrosEstado.alturaMin) return false;
        if (filtrosEstado.alturaMax !== null && altura > filtrosEstado.alturaMax) return false;

        return true;
    });

    if (window.innerWidth < 768) {
        const cabecera = document.getElementById('cabecera-wiki-equipos');
        if (cabecera) cabecera.classList.remove('active');
    }

    displayJugadoras(resultado);
}

function displayJugadoras(jugadoras) {
    jugadorasGlobal = jugadoras;
    currentPage = 1;
    totalPages = Math.ceil(jugadorasGlobal.length / itemsPerPage) || 1;
    renderJugadorasPage(currentPage);
}

function renderJugadorasPage(page = 1) {
    const container = document.getElementById('items-container');
    const cabecera = document.getElementById('cabecera-wiki-equipos');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'jugadoras-grid-container';
    if (cabecera) {
        cabecera.classList.add('jugadoras');
        cabecera.style.borderBottom = 'none';
    }

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const jugadoras = jugadorasGlobal.slice(start, end);

    jugadoras.forEach((jugadora, index) => {
        const nombreCompleto = jugadora.nombre_completo || 'Desconocida';
        const slugNombre = nombreCompleto.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
        
        const div = document.createElement('div');
        div.classList.add('jugadora-item', 'glass');

        const div1 = document.createElement('div');
        const div1_2 = document.createElement('div');
        div1.className = 'jugadora-div1';

        const img = document.createElement('img');
        img.src = jugadora.imagen || '../img/predeterm.png';
        img.className = 'jugadora-imagen';
        img.alt = jugadora.apodo || nombreCompleto;
        div1.appendChild(img);

        const imgClub = document.createElement('img');
        const foto = jugadora.equipo?.escudo;
        let fotoMini = foto ? foto.replace('/clubes/', '/clubes/mini/') : '../img/predeterm.png';
        imgClub.src = fotoMini;
        imgClub.className = 'equipo-imagen';
        imgClub.alt = jugadora.equipo?.nombre || '';

        const pNombre = document.createElement('p');
        pNombre.className = 'jugadora-nombre';
        pNombre.textContent = nombreCompleto; 
        div1_2.appendChild(pNombre);

        const pValor = document.createElement('p');
        pValor.className = 'jugadora-valor';
        pValor.textContent = formatearValorMercado(jugadora.market_value) || 'N/A';

        const divBanderaYPosicion = document.createElement('div');
        divBanderaYPosicion.className = 'jugadora-banderas-posicion';

        const divBanderas = document.createElement('div');
        divBanderas.className = 'jugadora-banderas';

        if (jugadora.nacionalidades_isos) {
            jugadora.nacionalidades_isos.forEach((iso, idx) => {
                const icon = document.createElement('span');
                icon.className = `fi fi-${iso}`; 

                // Al hacer clic en la bandera, la añade como tag
                icon.onclick = () => {
                    const idNacio = jugadora.nacionalidades_ids[idx];
                    agregarTag('paises', { id: idNacio, nombre: iso.toUpperCase(), iso: iso });
                };

                if (idx > 0) {
                    icon.style.opacity = "0.5";
                    icon.style.filter = "grayscale(20%)";
                    icon.style.transform = "scale(0.9)";
                } else {
                    icon.style.boxShadow = "0 0 3px rgba(0,0,0,0.3)";
                }
                divBanderas.appendChild(icon);
            });
        }

        const pNacimiento = document.createElement('p');
        pNacimiento.textContent = calcularEdad(jugadora.nacimiento);

        const pPosicion = document.createElement('div');
        pPosicion.className = 'jugadora-posicion';
        if (jugadora.posiciones_abrev) {
            jugadora.posiciones_abrev.forEach((pos, i) => {
                const span = document.createElement('span');
                span.textContent = pos;
                span.id = jugadora.posiciones_ids[i];
                span.className = 'pos-' + pos;
                pPosicion.appendChild(span);
            });
        }

        div1_2.appendChild(divBanderaYPosicion);
        divBanderaYPosicion.appendChild(divBanderas);
        divBanderaYPosicion.appendChild(pPosicion);
        
        div1.appendChild(div1_2);

        const colorPrimario = jugadora.equipo?.color || 'var(--color-primario)';
        if (colorPrimario) {
            /*div.style.background = `
                linear-gradient(
                    to bottom,
                    color-mix(in srgb, ${colorPrimario} 70%, transparent),
                    color-mix(in srgb, var(--color-secundario) 70%, transparent)
                )
            `;*/
        }

        div.addEventListener('click', () => {
            window.location.href = `jugadora_ficha.html?id=${jugadora.id_jugadora}&slug=${slugNombre}`;
        });

        div.appendChild(div1);
        div.appendChild(pNacimiento);
        div.appendChild(imgClub);
        div.appendChild(pValor);
        container.appendChild(div);

        setTimeout(() => {
            div.classList.add('visible');
        }, index * 50);
    });

    updatePaginationUI();
}

function updatePaginationUI() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    const prevBtn = document.createElement('button');
    const prevSpan = document.createElement('span');
    prevBtn.id = 'prevPage';
    prevSpan.textContent = '←';
    prevBtn.appendChild(prevSpan)

    const nextBtn = document.createElement('button');
    const nextSpan = document.createElement('span');
    nextBtn.id = 'nextPage';
    nextSpan.textContent = '→';
    nextBtn.appendChild(nextSpan)

    const indicator = document.createElement('span');
    indicator.id = 'pageIndicator';
    indicator.textContent = `Página ${currentPage} / ${totalPages}`;

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(indicator);
    paginationContainer.appendChild(nextBtn);

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Función encargada de renderizar la página y resetear el scroll de #resto
    const cambiarPagina = (nuevaPagina) => {
        currentPage = nuevaPagina;
        renderJugadorasPage(currentPage);

        // Resetear scroll del contenedor #resto
        const contenedorResto = document.getElementById('resto');
        if (contenedorResto) {
            contenedorResto.scrollTo({ top: 0, behavior: 'smooth' }); // o contenedorResto.scrollTop = 0;
        }
    };

    prevBtn.onclick = () => {
        if (currentPage > 1) {
            cambiarPagina(currentPage - 1);
        }
    };

    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            cambiarPagina(currentPage + 1);
        }
    };
}


/// LOGICA DE POPUP FILTRO EN MOVIL

// Configurar Modal Popup de Filtros para Móvil
const btnVerFiltros = document.getElementById('ver-filtros');
const btnCerrarFiltros = document.getElementById('cerrar-filtros');
const contenedorFiltros = document.getElementById('filtros');

// Crear overlay dinámicamente si no existe
let overlay = document.getElementById('filtros-overlay');
if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'filtros-overlay';
    overlay.className = 'filtros-overlay';
    document.body.appendChild(overlay);
}

function abrirFiltros() {
    contenedorFiltros.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Desactiva scroll del fondo
}

function cerrarFiltros() {
    contenedorFiltros.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = ''; // Reorganiza el scroll
}

if (btnVerFiltros) {
    btnVerFiltros.addEventListener('click', abrirFiltros);
}

if (btnCerrarFiltros) {
    btnCerrarFiltros.addEventListener('click', cerrarFiltros);
}

if (overlay) {
    overlay.addEventListener('click', cerrarFiltros);
}

const contenedorResto = document.getElementById('resto');
const headerList = document.querySelector('.header-list');

if (contenedorResto && headerList) {
    contenedorResto.addEventListener('scroll', () => {
        // Si se desplaza aunque sea 1px, activa el fondo
        if (contenedorResto.scrollTop > 0) {
            headerList.classList.add('is-scrolled');
        } else {
            headerList.classList.remove('is-scrolled');
        }
    });
}