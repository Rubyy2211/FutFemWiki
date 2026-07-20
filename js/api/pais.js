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

            // Evitar duplicados
            const idsMostrados = new Set();

            results.forEach(nation => {
                const { pais, nombre, iso } = nation;
                if (!idsMostrados.has(pais)) { // Verificar que no se haya mostrado este ID
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
                        // 1. Crear el "Chip" (el elemento visual que verá el usuario)
                        const chip = document.createElement('div');
                        chip.classList.add('input-chip');
                        chip.innerHTML = `
                            <span class="fi fi-${iso} fis"></span>
                            <span class="chip-text">${nombre}</span>
                            <span class="chip-cancel">&times;</span>
                        `;

                        // 2. Insertar el Chip y ocultar el input
                        input.insertAdjacentElement('beforebegin', chip);
                        input.style.display = 'none'; // Ocultamos el input real
                        input.value = nombre; // Guardamos el nombre por si el form se envía
                        input.setAttribute('data-id', pais);
                        
                        suggestionsList.innerHTML = ''; // Limpiar sugerencias

                        // 3. Lógica para el botón 'X' (Cancelar)
                        chip.querySelector('.chip-cancel').addEventListener('click', () => {
                            chip.remove(); // Quitamos el chip
                            input.style.display = 'block'; // Mostramos el input
                            input.value = ''; // Limpiamos el texto
                            input.setAttribute('data-id', null);
                            input.focus();
                            
                            // 🚀 AVISAMOS AL CALLBACK QUE SE QUITÓ EL FILTRO (Enviando null)
                            if (onSelectCallback && typeof onSelectCallback === 'function') {
                                onSelectCallback(null);
                            }
                        });

                        // 🚀 EJECUTAMOS EL CALLBACK AL SELECCIONAR CON ÉXITO
                        if (onSelectCallback && typeof onSelectCallback === 'function') {
                            onSelectCallback(pais); 
                        }
                    });

                    suggestionsList.appendChild(listItem);
                }
            });
        } catch (error) {
            console.error('Error al buscar la jugadora:', error);
        }
    } else {
        input.setAttribute('data-id', null); // Limpiar el ID si se borra el texto de búsqueda
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