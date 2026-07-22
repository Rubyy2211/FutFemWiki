
/**
 * Obtiene los colores dominantes de una imagen
 * @param {HTMLImageElement|string} image - img element o URL
 * @param {number} count - nº de colores (2–5 recomendado)
 * @returns {Promise<Array<[number,number,number]>>}
 */
function getDominantColors(image, count = 3) {
    const colorThief = new ColorThief();
    return new Promise((resolve, reject) => {
        let img;

        if (typeof image === 'string') {
            img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = image;
        } else {
            img = image;
        }

        if (!img) return reject('Imagen inválida');

        const process = () => {
            try {
                const palette = colorThief.getPalette(img, count);
                resolve(palette);
            } catch (err) {
                reject(err);
            }
        };

        if (img.complete) {
            process();
        } else {
            img.onload = process;
            img.onerror = reject;
        }
    });
}

function rgbToRgba(rgb, alpha = 1) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}


export { getDominantColors , rgbToRgba };