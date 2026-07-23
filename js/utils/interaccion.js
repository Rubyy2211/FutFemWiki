export function activarGrabAndScroll(container) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    container.addEventListener('mousedown', (e) => {
        isDown = true;
        // Reiniciamos el estado en cada mousedown
        container.dataset.isDragging = 'false';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
        isDown = false;
    });

    container.addEventListener('mouseup', () => {
        isDown = false;
        // Dejamos un pequeño margen para que el evento 'click' del ítem lea la marca antes de resetear
        setTimeout(() => {
            container.dataset.isDragging = 'false';
        }, 50);
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;

        const x = e.pageX - container.offsetLeft;
        const walk = x - startX;

        // 🎯 UMBRAL: Si el usuario mueve el ratón más de 5px, se considera ARRASTRE y no clic
        if (Math.abs(walk) > 5) {
            container.dataset.isDragging = 'true';
            container.scrollLeft = scrollLeft - walk;
        }
    });
}