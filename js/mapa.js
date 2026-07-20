export let map = null;
let markersGroup = [];
let bloqueado = false;

export function inicializarMapaEquipos() {
    if (map) {
        markersGroup.forEach(m => m.marker.remove());
        markersGroup = []; 
        return map;
    };

    map = new maplibregl.Map({
        container: 'mapa-equipos',
        style: '/static/FutFemWiki/mapstyles/style-morado.json', // luego lo cambiamos por tu estilo
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

    map.on("zoomend", () => {
        generarHeatmap();
    });

    map.on("zoom", () => {
        const zoom = map.getZoom();

        markersGroup.forEach(m => {
            const el = m.el;

            // 2. Tamaño según zoom
            /*const scale = Math.min(1.3, Math.max(0.5, zoom / 7));
            el.style.transform = `scale(${scale})`;*/

            // 3. Punto vs escudo
            const escudo = m.el.querySelector('.marker-escudo-img');
            const punto = m.el.querySelector('.marker-punto');

            if (zoom < 10) {
                escudo.style.display = "none";
                punto.style.display = "block";
            } else {
                escudo.style.display = "block";
                punto.style.display = "none";
            }
        });
    });

    map.on("load", () => {
        // buscar capa de labels para poner los edificios debajo
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find(
            l => l.type === "symbol" && l.layout?.["text-field"]
        )?.id;
        /*map.addSource("terrain-dem", {
            type: "raster-dem",
            url: "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=LYmhz1BKy6QniXWrxK2S",
            tileSize: 256
        });*/

        /*map.setTerrain({
            source: "terrain-dem",
            exaggeration: 1.2   // puedes subirlo a 2 o 3 si quieres más relieve
        });*/



        map.addSource("satellite", {
            type: "raster",
            tiles: [
                "https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=LYmhz1BKy6QniXWrxK2S"
            ],
            tileSize: 256,
            attribution: "© MapTiler © OpenStreetMap contributors"
        });

        /*map.addLayer({
            id: "satellite-layer",
            type: "raster",
            source: "satellite",
            layout: {
                visibility: "none"   // empieza oculta
            }
        });

        map.moveLayer("satellite-layer");*/

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

        /*map.addLayer({
            id: "sky",
            type: "sky",
            paint: {
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0.0, 0.0],
                "sky-atmosphere-sun-intensity": 15
            }
        });*/

        map.setLight({
            anchor: "viewport",
            color: "#ffffff",
            intensity: 0.6,
            position: [1.5, 180, 80] // azimut, polar
        });

    });
    //const { capaControl } = import("../mapstyles/capaControl.js");

    //map.addControl(new CapaControl(), "top-right");
    return map;
}


export function añadirEquipoMapa(id, nombre, lat, lng, escudoUrl, color) {

    lat = parseFloat(lat);
    lng = parseFloat(lng);

    if (lat == null || lng == null) {
        console.log(`Equipo sin coordenadas: ${nombre}`);
        return;
    }

    const fotoUrl = escudoUrl.replace('/clubes/', '/clubes/mini/');

    const el = document.createElement('div');
    el.className = 'marker-escudo';
    el.innerHTML = `
        <div class="marker-wrapper" id="marker-${id}">
            <!--<div class="marker-pin"></div>-->
            <div class="marker-punto"></div>
            <img src="${fotoUrl}" class="marker-escudo-img" />
        </div>
    `;

    const img = el.querySelector('img');
    const punto = el.querySelector('.marker-punto');
    punto.style.background = color;

    img.style.background = `
            linear-gradient(
                to bottom,
                color-mix(in srgb, ${color} 30%, transparent),
                color-mix(in srgb, transparent 30%, transparent)
            )
        `;
        

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

    //setTimeout(() => evitarColision(el, marker), 50);
}

export function actualizarMarkersZoom() {
    const zoom = map.getZoom();

    markersGroup.forEach(m => {

        const escudo = m.el.querySelector('.marker-escudo-img');
        const punto = m.el.querySelector('.marker-punto');

        const scale = Math.min(1.3, Math.max(0.5, zoom / 7));
        m.el.style.transform = `scale(${scale})`;

        if (zoom < 10) {
            escudo.style.display = "none";
            punto.style.display = "block";
        } else {
            escudo.style.display = "block";
            punto.style.display = "none";
        }

    });
    map.easeTo({
        zoom: zoom + 0.1,
        duration: 600
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

    const velocidad = 0.005; // cuanto menor, más suave
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
        // cuando abres tooltip
        rotando = true;
        orbitar();
        document
          .getElementById('ver-equipo')
          .addEventListener('click', () => {
              window.location.href = `/equipo/${id}/${slugNombre}/`;
          });
    });

    popup.on('close', () => {
        orbitando = false;
    });

    popup.on('close', () => {
        // cuando lo cierras
        rotando = false;
    })
}


function iconoEscudoBonito(url) {
    return L.divIcon({
        className: "marker-escudo",
        html: `
            <div class="marker-wrapper">
                <div class="marker-pin"></div>
                <img src="${url}" class="marker-escudo-img" />
            </div>
        `,
        iconSize: [50, 70],
        iconAnchor: [25, 70],
        popupAnchor: [0, -70]
    });
}

export function centrarMapaEnEquipos() {
    if (!map || markersGroup.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    markersGroup.forEach(m => bounds.extend([m.lng, m.lat]));

    const center = bounds.getCenter();

    map.easeTo({
        center,
        zoom: Math.min(8, map.getZoom()), // ajusta si quieres
        pitch: 45,
        bearing: 20,
        duration: 1200,
        easing: t => t * (2 - t) // easeOut
    });
}



function evitarColision(el, marker, intentos = 0) {
    if (intentos > 20) return; // evitar bucles infinitos

    const rect1 = el.getBoundingClientRect();

    for (const m of markersGroup) {
        if (!m.el || m.el === el) continue;

        const rect2 = m.el.getBoundingClientRect();

        const overlap = !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );

        if (overlap) {
            // mover ligeramente el marcador
            const offsetLng = (Math.random() - 0.5) * 0.05;
            const offsetLat = (Math.random() - 0.5) * 0.05;

            const pos = marker.getLngLat();
            marker.setLngLat([pos.lng + offsetLng, pos.lat + offsetLat]);

            // volver a comprobar
            setTimeout(() => evitarColision(el, marker, intentos + 1), 10);
            return;
        }
    }
}

function generarHeatmap() {
    if (!map || markersGroup.length === 0) return;

    const equiposGeoJSON = {
        type: "FeatureCollection",
        features: markersGroup.map(m => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [m.lng, m.lat]
            }
        }))
    };

    // Si ya existe, actualizar
    if (map.getSource("equipos")) {
        map.getSource("equipos").setData(equiposGeoJSON);
        return;
    }

    // Crear fuente
    map.addSource("equipos", {
        type: "geojson",
        data: equiposGeoJSON
    });

    // Crear capa heatmap
    map.addLayer({
        id: "equipos-heatmap",
        type: "heatmap",
        source: "equipos",
        paint: {
            "heatmap-radius": 45,
            "heatmap-intensity": 1.4,
            "heatmap-opacity": 0.55,
            "heatmap-weight": 1,
            "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(0,0,0,0)",
                0.2, "rgba(120,0,120,0.4)",
                0.4, "rgba(172,0,172,0.7)",
                0.7, "rgba(255,0,255,0.9)",
                1, "rgba(255,255,255,1)"
            ]
        }
    }, "water"); // lo ponemos debajo de los escudos
}

