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
    /*document.getElementById('formacion').textContent = equipo.formacion.nombre;*/
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
    document.getElementById('btn-estadio').href = `https://earth.google.com/web/search/${equipo.lat},${equipo.long}`;

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
    
    // ❌ Slider comentado / eliminado
    // renderSlider('#left', palmaresAgrupado);

    // Seleccionamos el contenedor (ajusta el ID según tu HTML, por ejemplo 'divPalmares')
    const divPalmares = document.getElementById('divPalmares');
    if (!divPalmares) return;

    // Limpiamos el contenedor antes de pintar para evitar duplicados si se recarga
    divPalmares.innerHTML = '';

    palmaresAgrupado.forEach(trofeo => {
        const div = document.createElement("div");
        div.classList.add("trofeo");
        div.dataset.trofeoName = trofeo.nombre;
        
        div.innerHTML = `
            <img src="${trofeo.icono}" alt="${trofeo.nombre}" loading="lazy" style="width: 60px; height: 60px; object-fit: contain;">
            <p class="trofeo-pc">${trofeo.count}</p>
            <p class="trofeo-movil">${trofeo.count}</p>
        `;
        
        // tooltip
        div.title = `${trofeo.nombre} (${trofeo.competicion.nombre}) - ${trofeo.count} veces`;

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

    const masAlta = [...jugadoras].reduce((prev, curr) => {
        const altCurr = Number(curr.altura || curr.height || 0);
        const altPrev = Number(prev.altura || prev.height || 0);
        return (altCurr > altPrev) ? curr : prev;
    });

    return { masCara, masJoven, masMayor, masAlta };
}

// ==========================================
// 3. COMPONENTES DEL DOM (CONSTRUCTORES)
// ==========================================

function crearCardDestacada(jugadora, etiqueta) {
    const cardContainer = document.createElement('div');
    const nombreCompleto = jugadora.nombre_completo || 'Desconocida';
    const slugNombre = (jugadora.nombre_completo || jugadora.nombre).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    
    // Contenedor principal
    cardContainer.className = 'destacada-card-container';
    Object.assign(cardContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: '1'
    });
    
    // 1. 🏷️ ETIQUETA (Fuera de la card, arriba)
    const badge = document.createElement('span');
    badge.className = 'badge-destacada';
    badge.textContent = etiqueta;
    badge.style.textWrap = 'nowrap';
    badge.style.fontSize = '0.8em';

    // 2. 🃏 CARD CENTRAL (Contiene imagen y nombre)
    const card = document.createElement('div');
    card.style.setProperty('--equipo-color', jugadora.equipo.color);
    card.className = 'jugadora-item destacada-card visible'; 

    card.style.background = `radial-gradient(
        farthest-corner at left bottom,
        color-mix(in srgb, var(--color-secundario) 80%, black) 0%,
        ${jugadora.equipo.color} 100%
    )`;

    const img = document.createElement('img');
    img.src = jugadora.imagen ? jugadora.imagen : '/img/predeterm.png';
    img.className = 'jugadora-imagen';
    img.loading = 'lazy';
    img.alt = jugadora.nombre_completo || jugadora.apodo || jugadora.nombre;

    const divNombre = document.createElement('div');
    divNombre.className = 'jugadora-nombre-container';
    const pNombre = document.createElement('p');
    const pApellido = document.createElement('p');
    pNombre.className = 'jugadora-nombre';
    pNombre.textContent = nombreCompleto.split(' ')[0] || ''; 
    pApellido.className = 'jugadora-apellido';
    pApellido.textContent = nombreCompleto.split(' ').slice(1).join(' ') || '';
    divNombre.appendChild(pNombre);
    divNombre.appendChild(pApellido);

    // Añadimos imagen y nombre a la card
    card.appendChild(img);
    card.appendChild(divNombre);

    // 3. 📊 VALOR / INFO (Fuera de la card, abajo)
    const info = document.createElement('div');
    info.className = 'info-destacada';
    
    let datoExtra = 'N/A';
    if (etiqueta === 'MÁS CARA') {
        datoExtra = formatearValorMercado(jugadora.market_value) || 'N/A';
    } else if (etiqueta === 'MÁS JOVEN' || etiqueta === 'MÁS MAYOR') {
        datoExtra = calcularEdad(jugadora.nacimiento) + ' años';
    } else if (etiqueta === 'MÁS ALTA') {
        const alturaVal = jugadora.altura || jugadora.height;
        if (alturaVal) {
            datoExtra = alturaVal < 3 ? `${alturaVal} m` : `${alturaVal} cm`;
        } else {
            datoExtra = 'N/A';
        }
    }

    info.innerHTML = `<p>${datoExtra}</p>`;

    // Ensamblar ordenadamente en el contenedor principal
    cardContainer.appendChild(badge);
    cardContainer.appendChild(card);
    cardContainer.appendChild(info);
    
    // Evento de clic en la tarjeta
    card.onclick = () => window.location.href = `jugadora_ficha.html?id=${jugadora.id_jugadora}&slug=${slugNombre}`;
    
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
    const divNombre = document.createElement('div');
    divNombre.className = 'jugadora-nombre-container';
    div1_2.appendChild(divNombre);
    const pNombre = document.createElement('p');
    const pApellido = document.createElement('p');
    pNombre.className = 'jugadora-nombre';
    pNombre.textContent = nombreCompleto.split(' ')[0] || ''; 
    pApellido.className = 'jugadora-apellido';
    pApellido.textContent = nombreCompleto.split(' ').slice(1).join(' ') || '';
    divNombre.appendChild(pNombre);
    divNombre.appendChild(pApellido);

    divNombre.style.background = jugadora.equipo?.color || colorPredeterminado;
    pNombre.style.background = 'none';

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

        console.log('Escudo del club:', imgClub.src);
        if(imgClub.src.includes('retirada')) {
            imgClub.src = '/img/retirada.svg';
        }
    }

    // Posiciones
    const pPosicion = document.createElement('div');
    pPosicion.className = 'jugadora-posicion';

    const span = document.createElement('span');
    span.textContent = typeof gettext === 'function' ? gettext(jugadora.posiciones_abrev[0]) : jugadora.posiciones_abrev[0];
    if (jugadora.posiciones_ids) {
        span.id = jugadora.posiciones_ids[jugadora.posiciones_abrev.indexOf(jugadora.posiciones_abrev[0])];
    }
    span.className = 'pos-' + jugadora.posiciones_abrev[0];
    divBanderas.appendChild(span);

    divBanderaYPosicion.appendChild(divBanderas);
    divBanderaYPosicion.appendChild(pPosicion);
    div1_2.appendChild(divBanderaYPosicion);
    div1.appendChild(div1_2);
    div.appendChild(div1);

    // Estilos de Fondo por defecto
    const colorPrimario = jugadora.equipo?.color || colorPredeterminado || 'var(--color-primario)';
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
    div.style.position = 'relative';
    div.style.overflow = 'hidden';

    // 🟢 CAPA OVERLAY PARA HOVER (GSAP)
    const divHover = document.createElement('div');
    divHover.className = 'jugadora-hover-overlay';
    divHover.style.cssText = `
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: ${colorPrimario};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px;
        box-sizing: border-box;
        border-radius: inherit;
        z-index: 10;
        pointer-events: none;
    `;

    // 1. Escudo centrado para el hover
    if (jugadora.equipo?.escudo) {
        const imgClubHover = document.createElement('img');
        imgClubHover.src = jugadora.equipo.escudo;
        imgClubHover.alt = jugadora.equipo?.nombre || '';
        imgClubHover.style.cssText = 'width: 48px; height: 48px; object-fit: contain;';
        if(imgClubHover.src.includes('retirada')) {
            imgClubHover.src = '/img/retirada.svg';
        }
        divHover.appendChild(imgClubHover);
    }

    // 2. Nombre y apellidos centrados para el hover
    const divNombreHover = divNombre.cloneNode(true);
    divNombreHover.style.background = 'transparent';
    divNombreHover.style.textAlign = 'center';
    divHover.appendChild(divNombreHover);

    // Ocultar overlay por defecto con GSAP
    gsap.set(divHover, { autoAlpha: 0, scale: 0.9 });
    div.appendChild(divHover);

    // 🟢 EVENTOS HOVER CON GSAP (Corregido para movimientos rápidos)
    div.addEventListener('mouseenter', () => {
        gsap.killTweensOf(divHover); // Mata cualquier animación previa en curso
        gsap.to(divHover, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.25,
            ease: 'power2.out'
        });
    });

    div.addEventListener('mouseleave', () => {
        gsap.killTweensOf(divHover); // Mata cualquier animación previa en curso
        gsap.to(divHover, {
            autoAlpha: 0,
            scale: 0.9,
            duration: 0.2,
            ease: 'power2.in'
        });
    });

    // Click Redirección
    div.addEventListener('click', () => {
        window.location.href = `jugadora_ficha.html?id=${jugadora.id_jugadora}&slug=${slugNombre}`;
    });

    wrapper.appendChild(div);

    // Si es del histórico, inyectamos el bloque de etapas abajo
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
    // Ordenar por jugadoras.posiciones_ids[0] para que aparezcan en orden de posición
    jugadoras.sort((a, b) => {
        const posA = a.posiciones_ids?.[0] || 999; // Si no tiene posición, lo ponemos al final
        const posB = b.posiciones_ids?.[0] || 999;
        return posA - posB;
    });
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = ''; // Limpiamos antes de mostrar nuevas jugadoras
    if (!jugadoras || jugadoras.length === 0) return;

    // Opcional: Mantener el contenedor de destacadas si lo usas arriba
    const destacadosContainer = document.getElementById('jugadoras-destacadas-container');
    if (destacadosContainer) {
        destacadosContainer.innerHTML = '';
        const { masCara, masJoven, masMayor, masAlta } = obtenerJugadorasDestacadas(jugadoras);
        destacadosContainer.appendChild(crearCardDestacada(masCara, 'MÁS CARA'));
        destacadosContainer.appendChild(crearCardDestacada(masJoven, 'MÁS JOVEN'));
        destacadosContainer.appendChild(crearCardDestacada(masMayor, 'MÁS MAYOR'));
        destacadosContainer.appendChild(crearCardDestacada(masAlta, 'MÁS ALTA'));
    }

    /* --- COMENTADO/ELIMINADO: Lógica del campo de fútbol y suplentes ---
    await esperarGridTactico();
    limpiarCampoYSuplentes();

    // Ordenar por IDs de posición
    jugadoras.sort((a, b) => {
        const idA = a.posiciones_ids?.[0] || 999;
        const idB = b.posiciones_ids?.[0] || 999;
        return idA - idB;
    });

    const suplentesContainer = document.getElementById('suplentes');
    const fragmentSuplentes = document.createDocumentFragment();

    jugadoras.forEach(jugadora => {
        const posicionPrincipal = jugadora.posiciones_ids?.[0];
        let colocadoEnCampo = false;

        if (posicionPrincipal) {
            colocadoEnCampo = ponerJugadoraEnField(jugadora, posicionPrincipal);
        }

        if (!colocadoEnCampo) {
            const cardJugadora = crearFichaBaseJugadora(jugadora, color, false);
            fragmentSuplentes.appendChild(cardJugadora);
        }
    });

    if (suplentesContainer) {
        suplentesContainer.appendChild(fragmentSuplentes);
    }
    ------------------------------------------------------------------- */

    // --- NUEVO: Renderizado lineal idéntico al de históricas ---
    const fragment = document.createDocumentFragment();

    jugadoras.forEach((jugadora, index) => {
        // Usamos la misma función base, pasando false (porque no son históricas)
        const cardJugadora = crearFichaBaseJugadora(jugadora, color, false);
        fragment.appendChild(cardJugadora);

        // Añadimos la clase .visible con retraso escalonado igual que en las históricas
        setTimeout(() => {
            cardJugadora.classList.add('visible');
        }, index * 100);
    });

    container.appendChild(fragment);
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

// Función para inicializar listeners de navegación y del select
export function setupSliderTemporadas() {
    const container = document.getElementById('temporadas-container');
    const btnPrev = document.getElementById('prev-temporada');
    const btnNext = document.getElementById('next-temporada');
    const selectMobile = document.getElementById('select-temporadas');

    if (btnPrev && container) {
        btnPrev.addEventListener('click', () => {
            container.scrollBy({ left: -200, behavior: 'smooth' });
        });
    }

    if (btnNext && container) {
        btnNext.addEventListener('click', () => {
            container.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }

    // Listener para cuando se cambia de temporada desde el selector de MÓVIL
    if (selectMobile) {
        selectMobile.addEventListener('change', (e) => {
            const temporadaSeleccionada = e.target.value;

            // Sincronizamos la clase '.activo' en los botones de escritorio
            if (container) {
                const botones = container.querySelectorAll('.temporada-button');
                botones.forEach(btn => {
                    btn.classList.toggle('activo', btn.textContent === temporadaSeleccionada);
                });
            }

            // Ejecutamos tu función de filtrado
            filtrarJugadorasPorTemporada(temporadaSeleccionada);
        });
    }
}

function crearBotonesTemporada(anyo_fundacion, color) {
    const containerTemporadas = document.getElementById('temporadas-container');
    const selectTemporadas = document.getElementById('select-temporadas');

    // Limpiamos ambos contenedores
    if (containerTemporadas) containerTemporadas.innerHTML = '';
    if (selectTemporadas) selectTemporadas.innerHTML = '';

    if (anyo_fundacion) {
        const currentYear = new Date().getFullYear();

        for (let year = anyo_fundacion; year <= currentYear; year++) {
            const seasonText = `${year}-${year + 1}`;

            // --- 1. Crear Botón para Desktop ---
            const button = document.createElement('button');
            button.style.background = `radial-gradient(
                farthest-corner at left bottom,
                color-mix(in srgb, var(--color-secundario) 80%, black) 0%,
                ${color} 100%
            )`;
            button.textContent = seasonText;
            button.classList.add('temporada-button', 'season-badge');

            button.addEventListener('click', () => {
                // Quitar 'activo' del botón previo
                const botonActivoAnterior = containerTemporadas.querySelector('.activo');
                if (botonActivoAnterior) {
                    botonActivoAnterior.classList.remove('activo');
                }
                button.classList.add('activo');

                // Sincronizar el select de móvil
                if (selectTemporadas) {
                    selectTemporadas.value = seasonText;
                }

                // Filtrar jugadoras
                filtrarJugadorasPorTemporada(seasonText);
            });

            if (containerTemporadas) containerTemporadas.appendChild(button);

            // --- 2. Crear Option para Móvil ---
            if (selectTemporadas) {
                const option = document.createElement('option');
                option.value = seasonText;
                option.textContent = seasonText;
                selectTemporadas.appendChild(option);
            }
        }
    } else {
        if (containerTemporadas) {
            const mensaje = document.createElement('p');
            mensaje.textContent = 'No hay información de fundación disponible para este equipo.';
            containerTemporadas.appendChild(mensaje);
        }
        if (selectTemporadas) {
            const option = document.createElement('option');
            option.textContent = 'Sin datos de fundación';
            selectTemporadas.appendChild(option);
        }
    }
}


function calcularValorMercadoTotal(jugadoras) {
    if (!jugadoras || jugadoras.length === 0) return 0;

    return formatearValorMercado((jugadoras).reduce((total, jugadora) => {
        const valor = jugadora.market_value ? parseFloat(jugadora.market_value) : 0;
        return total + valor;
    }, 0));
}

