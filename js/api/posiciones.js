import { API_BASE_URL } from '../config.js';

export async function handleAutocompletePosicion(event) {
    const input = event.target;
    const texto = input.value.trim();
    const suggestionsList = document.getElementById("sugerencias-posicion");

    // Limpiar sugerencias previas
    suggestionsList.innerHTML = '';

    if (texto.length > 2) { // Solo si hay más de 2 caracteres
        const url = `${API_BASE_URL}/api/posicionxnombre?nombre=${encodeURIComponent(texto)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const results = await response.json();

            // Evitar duplicados
            const idsMostrados = new Set();

            results.forEach(posicion => {
                const { id_posicion, abreviatura, nombre } = posicion;

                if (!idsMostrados.has(id_posicion)) { // Verificar que no se haya mostrado este ID
                    idsMostrados.add(id_posicion);

                    const listItem = document.createElement('li');
                    listItem.classList.add('suggestion-item');
                    
                    listItem.innerHTML = `
                        <span class="pos-${abreviatura.toUpperCase()}">
                            ${gettext(abreviatura.toUpperCase())}
                        </span>
                        <div class="jugadora-info">
                            <strong>${nombre}</strong>
                        </div>
                    `;
                    console.log(listItem.innerHTML);
                    listItem.addEventListener('click', () => {
                        // 1. Crear el "Chip" (el elemento visual que verá el usuario)
                        const chip = document.createElement('div');
                        chip.classList.add('input-chip');
                        chip.innerHTML = `
                            <span class="pos-${abreviatura.toUpperCase()}">
                            ${gettext(abreviatura.toUpperCase())}
                            </span>
                            <!--<div class="jugadora-info">
                                <strong>${nombre}</strong>
                            </div>-->
                            <span class="chip-cancel">&times;</span>
                        `;
                        // 2. Insertar el Chip y ocultar el input
                        input.insertAdjacentElement('beforebegin', chip);
                        input.style.display = 'none'; // Ocultamos el input real
                        input.value = nombre; // Guardamos el nombre por si el form se envía
                        input.setAttribute('data-id', id_posicion);
                        suggestionsList.innerHTML = '';  // Limpiar las sugerencias
                        
                        // 3. Lógica para el botón 'X' (Cancelar)
                        chip.querySelector('.chip-cancel').addEventListener('click', () => {
                            chip.remove(); // Quitamos el chip
                            input.style.display = 'block'; // Mostramos el input
                            input.value = ''; // Limpiamos el texto
                            input.setAttribute('data-id', null);
                            input.focus();
                            //if (funcion) funcion(null); // Avisar que se canceló
                        });
                    });

                    suggestionsList.appendChild(listItem);
                }
            });
        } catch (error) {
            console.error('Error al buscar la posicion:', error);
        }
    }
}