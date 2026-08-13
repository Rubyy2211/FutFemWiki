class CanvasBackground {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext("2d");
        
        // Permite personalizar la paleta de colores por canvas
        this.colors = options.colors || ["#210936", "#836FFF", "#FF007A"];
        this.circles = [];

        this.resize();
        
        // Escuchar el resize de forma independiente
        window.addEventListener("resize", () => this.resize());
        
        // Iniciar el bucle de animación
        this.animate = this.animate.bind(this);
        this.animate();
    }

    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    initCircles() {
        this.circles = [];
        let circleCount = Math.floor(window.innerWidth / 100);

        for (let i = 0; i < circleCount; i++) {
            let radius = window.innerWidth / 4;
            let x = this.randomBetween(radius, this.canvas.width - radius);
            let y = this.randomBetween(radius, this.canvas.height - radius);
            let dx = this.randomBetween(window.innerWidth / -2000, window.innerWidth / 2000);
            let dy = this.randomBetween(window.innerWidth / -2000, window.innerWidth / 2000);
            let color = this.colors[Math.floor(Math.random() * this.colors.length)];

            this.circles.push({ x, y, dx, dy, radius, color });
        }
    }

    drawCircle(circle) {
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = circle.color;
        this.ctx.fill();
        this.ctx.closePath();
    }

    animate() {
        requestAnimationFrame(this.animate);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.circles.forEach(circle => {
            // Colisiones de rebote
            if (circle.x + circle.radius > this.canvas.width || circle.x - circle.radius < 0) {
                circle.dx = -circle.dx;
            }

            if (circle.y + circle.radius > this.canvas.height || circle.y - circle.radius < 0) {
                circle.dy = -circle.dy;
            }

            circle.x += circle.dx;
            circle.y += circle.dy;

            this.drawCircle(circle);
        });
    }

    resize() {
        this.canvas.width = window.innerWidth * 1.5;
        this.canvas.height = window.innerHeight * 1.5;
        this.initCircles();
    }
}

const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
    });
}