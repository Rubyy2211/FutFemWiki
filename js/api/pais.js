import { API_BASE_URL } from '../config.js';

export async function handleAutocompletePais(event, id, onSelectCallback = null) {
    const input = event.target;
    const texto = input.value.trim();
    const suggestionsList = document.getElementById(id);

    // Limpiar sugerencias previas
    suggestionsList.innerHTML = '';

    if (texto.length > 2) { // Solo si hay más de 2 caracteres
        const url = `${API_BASE_URL}/api/paisxnombre?nombre=${encodeURIComponent(texto)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const results = await response.json();

            // Evitar duplicados en las sugerencias desplegadas
            const idsMostrados = new Set();

            results.forEach(nation => {
                const { pais, nombre, iso } = nation;
                if (!idsMostrados.has(pais)) {
                    idsMostrados.add(pais);

                    const listItem = document.createElement('li');
                    listItem.classList.add('suggestion-item');

                    listItem.innerHTML = `
                        <span class="fi fi-${iso} fis"></span>
                        <div class="jugadora-info">
                            <strong>${nombre}</strong>
                        </div>
                    `;

                    listItem.addEventListener('click', () => {
                        // 1. Limpiar lista de sugerencias e input para poder buscar otro
                        suggestionsList.innerHTML = '';
                        input.value = '';
                        input.focus();

                        // 2. Notificar al callback enviando el objeto completo
                        if (onSelectCallback && typeof onSelectCallback === 'function') {
                            onSelectCallback({
                                id: pais,
                                nombre: nombre,
                                iso: iso
                            }); 
                        }
                    });

                    suggestionsList.appendChild(listItem);
                }
            });
        } catch (error) {
            console.error('Error al buscar país:', error);
        }
    }
}

export async function fetchPaisesById(ids){
    // Generar la URL para obtener las banderas con IDs como parámetros de consulta
    const response = await fetch(`${API_BASE_URL}/api/paisesxid?id[]=${ids.join('&id[]=')}`)
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

export async function obtenerPaisesConLigas() {
    // 1. Intentamos recuperar los países almacenados en el LocalStorage
    const cache = localStorage.getItem('paises_con_ligas');
    
    if (cache) {
        // Si ya existen, los parseamos y los devolvemos al instante (0ms)
        console.log("Cargando países con ligas desde la caché local...");
        return JSON.parse(cache);
    }

    // 2. Si no hay caché, vamos al servidor (Solo ocurre una vez)
    try {
        console.log("Caché vacía. Solicitando países al servidor...");
        const response = await fetch(`${API_BASE_URL}/api/paisesconligas`); // La URL de tu nueva función Python
        if (!response.ok) throw new Error('Error al traer países');
        
        const data = await response.json();
        
        // 3. Guardamos el resultado en LocalStorage para la próxima vez
        localStorage.setItem('paises_con_ligas', JSON.stringify(data));
        
        return data;
    } catch (error) {
        console.error('Hubo un problema con la solicitud de países:', error);
        return [];
    }
}