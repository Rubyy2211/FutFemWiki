import { API_BASE_URL } from '../config.js';

export async function equiposxliga(ligaId) {
    return fetch(`${API_BASE_URL}/api/equiposxliga?liga=${ligaId}`)
        .then(response => response.json())
        .then(data => data)
        .catch(error => {
            console.error('Error fetching equipos by liga:', error);
            throw error;
        });
}

export async function fetchAllEquipos() {
    return fetch(`${API_BASE_URL}/api/equiposall`)
        .then(response => response.json())
        .then(data => data)
        .catch(error => {
            console.error('Error fetching all equipos:', error);
            throw error;
        }
    );
}


export async function jugadorasxTemporadaYEquipo(equipo, temporada) {
    return fetch(`${API_BASE_URL}/api/jugadorasxequipo_temporada?equipo=${equipo}&temporada=${temporada}`)
        .then(response => response.json())
        .then(data => data)
        .catch(error => {
            console.error('Error fetching jugadoras actuales by equipo:', error);
            throw error;
        });
}

export async function fetchEquipoById(id){
    return fetch(`${API_BASE_URL}/api/equipoxid?id=${id}`)
    .then(response => response.json())
        .then(data => data.success)
        .catch(error => {
            console.error('Error fetching jugadoras actuales by equipo:', error);
            throw error;
        });
}

export async function fetchEquiposById(ids) {
    // Generar la URL para obtener las banderas con IDs como parámetros de consulta
    const response = await fetch(`${API_BASE_URL}/api/equiposxid?id[]=${ids.join('&id[]=')}`)
    if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.statusText}`);
    }
    const data = await response.json();
    if (data !== null) {
        return data.success;
    } else {
        return null;
    }
}

export async function handleAutocompleteEquipo(event, id, onSelectCallback = null) {
    const input = event.target;
    const texto = input.value.trim();
    const suggestionsList = document.getElementById(id);

    // Limpiar sugerencias previas
    suggestionsList.innerHTML = '';

    if (texto.length > 2) { // Solo si hay más de 2 caracteres
        const url = `${API_BASE_URL}/api/equipoxnombre?nombre=${encodeURIComponent(texto)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const results = await response.json();

            results.forEach(equipo => {
                const { id_equipo, nombre, escudo, color } = equipo;
                const listItem = document.createElement('li');
                listItem.classList.add('suggestion-item');

                listItem.innerHTML = `
                        <img src="${escudo}" alt="${nombre}" class="equipo-img">
                        <div class="equipo-info">
                            <strong>${nombre}</strong>
                        </div>
                    `;

                listItem.addEventListener('click', () => {
                    // Insertar el nombre del equipo en el input al hacer clic
                    input.value = nombre;
                    input.setAttribute('data-id', id_equipo); // Guardar el ID del equipo
                    suggestionsList.innerHTML = '';  // Limpiar las sugerencias

                    // 🚀 SOLO AQUÍ EJECUTAMOS EL CALLBACK (Al seleccionar con éxito)
                    // Comprobamos que pasaron el parámetro y que es una función real
                    if (onSelectCallback && typeof onSelectCallback === 'function') {
                        onSelectCallback(equipo); // Le pasamos todo el objeto por si necesitas usar su ID, color, etc.
                    }
                });

                suggestionsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error al buscar el equipo:', error);
        }
    } else {
        // Al borrar o vaciar el buscador, limpiamos el atributo sin lanzar errores
        input.setAttribute('data-id', null); 
    }
}

export async function fetchMultiplesEquiposPalmares(listaEquipos, listaTemporadas) {
    // SEGURO ANTI-ERRORES: Si viene un solo dato (ej: 7 o "2024-act"), lo envolvemos en un Array automáticamente
    const arrEquipos = Array.isArray(listaEquipos) ? listaEquipos : [listaEquipos];
    const arrTemporadas = Array.isArray(listaTemporadas) ? listaTemporadas : [listaTemporadas];

    // Ahora sí podemos usar .join() con total seguridad, sea un equipo o sean veinte
    const equiposParam = arrEquipos.join(',');
    const temporadasParam = arrTemporadas.join(',');

    console.log(`Fetching masivo para equipos: [${equiposParam}] y temporadas: [${temporadasParam}]`);
    try {
        const url = `${API_BASE_URL}/api/equipo_palmares?equipos=${encodeURIComponent(equiposParam)}&temporadas=${encodeURIComponent(temporadasParam)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error en fetch masivo: ${response.statusText}`);
        
        return await response.json(); // Devolverá un array con los palmarés ordenados
    } catch (error) {
        console.error('Error en fetch masivo:', error);
        throw error;
    }
}