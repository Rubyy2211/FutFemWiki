export function crearAlineacion(formacion) {
    const pitch = document.querySelector('.football-pitch');
    const esquemas = {
        // --- LÍNEA DE 4 ---
        "4-4-2":        ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mi', 'slot-mc1', 'slot-mc3', 'slot-md', 'slot-dc1', 'slot-dc3'],
        "4-3-3":        ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mc1', 'slot-mc2', 'slot-mc3', 'slot-ei', 'slot-dc2', 'slot-ed'],
        "4-3-3(2)":     ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mcd2', 'slot-mc1', 'slot-mc3', 'slot-ei', 'slot-dc2', 'slot-ed'], // 1 MCD Central
        "4-2-3-1":      ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mcd1', 'slot-mcd2', 'slot-ei', 'slot-mco', 'slot-ed', 'slot-dc2'], // 2 MCDs
        "4-1-2-1-2":    ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mcd2', 'slot-mc1', 'slot-mc3', 'slot-mco', 'slot-dc1', 'slot-dc3'], // 1 MCD Central
        "4-1-4-1":      ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mcd2', 'slot-mi', 'slot-mc1', 'slot-mc3', 'slot-md', 'slot-dc2'], // 1 MCD Central
        "4-5-1":        ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mi', 'slot-mc1', 'slot-mc2', 'slot-mc3', 'slot-md', 'slot-dc2'],
        "4-2-2-2":      ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc3', 'slot-ld', 'slot-mcd1', 'slot-mcd2', 'slot-ei', 'slot-ed', 'slot-dc1', 'slot-dc3'],

        // --- LÍNEA DE 3 ---
        "3-5-2":        ['slot-por', 'slot-dfc1', 'slot-dfc2', 'slot-dfc3', 'slot-mi', 'slot-mc1', 'slot-mc2', 'slot-mc3', 'slot-md', 'slot-dc1', 'slot-dc3'],
        "3-4-3":        ['slot-por', 'slot-dfc1', 'slot-dfc2', 'slot-dfc3', 'slot-mi', 'slot-mc1', 'slot-mc3', 'slot-md', 'slot-ei', 'slot-dc2', 'slot-ed'],

        // --- LÍNEA DE 5 ---
        "5-3-2":        ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc2', 'slot-dfc3', 'slot-ld', 'slot-mc1', 'slot-mc2', 'slot-mc3', 'slot-dc1', 'slot-dc3'],
        "5-4-1":        ['slot-por', 'slot-li', 'slot-dfc1', 'slot-dfc2', 'slot-dfc3', 'slot-ld', 'slot-mi', 'slot-mc1', 'slot-mc3', 'slot-md', 'slot-dc2']
    };

    const slotsActivos = esquemas[formacion] || esquemas["4-4-2"];

    if (pitch) {
        // Limpiamos clases modificadoras tácticas anteriores
        pitch.classList.remove('defensa-4', 'mcd-2', 'dc-2');

        // 🟢 Detectar si es línea de 4 (si NO tiene el central slot-dfc2)
        if (!slotsActivos.includes('slot-dfc2')) {
            pitch.classList.add('defensa-4');
        }

        // 🟢 Detectar si hay 2 MCDs
        if (slotsActivos.includes('slot-mcd1') && slotsActivos.includes('slot-mcd2')) {
            pitch.classList.add('mcd-2');
        }

        // 🟢 Detectar si hay 2 Delanteras (sin DC central)
        if (slotsActivos.includes('slot-dc1') && slotsActivos.includes('slot-dc3') && !slotsActivos.includes('slot-dc2')) {
            pitch.classList.add('dc-2');
        }
    }

    // Ocultar todos los slots
    document.querySelectorAll('#campo .pos-slot').forEach(slot => {
        slot.style.display = 'none';
        slot.style.width = 0;
    });

    // Mostrar solo los slots pertenecientes al esquema actual
    slotsActivos.forEach(claseSlot => {
        const slot = document.querySelector(`#campo .${claseSlot}`);
        if (slot) {
            slot.style.display = 'flex';
            slot.style.width = '100%';
        }
    });
}

/**
 * Inserta el elemento HTML de la jugadora en un slot libre del campo
 */
export function ponerJugadoraEnField(jugadora, posicionId) {
    // Buscar todos los slots que coincidan con la ID de posición
    const slots = document.querySelectorAll(`#campo .pos-slot[data-pos="${posicionId}"]`);

    let slotLibre = null;
    for (const slot of slots) {
        // 🎯 Comprobamos que el slot esté VISIBLE en la formación actual y que esté libre
        if (slot.style.display !== 'none' && !slot.querySelector('.jugadora')) {
            slotLibre = slot;
            break;
        }
    }

    // 1. Crear el elemento visual de la jugadora (común para campo y suplentes)
    const divJugadora = document.createElement('div');
    divJugadora.className = 'jugadora';
    divJugadora.dataset.id = jugadora.id;

    const img = document.createElement('img');
    img.src = jugadora.foto || jugadora.imagen || '/img/predeterm.png';
    img.alt = jugadora.apodo || 'jugadora-silueta';

    const spanPais = document.createElement('span');
    const iso = (jugadora.nacionalidades_isos && jugadora.nacionalidades_isos[0]) 
        ? jugadora.nacionalidades_isos[0].toLowerCase() 
        : '';
    
    spanPais.classList.add('nacionalidad', 'fi');
    if (iso) spanPais.classList.add(`fi-${iso}`);

    const divText = document.createElement('div');
    divText.className = 'jugadora-text';

    const spanPos = document.createElement('span');
    spanPos.textContent = (jugadora.posiciones_abrev && jugadora.posiciones_abrev[0]) 
        ? jugadora.posiciones_abrev[0] 
        : 'SUP';

    const pNombre = document.createElement('p');
    pNombre.textContent = jugadora.apodo || jugadora.nombre || 'Jugadora';

    divText.appendChild(spanPos);
    divText.appendChild(pNombre);

    divJugadora.appendChild(img);
    divJugadora.appendChild(spanPais);
    divJugadora.appendChild(divText);

    divJugadora.addEventListener('click', () => {
        window.location.href = `jugadora_ficha.html?id=${jugadora.id_jugadora}`;;
    });

    // 2. Insertar según la disponibilidad en el campo
    if (slotLibre) {
        // ⚽ Hay un slot libre en el campo
        slotLibre.innerHTML = '';
        slotLibre.appendChild(divJugadora);
        return { colocado: true, tipo: 'titular' };
    } else {
        // 🪑 La posición está ocupada -> Añadir a #suplentes
        const contenedorSuplentes = document.getElementById('suplentes');
        
        if (contenedorSuplentes) {
            // Le añadimos opcionalmente una clase para estilos específicos de banca
            divJugadora.classList.add('jugadora-suplente'); 
            contenedorSuplentes.appendChild(divJugadora);
            return { colocado: true, tipo: 'suplente' };
        } else {
            console.warn("No se encontró el contenedor #suplentes en el DOM.");
            return { colocado: false, tipo: 'error' };
        }
    }
}

/**
 * Limpia las jugadoras previas de las posiciones del campo y de la banca
 */
export function limpiarCampoYSuplentes() {
    const slots = document.querySelectorAll('#campo .pos-slot');
    slots.forEach(slot => {
        // Restaurar el slot si tenía jugadora
        if (slot.querySelector('.jugadora')) {
            slot.innerHTML = '';
        }
    });

    const suplentesContainer = document.getElementById('suplentes');
    if (suplentesContainer) {
        suplentesContainer.innerHTML = '';
    }
}