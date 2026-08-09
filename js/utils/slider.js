import { getDominantColors, rgbToRgba } from './color-thief.js';

export function renderSlider(container, items = []) {
  const target = typeof container === 'string' 
    ? document.querySelector(container) 
    : container;

  if (!target) {
    console.error('El contenedor especificado no existe.');
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.warn('No se proporcionaron datos para el slider.');
    return;
  }

  const totalSlides = items.length;

  // 1. Generar el HTML de las diapositivas
  const boxesHTML = items.map((item, index) => {
  const titulo = item.nombre || item.titulo || `Slide ${index + 1}`;
  const cantidad = item.count !== undefined ? `${item.count} Títulos` : '';
  const iconoImg = item.icono
    ? `<img src="${item.icono}" alt="${titulo}" style="width: 100px; height: 100px; object-fit: contain;">` 
    : '<div class="inner"></div>';

  return `
      <div class="box" data-index="${index}" style="flex: 0 0 ${100 / totalSlides}%;">
        <div class="bg"></div>
        <img src="${item.competicion?.logo || ''}" alt="Logo" class="bg-icon" crossorigin="anonymous" />
        <div class="details">
          <h1>${titulo}</h1>
          <p>${cantidad ? `<strong>${cantidad}</strong>` : ''}</p>
          <button>Ver detalle</button>
        </div>
        <div class="illustration">
          ${iconoImg}
        </div>
      </div>
    `;
  }).join('');

  // 2. Generar indicadores (Trail)
  const trailHTML = items.map((_, index) => `
    <div class="${index === 0 ? 'active' : ''}">${index + 1}</div>
  `).join('');

  // 3. Montar la estructura base
  target.innerHTML = `
  <div class="container"> 
    <div class="slider" style="width: ${totalSlides * 110}%;">
      ${boxesHTML}
    </div>

    <svg xmlns="http://www.w3.org/2000/svg" class="prev" width="56.898" height="91" viewBox="0 0 56.898 91">
      <path d="M45.5,0,91,56.9,48.452,24.068,0,56.9Z" transform="translate(0 91) rotate(-90)" fill="#fff"/>
    </svg>

    <svg xmlns="http://www.w3.org/2000/svg" class="next" width="56.898" height="91" viewBox="0 0 56.898 91">
      <path d="M45.5,0,91,56.9,48.452,24.068,0,56.9Z" transform="translate(56.898) rotate(90)" fill="#fff"/>
    </svg>

    <div class="trail" style="grid-template-columns: repeat(${totalSlides}, 1fr);">
      ${trailHTML}
    </div>
  </div>
`;

  // 4. Extraer colores e inyectar variables CSS
  const boxes = target.querySelectorAll('.slider .box');
  boxes.forEach((boxEl) => {
    const img = boxEl.querySelector('.bg-icon');
    if (!img || !img.src) return;

    const aplicarColores = async () => {
      try {
        const colors = await getDominantColors(img, 3);
        if (!colors || colors.length === 0) return;

        colors.sort((a, b) => {
          const brightnessA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
          const brightnessB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
          return brightnessA - brightnessB;
        });

        const darkColor = `rgb(${colors[0].join(',')})`;
        const accentColor = `rgb(${colors[colors.length - 1].join(',')})`;
        const mediumColor = `rgb(${colors[Math.floor(colors.length / 2)].join(',')})`;
        const rgbaAccent = rgbToRgba(colors[colors.length - 1], 0.4);

        boxEl.style.setProperty('--bg-dark', darkColor);
        boxEl.style.setProperty('--bg-medium', mediumColor);
        boxEl.style.setProperty('--bg-accent', accentColor);
        boxEl.style.setProperty('--bg-accent-alpha', rgbaAccent);
      } catch (error) {
        console.error('Error calculando colores para el slider:', error);
      }
    };

    if (img.complete) {
      aplicarColores();
    } else {
      img.onload = aplicarColores;
    }
  });

  // 5. Capturar controles y lógica de auto-play
  const slider = target.querySelector(".slider");
  const trail = target.querySelectorAll(".trail div");
  const navBtns = target.querySelectorAll("svg");

  let currentIndex = 0;
  const interval = 4000;
  let start = null;

  const move = (index) => {
    currentIndex = index;
    // Calcula el porcentaje exacto de desplazamiento según la cantidad total
    const translatePercentage = currentIndex * (100 / totalSlides);
    slider.style.transform = `translate3d(-${translatePercentage}%, 0, 0)`;

    trail.forEach((item, i) => {
      item.classList.toggle("active", i === currentIndex);
    });
  };

  const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "power2.inOut" } });
  tl.from(target.querySelectorAll(".bg"), { x: "-100%", opacity: 0 })
    .from(target.querySelectorAll("p"), { opacity: 0 }, "-=0.3")
    .from(target.querySelectorAll("h1"), { opacity: 0, y: "30px" }, "-=0.3")
    .from(target.querySelectorAll("button"), { opacity: 0, y: "-40px" }, "-=0.8");

  const animate = () => tl.restart();

  const resetAutoplay = () => {
    if (start) clearInterval(start);
    start = setInterval(() => slide("increase"), interval);
  };

  const slide = (direction) => {
    if (direction === "increase") {
      currentIndex = (currentIndex + 1) % totalSlides;
    } else {
      currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    }
    move(currentIndex);
    animate();
  };

  // Iniciar Auto-play
  resetAutoplay();

  // Eventos manuales (reinician el temporizador de auto-play)
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      slide(btn.classList.contains("next") ? "increase" : "decrease");
      resetAutoplay();
    });
  });

  trail.forEach((item, index) => {
    item.addEventListener("click", () => {
      move(index);
      animate();
      resetAutoplay();
    });
  });
}