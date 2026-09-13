# D&E Training

PWA estática para registrar los entrenamientos de Daniel y Elina. Funciona en GitHub Pages desde una subruta, guarda datos en IndexedDB y ofrece backup JSON.

## Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a la rama `main`.
2. En **Settings → Pages**, selecciona **Deploy from a branch**.
3. Elige `main` y `/ (root)`.

Todos los paths son relativos, incluido el service worker, por lo que funciona en `https://usuario.github.io/daniel-elina-training/`.

## Desarrollo local

Un service worker requiere HTTP. Ejecuta un servidor estático en esta carpeta y abre la URL local indicada por ese servidor.

## Arquitectura

- `js/data.js`: biblioteca maestra y rutinas iniciales.
- `js/db.js`: capa IndexedDB, historial y backup.
- `js/app.js`: interfaz y flujos.
- `assets/exercises`: 61 guías anatómicas verticales, una por ejercicio, con inicio y final.
- `assets/equipment`: referencias fotográficas originales del equipo real, conservadas fuera de la interfaz.
- `sw.js`: app shell offline y caché progresivo de las guías visuales a medida que se usan.

No hay backend, login ni servicios remotos.
