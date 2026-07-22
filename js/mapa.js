export let map = null;
let markersGroup = [];
let bloqueado = false;

export function inicializarMapaEquipos() {
    if (map) {
        markersGroup.forEach(m => m.marker.remove());
        markersGroup = [];
        // Forzar recálculo por si el contenedor cambió de tamaño
        setTimeout(() => map.resize(), 100);
        return map;
    }

    map = new maplibregl.Map({
        container: 'mapa-equipos',
        style: '/js/mapstyles/style-morado.json',
        projection: 'globe',
        center: [7, 40],
        zoom: 5,
        minZoom: 4.5,
        antialias: true
    });

    map.addControl(new maplibregl.NavigationControl());

    map.on("movestart", () => {
        bloqueado = true;
    });

    map.on("moveend", () => {
        bloqueado = false;
    });

    // Controlar la visibilidad (Punto vs Escudo) al hacer zoom
    map.on("zoom", () => {
        const zoom = map.getZoom();

        markersGroup.forEach(m => {
            const escudo = m.el.querySelector('.marker-escudo-img');
            const punto = m.el.querySelector('.marker-punto');

            if (escudo && punto) {
                if (zoom < 10) {
                    escudo.style.display = "none";
                    punto.style.display = "block";
                } else {
                    escudo.style.display = "block";
                    punto.style.display = "none";
                }
            }
        });
    });

    map.on("load", () => {
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
            l => l.type === "symbol" && l.layout?.["text-field"]
        )?.id;

        map.addSource("satellite", {
            type: "raster",
            tiles: [
                "https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=LYmhz1BKy6QniXWrxK2S"
            ],
            tileSize: 256,
            attribution: "© MapTiler © OpenStreetMap contributors"
        });

        map.addLayer({
            id: "3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
                "fill-extrusion-color": "#c000ff",
                "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    13, ["get", "render_height"],
                    16, ["*", ["get", "render_height"], 0.6]
                ],
                "fill-extrusion-base": ["get", "render_min_height"],
                "fill-extrusion-opacity": 0.85
            }
        }, labelLayerId);

        map.setLight({
            anchor: "viewport",
            color: "#ffffff",
            intensity: 0.6,
            position: [1.5, 180, 80]
        });
    });

    return map;
}

export function añadirEquipoMapa(id, nombre, lat, lng, escudoUrl, color) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.warn(`Equipo omitido en el mapa por coordenadas inválidas: ${nombre} (lat: ${lat}, lng: ${lng})`);
        return;
    }

    const fotoUrl = escudoUrl ? escudoUrl.replace('/clubes/', '/clubes/mini/') : '';

    const el = document.createElement('div');
    el.className = 'marker-escudo';
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

    // Inicializar visibilidad según el zoom actual
    const currentZoom = map ? map.getZoom() : 5;
    if (currentZoom < 10) {
        if (img) img.style.display = "none";
        if (punto) punto.style.display = "block";
    } else {
        if (img) img.style.display = "block";
        if (punto) punto.style.display = "none";
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

    // Crear marcador MapLibre
    const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

    // Guardar el marcador completo
    markersGroup.push({
        marker,
        el,
        lng,
        lat
    });
}

// CORREGIDA: Ajusta la escala dentro del contenedor interno para NO interferir con las coordenadas de MapLibre
export function actualizarMarkersZoom() {
    if (!map) return;
    const zoom = map.getZoom();

    markersGroup.forEach(m => {
        const wrapper = m.el.querySelector('.marker-wrapper');
        const escudo = m.el.querySelector('.marker-escudo-img');
        const punto = m.el.querySelector('.marker-punto');

        // Escalar solo el contenido interno, no el contenedor principal del marcador
        if (wrapper) {
            const scale = Math.min(1.3, Math.max(0.5, zoom / 7));
            wrapper.style.transform = `scale(${scale})`;
        }

        if (zoom < 10) {
            if (escudo) escudo.style.display = "none";
            if (punto) punto.style.display = "block";
        } else {
            if (escudo) escudo.style.display = "block";
            if (punto) punto.style.display = "none";
        }
    });
}

let orbitando = false;
let lastTime = null;

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

export function centrarMapaEnEquipos() {
    if (!map || markersGroup.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    markersGroup.forEach(m => bounds.extend([m.lng, m.lat]));

    const center = bounds.getCenter();

    map.easeTo({
        center,
        zoom: Math.min(8, map.getZoom()),
        pitch: 45,
        bearing: 20,
        duration: 1200,
        easing: t => t * (2 - t)
    });
}