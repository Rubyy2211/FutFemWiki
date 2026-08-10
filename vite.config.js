import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        equipoFicha: resolve(__dirname, 'equipo_ficha.html'),
        jugadoraFicha: resolve(__dirname, 'jugadora_ficha.html'),
        jugadoras: resolve(__dirname, 'jugadoras.html'),
        liga: resolve(__dirname, 'liga.html'),
        ligas: resolve(__dirname, 'ligas.html'),
      },
    },
  },
});