import { formatearValorMercado } from "/js/api/jugadora.js";
import { fetchEquipoById ,jugadorasxTemporadaYEquipo, fetchMultiplesEquiposPalmares } from "/js/api/equipos.js";
import { calcularEdad } from '/js/api/jugadora.js';
import { crearAlineacion, ponerJugadoraEnField, limpiarCampoYSuplentes } from "/js/utils/campo-futbol.js";
import { renderSlider } from "/js/utils/slider.js";

const divPalmares = document.getElementById('palmares');
const historicasPlaceholder =  document.getElementById('historicas-placeholder');
const jugadorasContainer =  document.getElementById('jugadoras-container');
let jugadorasHistoricas = null;
let equipo;
let valorMercadoTotal = 0;
setupSliderTemporadas(); // Inicializamos el slider de temporadas

export async function initFicha(id){
    equipo = await fetchEquipoById(id);
    
    if (equipo?.formacion?.nombre) {
        crearAlineacion(equipo.formacion.nombre);
    }

    //const containerEquipo = document.querySelector('#tabla-info');
    document.documentElement.style.setProperty('--equipo-color', equipo.color);

    const bandera = document.getElementById('pais-bandera')
    const bandera2 = document.getElementById('bandera-pais')
    const iso = equipo.escudo?.match(/\/media\/([^\/]+)\//)?.[1] || '';

    document.getElementById('fundacion-datos').textContent = equipo.fundacion;
    document.getElementById('fundacion').textContent = 'Est. ' + equipo.fundacion;
    document.getElementById('formacion').textContent = equipo.formacion.nombre;
    document.getElementById('equipo-nombre').textContent = equipo.nombre;
    bandera.classList.add('fi');
    bandera.classList.add(`fi-${iso.toLowerCase()}`); 
    bandera2.classList.add('fi');
    bandera2.classList.add(`fi-${iso.toLowerCase()}`);
    document.getElementById('nacionalidad-nombre-texto').textContent = equipo.liga.pais;
    document.getElementById('historicas-equipo-nombre').textContent = equipo.nombre;
    document.getElementById('nombre-equipo').textContent = equipo.nombre;
    document.getElementById('escudo').src = equipo.escudo;
    document.getElementById('equipo-img').src = equipo.escudo;
    document.getElementById('liga-item').src = equipo.liga.logo;
    document.getElementById('logo-liga').src = equipo.liga.logo;
    document.getElementById('liga-nombre-texto').textContent = equipo.liga.nombre;
    document.getElementById('historicas-escudo').src = equipo.escudo;
    document.getElementById('btn-estadio').href = `https://www.google.com/maps/search/?api=1&query=${equipo.lat},${equipo.long}`;

    await Promise.all([ crearFichaJugadorasActuales(id, equipo.color), crearFichaJugadorasDeSiempre(id, equipo.color)], displayPalmares(id));
    crearBotonesTemporada(equipo.fundacion, equipo.color);
    return equipo;
}
// ==========================================
// 1. MÓDULO DE PALMARÉS
// ==========================================

export async function displayPalmares(equipo) {
    const data = await fetchMultiplesEquiposPalmares(equipo, '1950-act');
    if (!data?.success?.[0]) return;

    const palmaresAgrupado = agruparTrofeos(data.success[0]);
    console.log('Palmarés agrupado:', palmaresAgrupado);
    renderSlider('#left', palmaresAgrupado);

    palmaresAgrupado.forEach(trofeo => {
        const div = document.createElement("div");
        div.classList.add("trofeo");
        div.dataset.trofeoName = trofeo.nombre;
        
        div.innerHTML = `
            <img src="${trofeo.icono}" alt="${trofeo.nombre}" loading="lazy" style="width: 60px; height: 60px; object-fit: contain;">
            <p class="trofeo-pc">${trofeo.count}</p>
            <p class="trofeo-movil">${trofeo.count}</p>
        `;

        divPalmares.appendChild(div);
    });
}

function agruparTrofeos(trofeos) {
    const agrupado = {};
    if (!trofeos || trofeos.length === 0) return [];

    trofeos.forEach(t => {
        if (!agrupado[t.id]) {
            agrupado[t.id] = {
                id: t.id,
                nombre: t.nombre,
                icono: t.icono,
                tipo: t.tipo,
                competicion: t.competicion, // 👈 Incluye el objeto competición completo (id, nombre, logo, pais, etc.)
                count: 0,
                temporadas: []
            };
        }
        agrupado[t.id].count += 1;
        agrupado[t.id].temporadas.push(t.temporada);
    });

    return Object.values(agrupado);
}

// ==========================================
// 2. PROCESAMIENTO Y FILTRADO DE JUGADORAS
// ==========================================

function agruparJugadorasPorTrayectoria(jugadoras) {
    const mapaJugadoras = {};
    const jugadorasAgrupadas = [];

    jugadoras.forEach(j => {
        const anyoInicio = j.trayectoria?.inicio ? j.trayectoria.inicio.toString().split('-')[0] : '????';
        const anyoFin = (j.trayectoria?.fin && j.trayectoria.fin !== 'act') ? j.trayectoria.fin.toString().split('-')[0] : 'act';
        const fechaTexto = `${anyoInicio} - ${anyoFin}`;
        
        if (!mapaJugadoras[j.id_jugadora]) {
            mapaJugadoras[j.id_jugadora] = {
                ...j,
                etapas: [fechaTexto]
            };
            jugadorasAgrupadas.push(mapaJugadoras[j.id_jugadora]);
        } else {
            mapaJugadoras[j.id_jugadora].etapas.push(fechaTexto);
        }
    });

    return jugadorasAgrupadas;
}

async function esperarGridTactico() {
    let intentos = 0;
    while (document.querySelectorAll('#grid td.activado').length === 0 && intentos < 20) {
        await new Promise(resolve => setTimeout(resolve, 50));
        intentos++;
    }
    return intentos < 20;
}

function obtenerJugadorasDestacadas(jugadoras) {
    const masCara = [...jugadoras].reduce((prev, curr) => 
        (Number(curr.market_value || 0) >= Number(prev.market_value || 0)) ? curr : prev
    );

    const masJoven = [...jugadoras].reduce((prev, curr) => {
        const fechaCurr = curr.nacimiento ? new Date(curr.nacimiento) : new Date(0);
        const fechaPrev = prev.nacimiento ? new Date(prev.nacimiento) : new Date(0);
        return (fechaCurr > fechaPrev) ? curr : prev;
    });

    const masMayor = [...jugadoras].reduce((prev, curr) => {
        const fechaCurr = curr.nacimiento ? new Date(curr.nacimiento) : new Date();
        const fechaPrev = prev.nacimiento ? new Date(prev.nacimiento) : new Date();
        return (fechaCurr < fechaPrev) ? curr : prev;
    });

    return { masCara, masJoven, masMayor };
}

// ==========================================
// 3. COMPONENTES DEL DOM (CONSTRUCTORES)
// ==========================================

function crearCardDestacada(jugadora, etiqueta) {
    const cardContainer = document.createElement('div');
    const slugNombre = (jugadora.nombre_completo || jugadora.nombre).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const card = document.createElement('div');
    card.style.setProperty('--equipo-color', jugadora.equipo.color);
    card.className = 'jugadora-item destacada-card visible'; 
    Object.assign(cardContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: '1'
    });

    cardContainer.style.background =
    `radial-gradient(
      farthest-corner at left bottom,
      color-mix(in srgb, var(--color-secundario) 80%, black) 0%,
      ${jugadora.equipo.color} 100%
    )`;
    
    const badge = document.createElement('span');
    badge.className = 'badge-destacada';
    badge.textContent = etiqueta;
    badge.style.textWrap = 'nowrap';
    badge.style.fontSize = '0.8em';

    const img = document.createElement('img');
    img.src = jugadora.imagen ? jugadora.imagen : '/static/img/predeterm.png';
    img.className = 'jugadora-imagen';
    img.loading = 'lazy';
    img.alt = jugadora.nombre_completo || jugadora.apodo || jugadora.nombre;
    
    const info = document.createElement('div');
    info.className = 'info-destacada';
    
    let datoExtra = etiqueta === 'MÁS CARA' 
        ? (formatearValorMercado(jugadora.market_value) || 'N/A')
        : (calcularEdad(jugadora.nacimiento) + ' años');

    info.innerHTML = `<p>${datoExtra}</p>`;

    cardContainer.appendChild(badge);
    card.appendChild(img);
    cardContainer.appendChild(card);
    cardContainer.appendChild(info);
    
    card.onclick = () => window.location.href = `/jugadora/${jugadora.id_jugadora}/${slugNombre}/`;
    return cardContainer;
}

/**
 * COMPONENTE ÚNICO REUTILIZABLE para tarjetas de jugadoras (General e Histórica)
 */
function crearFichaBaseJugadora(jugadora, colorPredeterminado, mostrarEtapas = false) {
    const nombreCompleto = jugadora.nombre_completo || 'Desconocida';
    const slugNombre = nombreCompleto.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'jugadora-wrapper';

    const div = document.createElement('div');
    div.classList.add('jugadora-item', 'glass');
    if (jugadora.equipo?.id === 83) div.classList.add('icono');

    const div1 = document.createElement('div');
    const div1_2 = document.createElement('div');
    div1.className = 'jugadora-div1';
    div1_2.className = 'jugadora-div1_2';

    // Perfil
    const img = document.createElement('img');
    img.src = jugadora.imagen ? jugadora.imagen : '/img/predeterm.png';
    img.width = 70;
    img.height = 70;
    img.className = 'jugadora-imagen';
    img.loading = 'lazy';
    img.alt = nombreCompleto;
    div1.appendChild(img);

    // Nombre
    const pNombre = document.createElement('p');
    pNombre.className = 'jugadora-nombre';
    pNombre.textContent = nombreCompleto; 
    pNombre.style.background = jugadora.equipo?.color || colorPredeterminado;
    div1_2.appendChild(pNombre);

    // Iconos (Bandera y Ligas)
    const divBanderaYPosicion = document.createElement('div');
    divBanderaYPosicion.className = 'jugadora-banderas-posicion';

    const divBanderas = document.createElement('div');
    divBanderas.className = 'jugadora-banderas';

    if (jugadora.nacionalidades_isos?.[0]) {
        const iso = jugadora.nacionalidades_isos[0];
        const icon = document.createElement('span');
        icon.classList.add('fi');
        icon.classList.add(`fi-${iso.toLowerCase()}`); 
        divBanderas.appendChild(icon);
    }

    const imgLiga = document.createElement('img');
    if (jugadora.equipo?.liga_logo) {
        imgLiga.src = jugadora.equipo.liga_logo;
    } else if (jugadora.equipo?.id === 83) { 
        imgLiga.src = jugadora.equipo.escudo;
    }      
    divBanderas.appendChild(imgLiga);

    if (jugadora.equipo?.escudo) {
        const imgClub = document.createElement('img');
        imgClub.src = jugadora.equipo.escudo;
        imgClub.className = 'equipo-imagen';
        imgClub.alt = jugadora.equipo?.nombre;
        divBanderas.appendChild(imgClub);
    }

    // Posiciones
    const pPosicion = document.createElement('div');
    pPosicion.className = 'jugadora-posicion';
    (jugadora.posiciones_abrev || []).forEach(pos => {
        const span = document.createElement('span');
        span.textContent = typeof gettext === 'function' ? gettext(pos) : pos;
        if (jugadora.posiciones_ids) {
            span.id = jugadora.posiciones_ids[jugadora.posiciones_abrev.indexOf(pos)];
        }
        span.className = 'pos-' + pos;
        pPosicion.appendChild(span);
    });

    divBanderaYPosicion.appendChild(divBanderas);
    divBanderaYPosicion.appendChild(pPosicion);
    div1_2.appendChild(divBanderaYPosicion);
    div1.appendChild(div1_2);
    div.appendChild(div1);

    // Estilos de Fondo
    const colorPrimario = jugadora.equipo?.color || colorPredeterminado || 'var(--color-primario)';
    const colorSecundario = jugadora.equipo?.colorSecundario || 'transparent';
    const backgroundGradient = `
            linear-gradient(
                to bottom,
                color-mix(in srgb, ${colorPrimario} 50%, transparent 50%),
                color-mix(in srgb, ${colorPrimario} 80%, #000 20%)
            ),
            url('/img/fondo_cesped.webp') center / cover no-repeat
        `;
        
    div.style.background = backgroundGradient;
    div.style.border = '1px solid ' + colorPrimario;

    div.addEventListener('click', () => {
        window.location.href = `/jugadora/${jugadora.id_jugadora}/${slugNombre}/`;
    });

    wrapper.appendChild(div);

    // Si es del histórico ("De siempre"), inyectamos el bloque de etapas abajo
    if (mostrarEtapas && jugadora.etapas) {
        const etapasDiv = document.createElement('div');
        etapasDiv.className = 'jugadora-etapas-outside';
        etapasDiv.textContent = jugadora.etapas.join(', ');
        etapasDiv.style.fontSize = '0.7em';
        etapasDiv.style.textAlign = 'center';
        etapasDiv.style.marginTop = '5px';
        wrapper.appendChild(etapasDiv);
    }

    return wrapper;
}

// ==========================================
// 4. CONTROLADORES PRINCIPALES (ORQUESTADORES)
// ==========================================

export async function crearFichaJugadorasActuales(equipo, color) {
    const jugadoras = await jugadorasxTemporadaYEquipo(equipo, 'actual');
    valorMercadoTotal = calcularValorMercadoTotal(jugadoras.success);
    document.getElementById('valor').textContent = valorMercadoTotal;
    console.log('actuales', jugadoras.success)
    if (jugadoras.error) {
        console.error('Error al obtener jugadoras:', jugadoras.error);
        return;
    }
    await displayJugadorasActuales('jugadoras-actuales-container', jugadoras.success, color);
}

export async function crearFichaJugadorasDeSiempre(equipo, color) {
    jugadorasHistoricas = await jugadorasxTemporadaYEquipo(equipo, '');
    if (jugadorasHistoricas.error) {
        console.error('Error al obtener jugadoras:', jugadorasHistoricas.error);
        return;
    }
    //displayJugadorasHistoricas('jugadoras-container', jugadorasHistoricas.success, color);
}

async function displayJugadorasActuales(id, jugadoras, color) {

    const container = document.getElementById(id);
    if (!container || !jugadoras || jugadoras.length === 0) return;

    const destacadosContainer = document.getElementById('jugadoras-destacadas-container');
    if (destacadosContainer) destacadosContainer.innerHTML = '';

    await esperarGridTactico();

    if (destacadosContainer) {
        const { masCara, masJoven, masMayor } = obtenerJugadorasDestacadas(jugadoras);
        destacadosContainer.appendChild(crearCardDestacada(masCara, 'MÁS CARA'));
        destacadosContainer.appendChild(crearCardDestacada(masJoven, 'MÁS JOVEN'));
        destacadosContainer.appendChild(crearCardDestacada(masMayor, 'MÁS MAYOR'));
    }

    // 1. Limpiar el campo y los suplentes antes de pintar
    limpiarCampoYSuplentes();

    // 2. Ordenar por IDs de posición
    jugadoras.sort((a, b) => {
        const idA = a.posiciones_ids?.[0] || 999;
        const idB = b.posiciones_ids?.[0] || 999;
        return idA - idB;
    });

    const suplentesContainer = document.getElementById('suplentes');
    const fragmentSuplentes = document.createDocumentFragment();

    // 3. Ubicar jugadoras en el campo o en suplentes
    jugadoras.forEach(jugadora => {
        const posicionPrincipal = jugadora.posiciones_ids?.[0];
        let colocadoEnCampo = false;

        if (posicionPrincipal) {
            colocadoEnCampo = ponerJugadoraEnField(jugadora, posicionPrincipal);
        }

        // Si no cabía en el campo (o no tiene posición válida), va a Suplentes
        if (!colocadoEnCampo) {
            const cardJugadora = crearFichaBaseJugadora(jugadora, color, false);
            fragmentSuplentes.appendChild(cardJugadora);
        }
    });

    if (suplentesContainer) {
        suplentesContainer.appendChild(fragmentSuplentes);
    }
}

function displayJugadorasHistoricas(id, jugadoras, color) {
    const container = document.getElementById(id);
    container.innerHTML = ''; // Limpiamos antes de mostrar nuevas jugadoras
    if (!container || !jugadoras || jugadoras.length === 0) return;

    const jugadorasAgrupadas = agruparJugadorasPorTrayectoria(jugadoras);

    // Ordenar por fecha de inicio histórico
    /*jugadorasAgrupadas.sort((a, b) => {
        const fechaA = a.trayectoria?.inicio ? new Date(a.trayectoria.inicio) : new Date(0);
        const fechaB = b.trayectoria?.inicio ? new Date(b.trayectoria.inicio) : new Date(0);
        return fechaA - fechaB;
    });*/

    const fragment = document.createDocumentFragment();

    jugadorasAgrupadas.forEach((jugadora, index) => {
        // Usamos la MISMA función base COMÚN, activando las etapas históricas
        const cardJugadora = crearFichaBaseJugadora(jugadora, color, true);
        fragment.appendChild(cardJugadora);

        setTimeout(() => {
            cardJugadora.classList.add('visible');
        }, index * 100);
    });

    container.appendChild(fragment);
}

export function filtrarJugadorasPorTemporada(temporada) {
    if (!temporada) return jugadorasHistoricas.success || [];

    console.log(jugadorasHistoricas);

    const jugadorasFiltradas = jugadorasHistoricas.success?.filter(j => {
        const inicio = j.trayectoria?.inicio || '';
        const fin = j.trayectoria?.fin || '';
        return (inicio <= temporada && (fin === 'act' || fin >= temporada));
    }) || [];

    // Ordenar de menor a mayor (Ascendente: 1, 2, 3...)
    jugadorasFiltradas.sort((a, b) => {
        // Extraemos la posición principal de cada una, o un valor infinito si no tienen
        const posA = (a.posiciones_ids && a.posiciones_ids.length > 0) ? Number(a.posiciones_ids[0]) : Infinity;
        const posB = (b.posiciones_ids && b.posiciones_ids.length > 0) ? Number(b.posiciones_ids[0]) : Infinity;

        return posA - posB;
    });

    if (jugadorasFiltradas.length === 0) {
        console.warn(`No se encontraron jugadoras para la temporada ${temporada}`);
    }else{
        console.log(jugadorasFiltradas)
        historicasPlaceholder.style.display = 'none';
        jugadorasContainer.style.display = 'grid';
        displayJugadorasHistoricas('jugadoras-container', jugadorasFiltradas, jugadorasHistoricas.success?.[0]?.equipo?.color || 'var(--color-primario)');
    }
    return jugadorasFiltradas;
}

// funcion slider de temporadas
export function setupSliderTemporadas() {
    const container = document.getElementById('temporadas-container');
    const btnPrev = document.getElementById('prev-temporada');
    const btnNext = document.getElementById('next-temporada');

    btnPrev.addEventListener('click', () => {
        container.scrollBy({ left: -200, behavior: 'smooth' });
    });

    btnNext.addEventListener('click', () => {
        container.scrollBy({ left: 200, behavior: 'smooth' });
    });

}

function crearBotonesTemporada(anyo_fundacion, color) {
        const mainContainer = document.getElementById('historicas');
        const containerTemporadas = document.getElementById('temporadas-container');

        // Limpiamos el contenedor por si acaso se vuelve a ejecutar la función
        if (containerTemporadas) containerTemporadas.innerHTML = '';

        if (anyo_fundacion) {
            const currentYear = new Date().getFullYear(); // En 2026 generará hasta la 2026-2027

            for (let year = anyo_fundacion; year <= currentYear; year++) {
                const button = document.createElement('button');
                button.style.background =
                `radial-gradient(
                    farthest-corner at left bottom,
                    color-mix(in srgb, var(--color-secundario) 80%, black) 0%,
                    ${color} 100%
                )`;
                button.textContent = year + '-' + (year + 1);
                button.classList.add('temporada-button', 'season-badge'); // Añadimos tus clases de diseño estético
                
                button.addEventListener('click', () => {
                    // 👉 LA MAGIA: Buscamos si ya había algún botón activo en el contenedor y le quitamos la clase
                    const botonActivoAnterior = containerTemporadas.querySelector('.activo');
                    if (botonActivoAnterior) {
                        botonActivoAnterior.classList.remove('activo');
                    }

                    // Ahora hacemos que el botón actual pase a ser el único activo
                    button.classList.add('activo');
                    
                    // Tu lógica para cargar y mostrar los datos de las jugadoras
                    const jugadorasFiltradas = filtrarJugadorasPorTemporada(button.textContent);
                });
                
                containerTemporadas.appendChild(button);
            }
        } else {
            const mensaje = document.createElement('p');
            mensaje.textContent = '{% trans "No hay información de fundación disponible para este equipo." %}';
            containerTemporadas.appendChild(mensaje);
        }
}


function calcularValorMercadoTotal(jugadoras) {
    if (!jugadoras || jugadoras.length === 0) return 0;

    return formatearValorMercado((jugadoras).reduce((total, jugadora) => {
        const valor = jugadora.market_value ? parseFloat(jugadora.market_value) : 0;
        return total + valor;
    }, 0));
}

