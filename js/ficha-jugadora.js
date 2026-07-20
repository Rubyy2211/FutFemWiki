import {calcularEdad, fetchJugadoraTrayectoriaById, fetchJugadoraPalmaresById, cargarJugadoraDatos, fetchJugadoraCompanyerasById} from '/static/futfem/js/jugadora.js'; 
import {fetchEquipoById} from '/static/futfem/js/equipos.js';    

let trayectorias, palmares, jugadora, companyeras;
// Variable global o superior para guardar las compañeras
let todasLasCompanyeras = [];
const edad = document.getElementById('edad');
const mostrador = document.getElementById('mostrador-tarjetas');
const pais = document.getElementById('pais');
const posicion = document.getElementById('posicion');
const info = document.getElementById('jugadora-info');
const palmaresIndiv = document.getElementById('palmares-individual');
const contenedorPais = document.getElementById('pais');

export async function cargarFichaJugadora(id_jugadora) {
    [jugadora, trayectorias] = await Promise.all([
        cargarJugadoraDatos(id_jugadora),
        fetchJugadoraTrayectoriaById(id_jugadora)
    ]);   
    // 2. Cargamos lo secundario sin bloquear el primer render
    const companyeras = fetchJugadoraCompanyerasById(id_jugadora, 1000);
    document.getElementById('nombre-jugadora').textContent = jugadora.nombre_completo;
    palmares = await fetchJugadoraPalmaresById(id_jugadora, trayectorias);

    // Variables globales (o pasadas por parámetro) para usar en cargarTrayectorias
    window.trayectorias = trayectorias;
    window.palmares = palmares;
    window.companyeras = companyeras;

    //edad.textContent = jugadora.Nacimiento + '(' + calcularEdad(jugadora.Nacimiento) + ')';

    jugadora.Posiciones.forEach(pos => {
        const abrev = pos.abreviatura || pos.nombre.substring(0, 3).toUpperCase();
        const span = document.createElement('span');
        span.textContent = gettext(abrev);
        span.classList.add('pos-'+pos.abreviatura);
        posicion.appendChild(span);
    });
    // 1. Limpiamos el contenido previo (por si cambias de jugadora)
    contenedorPais.innerHTML = ''; 
    // 2. Comprobamos que existan nacionalidades
    if (jugadora.pais_iso && jugadora.pais_iso.length > 0) {
        
        jugadora.pais_iso.forEach((iso, index) => {
            const bandera = document.createElement('span');
            
            // Añadimos las clases de la librería
            bandera.classList.add('fi', `fi-${iso.toLowerCase()}`);
            
            // Estilos para diferenciar principal de secundarias
            bandera.style.marginRight = '6px';
            bandera.style.display = 'inline-block';
            
            if (index > 0) {
                // Nacionalidades secundarias: apagadas
                bandera.style.opacity = '0.4';
                bandera.style.transform = 'scale(0.85)';
                bandera.style.filter = 'saturate(0.6)';
            } else {
                // Nacionalidad principal: destacada
                bandera.style.opacity = '1';
                bandera.style.transform = 'scale(1.1)';
                bandera.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
            }

            // Añadimos la bandera al contenedor principal
            contenedorPais.appendChild(bandera);
        });
    }
    if (!palmares.individual) {palmares.individual = [];}
    /*palmaresIndiv.innerHTML = `
        ${
            palmares.individual.length
            ? palmares.individual.map(t => `
                <img src="/${t.icono}" title="${t.nombre}">
            `).join('')
            : `<p class="sin-trofeos">Sin trofeos individuales</p>`
        }
    `;*/
    window.todasLasCompanyeras = await companyeras;
    await cargarTrayectorias(jugadora, trayectorias, palmares);
    console.log(palmares)

    // 3. INICIALIZAR SWIPER (Fuera del bucle)
    new Swiper(".mySwiper", {
        effect: "coverflow",
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: "auto",
        coverflowEffect: {
            rotate: 0,
            stretch: 0,
            depth: 200,
            modifier: 1,
            slideShadows: false, // Desactivar si tus tarjetas ya tienen sombras
        },
        spaceBetween: 30,
        loop: false,
        pagination: {
            el: ".swiper-pagination",
            clickable: true
        },
        on: {
            init: function () {
                // Al cargar por primera vez, pillamos el equipo del primer slide
                const initialId = this.slides[this.activeIndex].getAttribute('data-equipo-id');
                displayPalmares(palmares, this.activeIndex);
            },
            slideChange: function () {
                // Al cambiar, pillamos el ID del slide que ha quedado activo
                const activeId = this.slides[this.activeIndex].getAttribute('data-equipo-id');
                displayPalmares(palmares, this.activeIndex);
            }
        }
    });

}

// Asegúrate de tener Swiper importado o cargado en el HTML
async function cargarTrayectorias(jugadora, trayectorias, palmaresPromise) {
    const mostrador = document.getElementById('mostrador-tarjetas');
    const filtros = document.getElementById('filtros-equipo');
    const fragment = document.createDocumentFragment();
    const escudoEquipo = document.getElementById('escudo-equipo');
    escudoEquipo.src = '/' + (trayectorias[trayectorias.length - 1]?.escudo || '/static/img/predeterm.png') ;
    escudoEquipo.alt = trayectorias[trayectorias.length - 1]?.equipo?.nombre || '';
    escudoEquipo.title = trayectorias[trayectorias.length - 1]?.equipo?.nombre || '';
    mostrador.innerHTML = ''; // Limpiar

    // Nota: Aunque no use el palmarés en el "back", mantengo el await 
    // por si tu código lo requiere para no romper flujos asíncronos externos.
    await palmaresPromise; 

    trayectorias.forEach((trayectoria, index) => {

        const botonEquipo = document.createElement('button');
        botonEquipo.innerHTML = `<img src="/${trayectoria.escudo}">`
        botonEquipo.dataset.id = trayectoria.equipo;
        filtros.appendChild(botonEquipo);

        botonEquipo.addEventListener('click', async function() {
            await cargarCompanyeras(botonEquipo.dataset.id);
        });
        
        // 1. Extraer colores con los mismos fallbacks
        const colorPrimario = trayectoria.color || trayectoria.equipo?.color || 'var(--color-primario)';
        const colorSecundario = trayectoria.colorSecundario || trayectoria.equipo?.colorSecundario || 'transparent';

        // 2. Aplicar el diseño de color-mix al elemento 'info'
        if (typeof info !== 'undefined') {
            info.style.background = `
                linear-gradient(
                    to bottom,
                    color-mix(in srgb, ${colorPrimario} 30%, transparent),
                    color-mix(in srgb, ${colorSecundario} 30%, transparent)
                )
            `;
            info.style.border = `1px solid ${colorPrimario}`;
        }

        // 3. Crear el Slide de Swiper
        const swiperSlide = document.createElement('div');
        swiperSlide.classList.add('swiper-slide');

        const equipoId = trayectoria.equipo.id || trayectoria.equipo;
        swiperSlide.setAttribute('data-equipo-id', equipoId);

        // 4. Crear únicamente la Tarjeta (Directa al slide, sin wrappers de flip)
        const front = document.createElement('div');
        front.classList.add('tarjeta-front', 'glass', 'tarjeta-jugadora');
        
        const backgroundGradient = `
            linear-gradient(
                to bottom,
                color-mix(in srgb, ${colorPrimario} 30%, transparent),
                color-mix(in srgb, ${colorSecundario} 30%, transparent)
            )
        `;
        
        front.style.background = backgroundGradient;
        front.style.border = `1px solid ${colorPrimario}`;

        // 5. Lógica de contenido
        const imgSrc = trayectoria.imagen?.trim() ? `/${trayectoria.imagen}` : jugadora.imagen?.trim() ? `/${jugadora.imagen}` : "/static/img/predeterm.jpg";
        const iso = jugadora.pais_iso && jugadora.pais_iso.length > 0 ? jugadora.pais_iso[0] : 'xx';
        const anyos = trayectoria.fecha_inicio ? (trayectoria.fecha_inicio.substring(0, 4) + (trayectoria.fecha_fin ? ' - ' + trayectoria.fecha_fin.substring(0, 4) : ' - Act.')) : '';

        front.innerHTML = `
            <img class="imagen-jugadora" src="${imgSrc}" alt="${jugadora.nombre_completo} - ${trayectoria.equipo.nombre}" width="300" height="400" style="width: 100%; height: auto; object-fit: cover;" fetchpriority="high" loading="eager">
            <p class="nombre">${jugadora.nombre_completo}</p>
            <div class="detalles">
                <div class="equipo-pais">
                    <p>${gettext(jugadora.Posiciones[0].abreviatura)}</p>
                    <img src="/${trayectoria.escudo}" alt="${trayectoria.equipo.nombre}" title="${trayectoria.equipo.nombre}">
                    <span class="fi fi-${iso}" style="font-size: large;"></span>
                </div>
            </div>
        `;

        if (trayectoria.club === 83) {
            if (typeof info !== 'undefined' && info.querySelector('img')) {
                info.querySelector('img').classList.add('vintage');
            }
            front.querySelector('.imagen-jugadora').classList.add('vintage');
        }

        // 6. Estilos dinámicos para nombre
        const nombre = front.querySelector('.nombre');
        if (nombre) {
            nombre.style.background = colorPrimario; 
        }

        // 7. Ensamblaje simplificado: La tarjeta va directo al swiperSlide
        swiperSlide.appendChild(front);
        swiperSlide.appendChild(anyos ? (() => {
            const anyosDiv = document.createElement('div');
            anyosDiv.classList.add('anyos');
            anyosDiv.textContent = anyos;
            return anyosDiv;
        })() : document.createElement('div')); // Añadimos un div vacío si no hay años
        fragment.appendChild(swiperSlide);
    });
    
    mostrador.appendChild(fragment);
}

async function cargarCompanyeras(equipoId) {
    const contenedor = document.getElementById('container-companyeras');
    contenedor.innerHTML = '';
    // Validación de seguridad: si aún no hay datos, no ejecutamos el filtro
    if (!window.todasLasCompanyeras || !Array.isArray(window.todasLasCompanyeras)) {
        console.warn("Las compañeras aún no se han cargado.");
        return;
    }
    // Filtrar las compañeras que coincidan con el equipo del slide activo
    // Asegúrate de comparar el ID como número o string según tu BD
    const filtradas = window.todasLasCompanyeras.filter(c => String(c.equipo) === String(equipoId));
    let contadorCompanyeras = 1;
    filtradas.forEach(compañera => {
        contadorCompanyeras += 1;
        const slugNombre = (compañera.Nombre_Completo || compañera.nombre).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''); // Limpiamos caracteres especiales para el slug
        const card = document.createElement('div');
        card.classList.add('companyera-card', 'glass');
        const imgSrc = compañera.imagen?.trim()
    ? `/${compañera.imagen.replace(/^\/+/, "")}`
    : "/static/img/predeterm.png";

        console.log(`Cargando compañera: ${compañera.Nombre_Completo} con imagen ${imgSrc}`);
        card.innerHTML = `
            <img src="${imgSrc}" alt="${compañera.Nombre_Completo}" width="100" height="130" style="width: 100%; height: auto; object-fit: cover;" loading="lazy">
            <p>${compañera.Nombre_Completo}</p>
        `;
        card.style.borderColor = compañera.color || '#ccc';
        card.style.background = `linear-gradient(to bottom, 
        color-mix(in srgb, ${compañera.color} 30%, transparent), 
        color-mix(in srgb, ${compañera.color} 50%, transparent))`;
        // Evento click para redirigir a la ficha de la compañera
        card.addEventListener('click', () => {
            window.location.href = `/jugadora/${compañera.id_jug_comp}/${slugNombre}/`;
        });
        contenedor.appendChild(card);
    });
    // Si no hay compañeras, crear tarjeta de "Sin compañeras"
    if (filtradas.length === 0) {
        const card = document.createElement('div');
        card.classList.add('companyera-card', 'glass', 'sin-companyeras');
        card.innerHTML = `
            <p>Sin compañeras en este equipo</p>
        `;
        contenedor.appendChild(card);
    }

    contenedor.style.setProperty('--elementos', contadorCompanyeras)
}

function displayPalmares(palmares, equipoId) {
    const contenedor = document.getElementById('palmares-container');
    contenedor.innerHTML = ''; // Limpiar contenido previo
    // Filtrar palmarés por equipo
    const palmaresEquipo = palmares.equipo[equipoId] || [];
    if (palmaresEquipo.length === 0) {
        contenedor.innerHTML = `<p class="sin-palmares">Sin palmarés en este equipo</p>`;
        return;
    }
    // Agrupar trofeos por ID y juntar temporadas
    const palmaresAgrupado = agruparTrofeos(palmaresEquipo);
    palmaresAgrupado.forEach(trofeo => {
        const card = document.createElement('div');
        card.classList.add('trofeo-card');
        console.log(trofeo)
        // El nombre del trofeo como tooltip y el número de veces ganado
        const tooltip = `${trofeo.nombre}` + (trofeo.temporadas && trofeo.temporadas.length > 0 ? `\n(${trofeo.temporadas.join(', ')})` : '');        card.setAttribute('title', tooltip);
        
        card.innerHTML = `
            <img src="/${trofeo.icono}" alt="${trofeo.nombre}" title="${tooltip}" width="50" height="50" style="width: 50px; height: 50px; object-fit: contain;" loading="lazy">
            <p>${trofeo.count}</p>
        `;
        card.style.borderColor = trofeo.color || '#ccc';
        card.style.background = `linear-gradient(to bottom, 
        color-mix(in srgb, ${trofeo.color} 30%, transparent), 
        color-mix(in srgb, ${trofeo.color} 50%, transparent))`;
        contenedor.appendChild(card);
    });
    console.log(palmares.equipo[equipoId], equipoId);

}

// Agrupar trofeos por ID y juntar temporadas
function agruparTrofeos(trofeos) {
    const agrupado = {};
    
    trofeos.forEach(t => {
        if (!agrupado[t.id]) {
            // 1. Clonamos el trofeo e inicializamos el contador y el array de temporadas
            agrupado[t.id] = { 
                ...t, 
                count: 0, 
                temporadas: [] // Creamos el saco para guardar los años
            };
        }
        
        // 2. Incrementamos las veces ganado
        agrupado[t.id].count += 1;
        
        // 3. Si el trofeo trae una temporada y no la hemos metido ya, la añadimos
        if (t.temporada && !agrupado[t.id].temporadas.includes(t.temporada)) {
            agrupado[t.id].temporadas.push(t.temporada);
        }
    });
    
    return Object.values(agrupado);
}