export let map = null;
let markersGroup = [];
let bloqueado = false;
let orbitando = false;
let lastTime = null;

export function inicializarMapaEquipos(centerInicial = [7, 40], zoomInicial = 6) {
    if (map) {
        markersGroup.forEach(m => m.marker.remove());
        markersGroup = [];
        setTimeout(() => map.resize(), 100);
        return map;
    }

    map = new maplibregl.Map({
        container: 'mapa-equipos',
        style: './js/mapstyles/style-morado.json',
        projection: 'globe',
        center: centerInicial,
        zoom: zoomInicial,
        minZoom: 6,
        antialias: true,
        attributionControl: false // 👈 Desactiva la barra de atribución
    });

    map.addControl(new maplibregl.NavigationControl());

    map.on("movestart", () => { bloqueado = true; });
    map.on("moveend", () => { bloqueado = false; });
    map.on("zoom", actualizarMarkersZoom);

    map.on("load", () => {
        map.setLight({
            anchor: "viewport",
            color: "#ffffff",
            intensity: 0.5,
            position: [1.5, 180, 80]
        });
    });

    return map;
}

export function añadirEquipoMapa(id, nombre, lat, lng, escudoUrl, color) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.warn(`Equipo omitido por coordenadas inválidas: ${nombre}`);
        return;
    }

    const fotoUrl = escudoUrl ? escudoUrl.replace('/clubes/', '/clubes/mini/') : '';

    const el = document.createElement('div');
    el.style.setProperty('--equipo-color', color)
    el.className = 'marker-escudo';
    el.dataset.id = id; 

    el.innerHTML = `
        <div class="marker-wrapper" id="marker-${id}">
            <div class="marker-punto"></div>
            <img src="${fotoUrl}" class="marker-escudo-img" />
        </div>
    `;

    const img = el.querySelector('.marker-escudo-img');
    const punto = el.querySelector('.marker-punto');
    
    if (punto) punto.style.background = color || '#c000ff';

    if (img && color) {
        img.style.background = `
            linear-gradient(
                to bottom,
                color-mix(in srgb, ${color} 30%, transparent),
                color-mix(in srgb, transparent 30%, transparent)
            )
        `;
    }

    el.addEventListener('click', () => {
        const target = [lng, lat];

        map.easeTo({
            center: target,
            zoom: 15,
            pitch: 70,
            bearing: map.getBearing() + 120,
            duration: 1500,
            easing: t => t * t
        });
        
        orbitando = true;
        mostrarTooltipEquipo(id, nombre, target);
        requestAnimationFrame(rotarSuave);
    });

    const tarjetaActivaDOM = document.querySelector(`.equipo-item[data-id="${id}"].selected`);
    let esElSeleccionadoDeInicio = false;

    if (tarjetaActivaDOM) {
        el.classList.add('selected');
        esElSeleccionadoDeInicio = true;
    }

    // 🎯 CAMBIO AQUÍ: Añadimos { anchor: 'center' } para fijar el centro exacto
    const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center'
    })
    .setLngLat([lng, lat])
    .addTo(map);

    markersGroup.push({
        id,
        marker,
        el,
        lng,
        lat,
        isSelected: esElSeleccionadoDeInicio
    });

    actualizarMarkersZoom();
}

// CORREGIDA Y UNIFICADA
// FORZAR el escudo visible SIEMPRE para el activo
export function actualizarMarkersZoom() {
    if (!map) return;
    const zoom = map.getZoom();

    markersGroup.forEach(m => {
        const wrapper = m.el.querySelector('.marker-wrapper');
        const escudo = m.el.querySelector('.marker-escudo-img');
        const punto = m.el.querySelector('.marker-punto');

        // Escalar tamaño de marcadores según zoom
        if (wrapper) {
            const scale = Math.min(1.3, Math.max(0.5, zoom / 7));
            wrapper.style.transform = `scale(${scale})`;
        }

        // Comprobamos si es el seleccionado
        const esSeleccionado = m.el.classList.contains('selected') || m.isSelected;
        console.log(esSeleccionado)

        if (esSeleccionado) {
            // 🎯 FORZAR VISIBILIDAD TOTAL SIN IMPORTAR EL ZOOM
            if (escudo) escudo.style.setProperty('display', 'block', 'important');
            //if (punto) punto.style.setProperty('display', 'none', 'important');
        } else {
            // Los no seleccionados siguen la regla normal de zoom
            if (zoom >= 10) {
                if (escudo) escudo.style.display = 'block';
                //if (punto) punto.style.display = 'none';
            } else {
                if (escudo) escudo.style.display = 'none';
                if (punto) punto.style.display = 'block';
            }
        }
    });
}

// Vincula la tarjeta seleccionada con el marcador del mapa
export function marcarEquipoSeleccionadoPorId(idSeleccionado) {
    if (!idSeleccionado) return;

    // Recorremos el array global markersGroup que definiste en mapa.js
    markersGroup.forEach(m => {
        // Imprimimos el log para verificar
        console.log("Comparando marcador ID:", m.id, "con seleccionado ID:", idSeleccionado);

        // Convertimos a String para evitar fallos si uno es number y el otro string
        if (String(m.id) === String(idSeleccionado)) {
            m.el.classList.add('selected');
            m.isSelected = true;
        } else {
            m.el.classList.remove('selected');
            m.isSelected = false;
        }
    });

    // Repintamos la visibilidad
    actualizarMarkersZoom();
    centrarEnEquipoActivo(true);
}

function rotarSuave(time) {
    if (!orbitando) {
        lastTime = null;
        return;
    }

    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;

    const velocidad = 0.005;
    map.rotateTo(
        map.getBearing() + delta * velocidad,
        { duration: 0 }
    );

    requestAnimationFrame(rotarSuave);
}

function mostrarTooltipEquipo(id, nombre, lngLat) {
    const slugNombre = nombre.toLowerCase().replace(/\s+/g, '-');
    const popup = new maplibregl.Popup({
        closeButton: true,
        offset: 25
    })
    .setLngLat(lngLat)
    .setHTML(`
        <div class="map-tooltip">
            <h4>${nombre}</h4>
            <button id="ver-equipo">Ver equipo</button>
        </div>
    `)
    .addTo(map);

    popup.on('open', () => {
        orbitando = true;
        const btnVerEquipo = document.getElementById('ver-equipo');
        if (btnVerEquipo) {
            btnVerEquipo.addEventListener('click', () => {
                window.location.href = `/equipo/${id}/${slugNombre}/`;
            });
        }
    });

    popup.on('close', () => {
        orbitando = false;
    });
}

export function centrarMapaEnEquipos(animado = false) {
    if (!map || markersGroup.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    markersGroup.forEach(m => {
        bounds.extend([m.lng, m.lat]);
    });

    // fitBounds posiciona la cámara instantáneamente si duration es 0
    map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        maxZoom: 5,
        zoom: 5,
        duration: animado ? 1200 : 0 // 🎯 Si es false, se mueve en 0ms (sin desplazamiento)
    });
}

export function centrarEnEquipoActivo(animado = false) {
    if (!map) return;

    // 1. Buscar el marcador activo
    let activo = markersGroup.find(m => m.isSelected || m.el.classList.contains('selected'));

    // 2. Fallback por si no se encuentra directamente
    if (!activo) {
        const tarjetaActiva = document.querySelector('.equipo-item.selected');
        if (tarjetaActiva && tarjetaActiva.dataset.id) {
            const id = tarjetaActiva.dataset.id;
            activo = markersGroup.find(m => String(m.id) === String(id));
        }
    }

    // 3. Mover la cámara SOLO cambiando las coordenadas (0 cambio de zoom)
    if (activo) {
        map.panTo([activo.lng, activo.lat], {
            duration: animado ? 1000 : 0
        });
    }
}