import { handleAutocompletePais, obtenerPaisesConLigas } from '/js/api/pais.js';
import { handleAutocompletePosicion } from '/js/api/posiciones.js';
import { equiposxliga } from '/js/api/equipos.js';
import { ligasxPais } from '/js//api/ligas.js';
import { fetchAllJugadoras, cargarJugadoraDatos, formatearValorMercado, calcularEdad, handleAutocompletePlayer } from '/js/api/jugadora.js';
import { actualizarCardJugadora } from '/js/wiki.js';

let jugadorasOriginal = [];
let currentPage = 1;
const itemsPerPage = 25;
let totalPages = 1;
let jugadorasGlobal = [];
let paisesConLiga = [];
let ligasPorPais = [];

// 🎯 Estado global de todos los filtros acumulativos
const filtrosEstado = {
    jugadora: null,   // Solo una jugadora única
    paisEquipo: null, // Objeto: { id, nombre, iso } o null
    liga: null,       // Objeto: { id, nombre } o null
    equipo: null,     // Objeto único: { id, nombre, escudo } o null
    pais: null,       // Objeto único (Nacionalidad jugadora): { id, nombre, iso } o null
    posiciones: [],   // Array de objetos: { id, nombre }
    valorMin: null,
    valorMax: null,
    edadMin: null,
    edadMax: null,
    alturaMin: null,
    alturaMax: null
};

// --- VARIABLES INTERNAS PARA LOS STEPPERS EN CASCADA ---
let idxPaisEquipo = 0;
let idxLiga = 0;
let idxEquipo = 0;

let opcionesPaises = [];
let opcionesLigas = [];
let opcionesEquipos = [];

// Inputs filtros
const inputNombre = document.getElementById('input-nombre');
const inputPaises = document.getElementsByClassName('input-pais');
const inputPosiciones = document.getElementById('input-posicion');
const inputValorMin = document.getElementById('input-valor-min');
const inputValorMax = document.getElementById('input-valor-max');
const inputAlturaMin = document.getElementById('input-altura-min');
const inputAlturaMax = document.getElementById('input-altura-max');
const inputEdadMin = document.getElementById('input-edad-min');
const inputEdadMax = document.getElementById('input-edad-max');


export async function iniciarJugadoras() {

    // Carga de datos
    await manejarJugadoras();

    displayJugadoras(jugadorasOriginal);

    inicializarFiltros()
}

export async function manejarJugadoras() {
    if (jugadorasOriginal && jugadorasOriginal.length > 0) return jugadorasOriginal.length;
    jugadorasOriginal = await fetchAllJugadoras();
    paisesConLiga = await obtenerPaisesConLigas();
    return jugadorasOriginal.length;
}

function displayJugadoras(jugadoras) {
    jugadorasGlobal = jugadoras;
    currentPage = 1;
    totalPages = Math.ceil(jugadorasGlobal.length / itemsPerPage) || 1;
    renderJugadorasPage(currentPage);
}

/**
 * Renderiza la lista de jugadoras correspondiente a la página solicitada.
 *
 * @param {number} [page=1] - Número de página a mostrar.
 * @returns {void}
 */
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

    if (jugadoras.length > 0) {
        actualizarCardJugadora(jugadoras[0]);
    }

    jugadoras.forEach((jugadora, index) => {
        const itemElement = crearJugadoraItem(jugadora, index);
        container.appendChild(itemElement);
    });

    updatePaginationUI();
}

/**
 * Crea la estructura HTML (tarjeta DOM) para una jugadora individual.
 * 
 * @param {Object} jugadora - Objeto con la información detallada de la jugadora.
 * @param {number} index - Posición en la página actual para calcular el retardo en la animación.
 * 
 * @returns {HTMLDivElement} Elemento `div` contenedor de la tarjeta, listo para insertar en el DOM.
 */
function crearJugadoraItem(jugadora, index) {
    jugadora.edad = calcularEdad(jugadora.nacimiento);
    const nombreCompleto = jugadora.nombre_completo || 'Desconocida';
    const slugNombre = nombreCompleto.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    const div = document.createElement('div');
    div.classList.add('jugadora-item', 'glass');

    div.addEventListener('mouseenter', () => {
        actualizarCardJugadora(jugadora);
    });

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
    let fotoMini = foto ? foto.replace('/clubes/', '/clubes/mini/') : '../img/equipo-predeterm.svg';
    imgClub.src = fotoMini;
    imgClub.className = 'equipo-imagen';
    imgClub.alt = jugadora.equipo?.nombre || '';

    const pNombre = document.createElement('p');
    pNombre.className = 'jugadora-nombre';
    const partes = nombreCompleto.trim().split(' ');
    const inicial = partes[0][0] + '.';
    const resto = partes.slice(1).join(' ');

    pNombre.textContent = resto ? `${inicial} ${resto}` : partes[0];
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

            icon.onclick = (e) => {
                e.stopPropagation();
                const idNacio = jugadora.nacionalidades_ids[idx];
                seleccionarPais({ id: idNacio, nombre: iso.toUpperCase(), iso: iso });
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
    const pPosicionText = document.createElement('span');
    pPosicionText.textContent = jugadora.posiciones_abrev[0] || 'N/A';
    pPosicion.appendChild(pPosicionText);

    div1_2.appendChild(divBanderaYPosicion);
    div1.appendChild(div1_2);

    const pEstado = document.createElement('p');
    pEstado.className = 'jugadora-estado';

    if (jugadora.retiro) {
        pEstado.textContent = 'Retirada';
        pEstado.style.color = 'var(--color-secundario)';
    } else {
        pEstado.textContent = 'Activa';
        pEstado.style.color = 'var(--color-success)';
    }

    div1.appendChild(pEstado);

    div.addEventListener('click', () => {
        window.location.href = `jugadora_ficha.html?id=${jugadora.id_jugadora}&slug=${slugNombre}`;
    });

    div.appendChild(pPosicion);
    div.appendChild(imgClub);
    div.appendChild(div1);
    div.appendChild(pNacimiento);
    div.appendChild(pValor);
    div.appendChild(pEstado);

    setTimeout(() => {
        div.classList.add('visible');
    }, index * 50);

    return div;
}

function updatePaginationUI() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    const prevBtn = document.createElement('button');
    const prevSpan = document.createElement('span');
    prevBtn.id = 'prevPage';
    prevSpan.textContent = '←';
    prevBtn.appendChild(prevSpan);

    const nextBtn = document.createElement('button');
    const nextSpan = document.createElement('span');
    nextBtn.id = 'nextPage';
    nextSpan.textContent = '→';
    nextBtn.appendChild(nextSpan);

    const indicator = document.createElement('span');
    indicator.id = 'pageIndicator';
    indicator.textContent = `Página ${currentPage} / ${totalPages}`;

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(indicator);
    paginationContainer.appendChild(nextBtn);

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const cambiarPagina = (nuevaPagina) => {
        currentPage = nuevaPagina;
        renderJugadorasPage(currentPage);

        const contenedorResto = document.getElementById('resto');
        if (contenedorResto) {
            contenedorResto.scrollTo({ top: 0, behavior: 'smooth' });
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

function inicializarFiltros(){

    // 🎯 Configuración de Autocorrección en RANGOS
    configurarParRango(inputEdadMin, inputEdadMax, 15, 60, 15, 60);
    configurarParRango(inputValorMin, inputValorMax, 0, 2000000, 0, 2000000);
    configurarParRango(inputAlturaMin, inputAlturaMax, 140, 220, 140, 220);

    // Escuchar cambios de valor e invocar aplicarFiltros()
    vincularInputRango(inputValorMin, inputValorMax, 'valorMin', 'valorMax');
    vincularInputRango(inputEdadMin, inputEdadMax, 'edadMin', 'edadMax');
    vincularInputRango(inputAlturaMin, inputAlturaMax, 'alturaMin', 'alturaMax');
    
    // 🎯 Inicializar Steppers con los datos cargados en paisesConLiga
    inicializarSteppersCascada();

    // --- AUTOCOMPLETE NOMBRE JUGADORA ---
    if (inputNombre) {
        inputNombre.addEventListener('input', (event) => {
            if (inputNombre.value.trim() === '') {
                desbloquearFiltros();
                return;
            }

            handleAutocompletePlayer(event, async (jugadora) => {
                if (jugadora && jugadora.id_jugadora) {
                    inputNombre.value = jugadora.nombre_completo;
                    filtrosEstado.jugadora = { 
                        id_jugadora: Number(jugadora.id_jugadora), 
                        nombre: jugadora.nombre_completo 
                    };
                    
                    await bloquearFiltrosPorJugadora(jugadora);
                }
            });
        });

        inputNombre.addEventListener('search', () => {
            if (inputNombre.value === '') {
                desbloquearFiltros();
            }
        });
    }

    // --- AUTOCOMPLETE NACIONALIDAD JUGADORA ---
    if (inputPaises[0]) {
        inputPaises[0].addEventListener('input', (event) => {
            if (inputPaises[0].value.trim() === '') {
                limpiarPais();
                return;
            }

            handleAutocompletePais(event, 'sugerencias-pais2', (pais) => {
                const idPais = typeof pais === 'object' ? pais.id : pais;
                const nombrePais = typeof pais === 'object' ? pais.nombre : 'País';
                const isoPais = typeof pais === 'object' ? pais.iso : '';

                if (idPais) {
                    seleccionarPais({ id: Number(idPais), nombre: nombrePais, iso: isoPais });
                }
            });
        });

        inputPaises[0].addEventListener('search', () => {
            if (inputPaises[0].value === '') {
                limpiarPais();
            }
        });
    }

    // --- AUTOCOMPLETE POSICIÓN ---
    if (inputPosiciones) {
        inputPosiciones.addEventListener('input', (event) => {
            handleAutocompletePosicion(event, 'sugerencias-posicion', (posicion) => {
                if (posicion && posicion.id) {
                    filtrosEstado.posiciones = { id: Number(posicion.id), nombre: posicion.nombre || posicion.abrev }; 
                }
            });
        });
    }

    // --- FILTROS DE RANGO (VALOR, ALTURA Y EDAD) ---
    const listenerRango = () => {
        filtrosEstado.valorMin = inputValorMin?.value ? Number(inputValorMin.value) : null;
        filtrosEstado.valorMax = inputValorMax?.value ? Number(inputValorMax.value) : null;
        filtrosEstado.alturaMin = inputAlturaMin?.value ? Number(inputAlturaMin.value) : null;
        filtrosEstado.alturaMax = inputAlturaMax?.value ? Number(inputAlturaMax.value) : null;
        filtrosEstado.edadMin = inputEdadMin?.value ? Number(inputEdadMin.value) : null;
        filtrosEstado.edadMax = inputEdadMax?.value ? Number(inputEdadMax.value) : null;

        aplicarFiltros();
    };

    [inputValorMin, inputValorMax, inputAlturaMin, inputAlturaMax, inputEdadMin, inputEdadMax].forEach(input => {
        if (input) input.addEventListener('input', listenerRango);
    });
}

// 🔍 Motor principal de filtrado acumulativo
function aplicarFiltros() {
    const parseNum = (val) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'string') {
            const numLimpio = val.replace(/\./g, '').replace(/,/g, '').trim();
            const n = Number(numLimpio);
            return isNaN(n) ? null : n;
        }
        const n = Number(val);
        return isNaN(n) ? null : n;
    };

    // Normalizar IDs
    const idPaisFiltro = filtrosEstado.paisEquipo?.id ?? filtrosEstado.paisEquipo?.id_pais ?? null;
    const idLigaFiltro = filtrosEstado.liga ? (filtrosEstado.liga.id ?? filtrosEstado.liga.id_liga ?? filtrosEstado.liga.liga ?? filtrosEstado.liga.id_competicion ?? null) : null;
    const idEquipoFiltro = filtrosEstado.equipo?.id ?? filtrosEstado.equipo?.id_equipo ?? null;

    // Obtener valores numéricos
    let valorMin = parseNum(filtrosEstado.valorMin);
    let valorMax = parseNum(filtrosEstado.valorMax);
    let alturaMin = parseNum(filtrosEstado.alturaMin);
    let alturaMax = parseNum(filtrosEstado.alturaMax);
    let edadMin = parseNum(filtrosEstado.edadMin);
    let edadMax = parseNum(filtrosEstado.edadMax);

    // 🎯 Ignorar rangos cuando están en sus límites por defecto (rango completo activo)
    if (valorMin !== null && valorMin <= 0) valorMin = null;
    if (valorMax !== null && valorMax >= 2000000) valorMax = null;

    if (alturaMin !== null && alturaMin <= 140) alturaMin = null;
    if (alturaMax !== null && alturaMax >= 220) alturaMax = null;

    if (edadMin !== null && edadMin <= 15) edadMin = null;
    if (edadMax !== null && edadMax >= 60) edadMax = null;

    // Comprobar si no hay ningún filtro activo
    const sinFiltrosActivos = 
        !filtrosEstado.jugadora &&
        idPaisFiltro === null &&
        idLigaFiltro === null &&
        idEquipoFiltro === null &&
        !filtrosEstado.pais &&
        (!filtrosEstado.posiciones || filtrosEstado.posiciones.length === 0) &&
        valorMin === null && valorMax === null &&
        alturaMin === null && alturaMax === null &&
        edadMin === null && edadMax === null;

    let resultado;

    if (sinFiltrosActivos) {
        resultado = jugadorasOriginal;
    } else {
        resultado = jugadorasOriginal.filter(jugadora => {

            // 0. Filtro por Jugadora Única
            if (filtrosEstado.jugadora) {
                return String(jugadora.id_jugadora) === String(filtrosEstado.jugadora.id_jugadora);
            }

            // 🎯 1. Filtro por País de la Liga
            if (idPaisFiltro !== null) {
                const idPaisLiga = jugadora.id_pais_liga 
                    ?? jugadora.liga?.id_pais 
                    ?? jugadora.equipo?.liga?.id_pais 
                    ?? jugadora.liga?.pais_id;

                if (idPaisLiga == null || String(idPaisLiga) !== String(idPaisFiltro)) return false;
            }

            // 🎯 2. Filtro por Liga
            if (idLigaFiltro !== null) {
                const idLiga = jugadora.id_liga ?? jugadora.liga?.id ?? jugadora.equipo?.id_liga;
                if (idLiga == null || String(idLiga) !== String(idLigaFiltro)) return false;
            }

            // 🎯 3. Filtro por Equipo Único
            if (idEquipoFiltro !== null) {
                const idEquipo = jugadora.equipo?.id ?? jugadora.id_equipo;
                if (idEquipo == null || String(idEquipo) !== String(idEquipoFiltro)) return false;
            }

            // 🎯 4. Filtro por Nacionalidad de la Jugadora
            if (filtrosEstado.pais && filtrosEstado.pais.id !== null) {
                const idPaisNacionalidadFiltro = String(filtrosEstado.pais.id);
                const coincidePais = jugadora.nacionalidades_ids && jugadora.nacionalidades_ids.some(id => String(id) === idPaisNacionalidadFiltro);
                if (!coincidePais) return false;
            }

            // 5. Filtro por Posición
            if (filtrosEstado.posiciones && filtrosEstado.posiciones.length > 0) {
                const coincidePos = filtrosEstado.posiciones.some(pos => 
                    jugadora.posiciones_ids && jugadora.posiciones_ids.some(posId => String(posId) === String(pos.id))
                );
                if (!coincidePos) return false;
            }

            // 💰 6. Filtro por Valor de Mercado
            const valorMercado = parseNum(jugadora.market_value) ?? 0;
            if (valorMin !== null && valorMercado < valorMin) return false;
            if (valorMax !== null && valorMercado > valorMax) return false;

            // 📐 7. Filtro por Altura (cm)
            const altura = parseNum(jugadora.altura) ?? 0;
            if (alturaMin !== null && altura < alturaMin) return false;
            if (alturaMax !== null && altura > alturaMax) return false;

            // 🎂 8. Filtro por Edad
            if (edadMin !== null || edadMax !== null) {
                const edad = parseNum(jugadora.edad) ?? 0;
                if (edad === 0) return false;
                if (edadMin !== null && edad < edadMin) return false;
                if (edadMax !== null && edad > edadMax) return false;
            }

            return true;
        });
    }

    if (window.innerWidth < 768) {
        const cabecera = document.getElementById('cabecera-wiki-equipos');
        if (cabecera) cabecera.classList.remove('active');
    }

    displayJugadoras(resultado);
}

// 🎯 Funciones para gestión de Selección Única de País
function seleccionarPais(paisObj) {
    filtrosEstado.pais = paisObj;
    
    // Mantiene el nombre del país visible para que el input tipo search active su 'X'
    const inputPais = document.getElementById('input-pais');
    if (inputPais) {
        inputPais.value = paisObj.nombre;
    }

    actualizarFotoPaisUI();
    aplicarFiltros();
}

function limpiarPais() {
    filtrosEstado.pais = null;
    
    // Vacía el input si la limpieza se activó desde la bandera u otra acción
    const inputPais = document.getElementById('input-pais');
    if (inputPais && inputPais.value !== '') {
        inputPais.value = '';
    }

    actualizarFotoPaisUI();
    aplicarFiltros();
}

function actualizarFotoPaisUI() {
    const fotoPais = document.getElementById('foto-pais');
    if (!fotoPais) return;

    if (filtrosEstado.pais && filtrosEstado.pais.iso) {
        fotoPais.className = `fi fi-${filtrosEstado.pais.iso.toLowerCase()}`;
        fotoPais.title = `Filtro: ${filtrosEstado.pais.nombre}. Clic para quitar.`;
        fotoPais.style.cursor = 'pointer';
        fotoPais.onclick = limpiarPais; // Al hacer clic en la bandera seleccionada, se borra el filtro
    } else {
        fotoPais.className = 'fi fi-xx';
        fotoPais.title = '';
        fotoPais.style.cursor = 'default';
        fotoPais.onclick = null;
    }
}

// 🔒 Bloquea y autocompleta todos los filtros según la jugadora seleccionada
async function bloquearFiltrosPorJugadora(jugadoraBasica) {
    // 1. Obtener la información completa de la jugadora vía API
    const data = await cargarJugadoraDatos(jugadoraBasica.id_jugadora);

    const selectores = document.querySelectorAll('.btn-stepper');

    //const display1 = selectores[0].getElementsByClassName('stepper-display')
    const display2 = document.getElementById('display-liga')
    const display3 = document.getElementById('display-equipo')
    //const display3 = selectores[2].getElementsByClassName('stepper-display')

    console.log(data)
    
    const jugadora = (Array.isArray(data) ? data[0] : data) || jugadoraBasica;
    if (!jugadora) return;

    // --- A. INPUT NOMBRE JUGADORA ---
    if (inputNombre) {
        inputNombre.value = jugadora.nombre_completo || jugadora.nombre || jugadoraBasica.nombre || '';
    }

    // --- B. FOTO DE JUGADORA ---
    const fotoJugadora = document.getElementById('foto-jugadora');
    if (fotoJugadora) {
        fotoJugadora.src = jugadora.imagen || '/img/predeterm.png';
    }

    // --- C. PAÍS / NACIONALIDAD ---
    const idPais = jugadora.nacionalidades_ids?.[0] || jugadora.pais_id || jugadora.id_pais || (Array.isArray(jugadora.pais_iso) ? jugadora.pais_iso[0] : null);
    const isoPais = Array.isArray(jugadora.pais_iso) ? jugadora.pais_iso[0] : (jugadora.nacionalidades_isos?.[0] || jugadora.pais_iso || 'xx');
    const nombrePais = jugadora.nacionalidades_nombres?.[0] || jugadora.nacionalidad?.nombre || jugadora.pais_nombre || jugadora.pais || '';

    if (idPais || isoPais) {
        seleccionarPais({
            id: Number(idPais) || 0,
            nombre: nombrePais,
            iso: isoPais
        });
    }

    const inputPais = document.getElementById('input-pais');
    if (inputPais) inputPais.disabled = true;

    // --- D. EQUIPO / CLUB ---
    if (jugadora.equipo) {
        console.log(jugadora.equipo)
        const nombreEquipo = jugadora.equipo.nombre || jugadora.equipo.nombre_equipo || jugadora.nombre_equipo || '';
        const ligaNombre = jugadora.equipo.liga.nombre;
        const idEquipo = jugadora.equipo.id || jugadora.equipo.id_equipo;
        const escudoEquipo = jugadora.equipo.escudo || jugadora.equipo.logo || jugadora.equipo.imagen;
        const ligaLogo = jugadora.equipo.liga.logo;

        filtrosEstado.equipos = [{
            id: Number(idEquipo),
            nombre: nombreEquipo,
            escudo: escudoEquipo
        }];
        //renderizarTags('equipos');

        if (selectores) {
            display2.innerHTML = `<img id="liga-logo" src="${ligaLogo}" alt="Logo" class="icono-liga">
                                    <span id="liga-nombre">${ligaNombre}</span>`;

            display3.innerHTML = `<img id="equipo-escudo" src="${escudoEquipo}" alt="Escudo" class="icono-equipo">
                                    <span id="equipo-nombre">${nombreEquipo}</span>`;

            selectores.forEach(element => {
                element.disabled = true
            });;
        }
    } else {
        if (selectores) selectores.disabled = true;
    }

    // --- E. POSICIONES ---
    if (jugadora.posiciones_ids && jugadora.posiciones_ids.length > 0) {
        filtrosEstado.posiciones = jugadora.posiciones_ids.map((id, index) => ({
            id: Number(id),
            nombre: jugadora.posiciones_abrev ? jugadora.posiciones_abrev[index] : 'POS'
        }));
        //renderizarTags('posiciones');
    }
    const inputPosicion = document.getElementById('input-posicion');
    if (inputPosicion) inputPosicion.disabled = true;

    // --- F. EDAD ---
    // Obtenemos edad directa o la calculamos con la fecha de nacimiento
    let edad = jugadora.edad;
    if (!edad && jugadora.nacimiento) {
        edad = calcularEdad(jugadora.nacimiento);
    }

    if (edad) {
        filtrosEstado.edadMin = Number(edad);
        filtrosEstado.edadMax = Number(edad);
        if (inputEdadMin) { inputEdadMin.value = edad; inputEdadMin.disabled = true; }
        if (inputEdadMax) { inputEdadMax.value = edad; inputEdadMax.disabled = true; }
    } else {
        if (inputEdadMin) inputEdadMin.disabled = true;
        if (inputEdadMax) inputEdadMax.disabled = true;
    }

    // --- G. ALTURA ---
    if (jugadora.altura) {
        filtrosEstado.alturaMin = Number(jugadora.altura);
        filtrosEstado.alturaMax = Number(jugadora.altura);
        if (inputAlturaMin) { inputAlturaMin.value = jugadora.altura; inputAlturaMin.disabled = true; }
        if (inputAlturaMax) { inputAlturaMax.value = jugadora.altura; inputAlturaMax.disabled = true; }
    } else {
        if (inputAlturaMin) inputAlturaMin.disabled = true;
        if (inputAlturaMax) inputAlturaMax.disabled = true;
    }

    // --- H. VALOR DE MERCADO ---
    if (jugadora.Valor) {
        filtrosEstado.valorMin = Number(jugadora.Valor);
        filtrosEstado.valorMax = Number(jugadora.Valor);
        if (inputValorMin) { inputValorMin.value = jugadora.Valor; inputValorMin.disabled = true; }
        if (inputValorMax) { inputValorMax.value = jugadora.Valor; inputValorMax.disabled = true; }
    } else {
        if (inputValorMin) inputValorMin.disabled = true;
        if (inputValorMax) inputValorMax.disabled = true;
    }

    // Aplicar filtrado final
    aplicarFiltros();
}

// 🔓 Desbloquea y limpia todos los filtros al quitar la jugadora
function desbloquearFiltros() {
    filtrosEstado.jugadora = null;

    const selectores = document.querySelectorAll('.btn-stepper');

    const display2 = document.getElementById('display-liga');
    const display3 = document.getElementById('display-equipo')

    // Restaurar Input Nombre y Foto
    const inputNombre = document.getElementById('input-nombre');
    if (inputNombre) inputNombre.value = '';

    const fotoJugadora = document.getElementById('foto-jugadora');
    if (fotoJugadora) fotoJugadora.src = '/img/predeterm.png';

    // Desbloquear y limpiar País
    limpiarPais();
    const inputPais = document.getElementById('input-pais');
    if (inputPais) inputPais.disabled = false;

    // Desbloquear y limpiar Equipo
    filtrosEstado.equipos = [];
    //renderizarTags('equipos');
    const inputEquipo = document.getElementById('input-equipo');
    if (inputEquipo) {
        inputEquipo.value = '';
        inputEquipo.disabled = false;
    }

    // Desbloquear y limpiar Posiciones
    filtrosEstado.posiciones = [];
    //renderizarTags('posiciones');
    const inputPosicion = document.getElementById('input-posicion');
    if (inputPosicion) inputPosicion.disabled = false;

    // Desbloquear y limpiar Edad
    filtrosEstado.edadMin = null;
    filtrosEstado.edadMax = null;

    if (inputEdadMin) { inputEdadMin.value = ''; inputEdadMin.disabled = false; }
    if (inputEdadMax) { inputEdadMax.value = ''; inputEdadMax.disabled = false; }

    // Desbloquear y limpiar Altura
    filtrosEstado.alturaMin = null;
    filtrosEstado.alturaMax = null;

    if (inputAlturaMin) { inputAlturaMin.value = ''; inputAlturaMin.disabled = false; }
    if (inputAlturaMax) { inputAlturaMax.value = ''; inputAlturaMax.disabled = false; }

    // Desbloquear y limpiar Valor
    filtrosEstado.valorMin = null;
    filtrosEstado.valorMax = null;

    if (inputValorMin) { inputValorMin.value = ''; inputValorMin.disabled = false; }
    if (inputValorMax) { inputValorMax.value = ''; inputValorMax.disabled = false; }

    if (selectores) {
            display2.innerHTML = `<img id="liga-logo" src="/img/equipo-predeterm.svg" alt="Logo" class="icono-liga">
                                    <span id="liga-nombre">Todas las ligas</span>`;

            display3.innerHTML = `<img id="equipo-escudo" src="/img/equipo-predeterm.svg" alt="Escudo" class="icono-equipo">
                                    <span id="equipo-nombre">Todos los equipos</span>`;

            selectores.forEach(element => {
                element.disabled = false
            });;
        }

    aplicarFiltros();
}

// 🛠️ Configura un par de inputs (Mín y Máx) para que se autocorrijan y no se crucen entre sí
function configurarParRango(inputMin, inputMax, absMin, absMax, defaultMin, defaultMax) {
    if (!inputMin || !inputMax) return;

    // Atributos HTML iniciales
    inputMin.min = String(absMin);
    inputMin.max = String(absMax);
    inputMax.min = String(absMin);
    inputMax.max = String(absMax);

    // 🔴 VALIDACIÓN DEL INPUT MÍNIMO
    inputMin.addEventListener('change', () => {
        let valMin = Number(inputMin.value);
        let valMax = Number(inputMax.value);

        // Si está vacío o no es un número
        if (inputMin.value.trim() === '' || isNaN(valMin)) {
            valMin = defaultMin;
        }

        // 1. No puede ser inferior al absoluto mínimo
        if (valMin < absMin) valMin = absMin;

        // 2. 🎯 No puede superar al valor Máximo actual
        if (valMin > valMax) valMin = valMax;

        inputMin.value = valMin;
        inputMin.dispatchEvent(new Event('input'));
    });

    // 🔵 VALIDACIÓN DEL INPUT MÁXIMO
    inputMax.addEventListener('change', () => {
        let valMin = Number(inputMin.value);
        let valMax = Number(inputMax.value);

        // Si está vacío o no es un número
        if (inputMax.value.trim() === '' || isNaN(valMax)) {
            valMax = defaultMax;
        }

        // 1. No puede superar el absoluto máximo
        if (valMax > absMax) valMax = absMax;

        // 2. 🎯 No puede ser inferior al valor Mínimo actual
        if (valMax < valMin) valMax = valMin;

        inputMax.value = valMax;
        inputMax.dispatchEvent(new Event('input'));
    });
}

// Función para conectar las entradas HTML con filtrosEstado
function vincularInputRango(elemMin, elemMax, claveMin, claveMax) {
    if (!elemMin || !elemMax) return;

    const actualizar = () => {
        filtrosEstado[claveMin] = elemMin.value;
        filtrosEstado[claveMax] = elemMax.value;
        aplicarFiltros();
    };

    elemMin.addEventListener('input', actualizar);
    elemMax.addEventListener('input', actualizar);
}


/* ==========================================================================
   🎯 LÓGICA DE STEPPERS EN CASCADA (PAÍS EQUIPO -> LIGA -> EQUIPO)
   ========================================================================== */

export async function inicializarSteppersCascada() {
    // 1. Asignar Event Listeners a los botones HTML
    document.getElementById('btn-pais-prev')?.addEventListener('click', () => moverPais(-1));
    document.getElementById('btn-pais-next')?.addEventListener('click', () => moverPais(1));

    document.getElementById('btn-liga-prev')?.addEventListener('click', () => moverLiga(-1));
    document.getElementById('btn-liga-next')?.addEventListener('click', () => moverLiga(1));

    document.getElementById('btn-equipo-prev')?.addEventListener('click', () => moverEquipo(-1));
    document.getElementById('btn-equipo-next')?.addEventListener('click', () => moverEquipo(1));

    // 2. Cargar Países Iniciales
    opcionesPaises = [
        { id_pais: null, nombre: 'Todos los países', iso: '' },
        ...(paisesConLiga || [])
    ];

    // 3. Cargar en paralelo ligas y sus correspondientes equipos
    await Promise.all(
        opcionesPaises.map(async (pais) => {
            const idPais = pais.id_pais ?? pais.id ?? null;
            if (idPais !== null) {
                // Obtenemos las ligas del país
                pais.ligas = await ligasxPais(idPais);

                // Si el país tiene ligas, cargamos en paralelo los equipos de cada liga
                if (Array.isArray(pais.ligas) && pais.ligas.length > 0) {
                    await Promise.all(
                        pais.ligas.map(async (liga) => {
                            const idLiga = liga.id_liga ?? liga.liga ?? liga.id ?? liga.id_competicion;
                            liga.equipos = await equiposxliga(idLiga);
                        })
                    );
                }
            } else {
                pais.ligas = [];
            }
        })
    );

    idxPaisEquipo = 0;

    // 4. Actualizar interfaz una vez cargados todos los datos
    actualizarUIPais();
}

// --- 1. SECTOR PAÍS DEL EQUIPO ---
function moverPais(dir) {
    if (opcionesPaises.length === 0) return;
    idxPaisEquipo = (idxPaisEquipo + dir + opcionesPaises.length) % opcionesPaises.length;
    actualizarUIPais();
}

function actualizarUIPais() {
    const paisSel = opcionesPaises[idxPaisEquipo];
    
    // DOM País
    const elNombre = document.getElementById('pais-nombre');
    const elBandera = document.getElementById('pais-bandera');
    if (elNombre) elNombre.textContent = paisSel.nombre;
    if (elBandera) {
        elBandera.className = paisSel.iso ? `fi fi-${paisSel.iso.toLowerCase()}` : 'fi';
    }

    // Actualizar Estado (Soporta id_pais o id)
    const idPais = paisSel.id_pais ?? paisSel.id ?? null;
    filtrosEstado.paisEquipo = idPais !== null ? { id: idPais, nombre: paisSel.nombre, iso: paisSel.iso } : null;

    // Actualizar Ligas en cascada
    actualizarOpcionesLigas();
}

// --- 2. SECTOR LIGA ---
function actualizarOpcionesLigas() {
    const paisActual = opcionesPaises[idxPaisEquipo];
    
    // Obtener ligas asociadas al país actual
    const ligasDelPais = (paisActual && paisActual.ligas) ? paisActual.ligas : [];

    console.log(ligasDelPais)

    opcionesLigas = [
        { id: null, id_liga: null, nombre: 'Todas las ligas' },
        ...ligasDelPais.filter(liga => Number(liga.tipo) === 1)
    ];
    idxLiga = 0;

    actualizarUILiga();
}

function moverLiga(dir) {
    if (opcionesLigas.length === 0) return;
    idxLiga = (idxLiga + dir + opcionesLigas.length) % opcionesLigas.length;
    actualizarUILiga();
}

function actualizarUILiga() {
    const ligaSel = opcionesLigas[idxLiga];
    
    // DOM Liga
    const elNombre = document.getElementById('liga-nombre');
    const logo = document.getElementById('liga-logo');
    if (elNombre) elNombre.textContent = ligaSel.nombre;
    if (logo) logo.src = ligaSel.logo || '/img/equipo-predeterm.svg';

    // Normalizar ID de la liga
    const idLiga = ligaSel ? (ligaSel.id ?? ligaSel.id_liga ?? ligaSel.liga ?? ligaSel.id_competicion ?? null) : null;

    // Actualizar Estado
    filtrosEstado.liga = idLiga !== null ? { ...ligaSel, id: idLiga } : null;

    // Actualizar Equipos en cascada
    actualizarOpcionesEquipos();
}

// --- 3. SECTOR EQUIPO (ÚNICO) ---
function actualizarOpcionesEquipos() {
    const paisActual = opcionesPaises[idxPaisEquipo];
    const ligaActual = opcionesLigas[idxLiga];

    let equiposFiltrados = [];

    const idLigaActual = ligaActual ? (ligaActual.id ?? ligaActual.id_liga ?? ligaActual.liga ?? ligaActual.id_competicion ?? null) : null;
    const idPaisActual = paisActual ? (paisActual.id_pais ?? paisActual.id ?? null) : null;

    // Si hay una liga seleccionada, obtener sus equipos
    if (idLigaActual !== null && ligaActual.equipos) {
        equiposFiltrados = ligaActual.equipos;
    } 
    // Si no hay liga seleccionada pero sí un país, aplanar todos los equipos de las ligas del país
    else if (idPaisActual !== null && paisActual.ligas) {
        equiposFiltrados = paisActual.ligas.flatMap(l => l.equipos || []);
    }

    opcionesEquipos = [
        { id: null, id_equipo: null, nombre: 'Todos los equipos', escudo: '/img/equipo-predeterm.svg' },
        ...equiposFiltrados
    ];
    idxEquipo = 0;

    actualizarUIEquipo();
}

function moverEquipo(dir) {
    if (opcionesEquipos.length === 0) return;
    idxEquipo = (idxEquipo + dir + opcionesEquipos.length) % opcionesEquipos.length;
    actualizarUIEquipo();
}

function actualizarUIEquipo() {
    const equipoSel = opcionesEquipos[idxEquipo];

    // DOM Equipo
    const elNombre = document.getElementById('equipo-nombre');
    const elEscudo = document.getElementById('equipo-escudo');
    if (elNombre) elNombre.textContent = equipoSel.nombre;
    if (elEscudo) {
        elEscudo.src = equipoSel.escudo || equipoSel.logo || equipoSel.imagen || '/img/equipo-predeterm.svg';
    }

    // Normalizar ID del equipo
    const idEquipo = equipoSel ? (equipoSel.id ?? equipoSel.id_equipo ?? null) : null;

    // Actualizar Estado
    filtrosEstado.equipo = idEquipo !== null ? { id: idEquipo, nombre: equipoSel.nombre, escudo: equipoSel.escudo } : null;

    // Trigger de filtrado global de jugadoras
    aplicarFiltros();
}

// LOGICA DE POPUP FILTRO EN MOVIL
const btnVerFiltros = document.getElementById('ver-filtros');
const btnCerrarFiltros = document.getElementById('cerrar-filtros');
const contenedorFiltros = document.getElementById('filtros');

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
    document.body.style.overflow = 'hidden';
}

function cerrarFiltros() {
    contenedorFiltros.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

if (btnVerFiltros) btnVerFiltros.addEventListener('click', abrirFiltros);
if (btnCerrarFiltros) btnCerrarFiltros.addEventListener('click', cerrarFiltros);
if (overlay) overlay.addEventListener('click', cerrarFiltros);

const contenedorResto = document.getElementById('resto');
const headerList = document.querySelector('.header-list');

if (contenedorResto && headerList) {
    contenedorResto.addEventListener('scroll', () => {
        if (contenedorResto.scrollTop > 0) {
            headerList.classList.add('is-scrolled');
        } else {
            headerList.classList.remove('is-scrolled');
        }
    });
}

const itemsContainer = document.getElementById('items-container');

if (itemsContainer) {
    function comprobarScrollFinal() {
        const alFinal = itemsContainer.scrollHeight - itemsContainer.scrollTop <= itemsContainer.clientHeight + 5;
        
        if (alFinal) {
            itemsContainer.classList.add('at-bottom');
        } else {
            itemsContainer.classList.remove('at-bottom');
        }
    }

    itemsContainer.addEventListener('scroll', comprobarScrollFinal);
    comprobarScrollFinal();
}