# Plan B-02 — PWA instalable + offline (manifest + service worker)

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-02** (P1) — "PWA instalable + offline (manifest + service worker)".
> Requiere B-00 (hecho) y no debe romper los tests de B-01 (hecho).

## Contexto

La app se usa **desde el teléfono en la cocina**, donde la conexión suele ser mala o inexistente.
Convertirla en **PWA** aporta dos cosas concretas:

1. **Instalable**: el usuario puede "Agregar a pantalla de inicio" y abrirla como una app
   independiente (sin barra del navegador, `display: standalone`).
2. **Offline**: tras la primera visita con conexión, el *app shell* (HTML, JS, CSS, íconos) queda
   precacheado por un **service worker**, así la app abre y funciona **sin conexión**.

La app es **100% estática y sin backend**: los datos de recetas (`src/data/recipes.js`) y toda la
lógica (`src/lib/baker.js`) se empaquetan en el bundle. Por eso **precachear el build basta** para
tener offline completo; no hace falta cachear respuestas de red ni sincronizar nada.

**Enfoque elegido: `vite-plugin-pwa`** (usa Workbox por debajo). Es el estándar para proyectos Vite
y evita escribir el service worker a mano (menos superficie de error). Genera el manifest, el `sw.js`
con el precache del build, e inyecta automáticamente el `<link rel="manifest">` y el registro del SW
en el HTML. Es una **dependencia de desarrollo justificada** por el objetivo del item.

### Comportamiento offline de las fuentes (importante, no idealizar)

`src/styles/global.css` (línea 1) hace `@import` de Google Fonts (Fraunces + Inter) desde un **CDN
cross-origin**. Ese `@import` **no** se puede precachear con el build (no es un asset local). Sin
conexión, las fuentes caen a los *fallbacks* ya definidos en `src/styles/theme.js`
(`'Fraunces', serif` → `serif`; `'Inter', -apple-system, … sans-serif` → sans del sistema). La app
**funciona offline igual**, solo cambia la tipografía. Para mejorar la fidelidad offline se añade un
**runtimeCaching** opcional de Google Fonts (ver Paso 3, bloque `workbox.runtimeCaching`): cachea las
fuentes tras la primera carga online. Es un extra barato y estándar, no cambia el alcance.

## Archivos a tocar/crear

1. **`package.json`** (editar) — añadir `vite-plugin-pwa` a `devDependencies`. No tocar
   `dependencies` (React) ni el resto.
2. **`vite.config.js`** (editar) — importar y añadir el plugin `VitePWA({...})` con manifest +
   estrategia de caché. Es el único lugar donde se configura la PWA.
3. **`index.html`** (editar) — añadir meta tags: `theme-color`, `apple-touch-icon`,
   `apple-mobile-web-app-*`, `mobile-web-app-capable`, `description`. **No** añadir `<link
   rel="manifest">` a mano (lo inyecta el plugin; ver nota en Paso 4).
4. **`netlify.toml`** (editar) — añadir headers `Cache-Control` para `sw.js` y
   `manifest.webmanifest` (evitar que un caché largo impida actualizaciones). El redirect SPA se
   deja **igual** (ver Paso 6, no romperá el SW ni el manifest).
5. **`public/pwa-icon.svg`** (crear) — SVG vectorial fuente del ícono (contenido literal abajo).
   Solo formas/paths (sin emoji ni fuentes externas) para que se rasterice de forma **determinista**.
6. **PNGs de íconos en `public/`** (generar, NO escribir a mano) — se producen con el generador
   oficial a partir de `public/pwa-icon.svg` (ver Paso 2). Archivos esperados:
   - `public/pwa-192x192.png`
   - `public/pwa-512x512.png`
   - `public/maskable-icon-512x512.png`
   - `public/apple-touch-icon-180x180.png`
   - `public/pwa-64x64.png` (lo genera el preset; inofensivo, no se referencia en el manifest)

**No** se toca `src/` (ni componentes, ni `baker.js`, ni `recipes.js`, ni tests). **No** se toca
`main.jsx`: con `registerType: "autoUpdate"` el plugin inyecta el registro del SW automáticamente en
el HTML, así que **no** hace falta importar `virtual:pwa-register` ni añadir código de registro.

## Reutilización

- **`public/favicon.svg`** — se conserva tal cual como favicon del navegador (ya referenciado en
  `index.html`). El nuevo `pwa-icon.svg` es aparte, pensado para íconos de app (cuadrado, full-bleed).
- **Paleta del proyecto** (`src/styles/theme.js` y los `accent` de `src/data/recipes.js`):
  - `background_color` del manifest y meta = **`#EDE4D3`** (`colors.bg`, fondo de página → pantalla
    de splash coherente).
  - `theme_color` del manifest y `theme-color` meta = **`#B5652E`** (terracota; es el `accent` de una
    de las recetas, dentro del rango terracota `#A66B3F`–`#D9A441` que usa la app). También es el
    color de fondo del ícono, para que todo combine.
- **Deploy Netlify** (`netlify.toml`) — se reutiliza la config existente (`publish = "dist"`,
  redirect SPA); solo se le suman headers de caché.

## Pasos

### Paso 1 — Añadir la dependencia

En `package.json`, dentro de `devDependencies`, añadir `vite-plugin-pwa`. Dejar el bloque así:

```json
"devDependencies": {
  "@vitejs/plugin-react": "^4.3.1",
  "vite": "^5.4.2",
  "vite-plugin-pwa": "^0.20.5",
  "vitest": "^2.1.9"
}
```

**Justificación de versión:** Vite instalado es `^5.4.2`. `vite-plugin-pwa` **0.20.x** es la línea
estable que declara soporte para Vite 3/4/5 y trae Workbox 7 — compatible sin arriesgar un salto de
major. (La línea 0.21.x también soporta Vite 5, pero apunta ya a Vite 6; 0.20.5 es la opción
conservadora para Vite 5.4.) No usar 1.x/2.x.

Luego instalar:

```
npm install
```

Esperado: baja `vite-plugin-pwa@0.20.x` y sus deps (Workbox), actualiza `package-lock.json`, sin
errores.

### Paso 2 — Crear el SVG fuente y generar los PNG de íconos

**2a.** Crear `public/pwa-icon.svg` con **exactamente** este contenido (vectorial puro: rects,
ellipses y paths; nada de emoji ni `<text>`, para que la rasterización sea determinista):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#B5652E"/>
  <ellipse cx="256" cy="292" rx="150" ry="120" fill="#F4E7CE"/>
  <ellipse cx="256" cy="292" rx="150" ry="120" fill="none" stroke="#D9B98A" stroke-width="8"/>
  <path d="M116 250 Q256 150 396 250" fill="none" stroke="#E7CFA3" stroke-width="12" stroke-linecap="round"/>
  <path d="M205 250 L165 332" fill="none" stroke="#C98A4B" stroke-width="14" stroke-linecap="round"/>
  <path d="M256 240 L216 332" fill="none" stroke="#C98A4B" stroke-width="14" stroke-linecap="round"/>
  <path d="M307 250 L267 332" fill="none" stroke="#C98A4B" stroke-width="14" stroke-linecap="round"/>
</svg>
```

(Es una hogaza —boule— crema con tres cortes, sobre fondo terracota redondeado. El contenido queda
dentro del ~70% central, seguro para íconos *maskable*.)

**2b.** Generar los PNG con el generador oficial de assets PWA vía `npx` (así **no** queda como
dependencia permanente del proyecto). Ejecutar desde la raíz del proyecto:

```
npx @vite-pwa/assets-generator@0.2 --preset minimal-2023 public/pwa-icon.svg
```

Esperado: crea en `public/` los archivos `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`,
`maskable-icon-512x512.png` y `apple-touch-icon-180x180.png`. Confirmar con `ls public/` (o
`Get-ChildItem public`) que existen y **pesan > 0 bytes**.

> **Si el Paso 2b falla** (p. ej. `sharp` no compila/instala en este equipo): usar el **fallback de
> íconos** documentado al final de este plan ("Fallback de íconos"). No inventar PNG a mano ni
> escribir binarios: un PNG corrupto rompería la instalación. El SVG fuente del Paso 2a se conserva
> en ambos casos.

### Paso 3 — Configurar `vite-plugin-pwa` en `vite.config.js`

Reemplazar el contenido de `vite.config.js` por:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Cuaderno de panadería",
        short_name: "Panadería",
        description: "Recetas de pan que se escalan por porcentaje de panadero.",
        lang: "es",
        theme_color: "#B5652E",
        background_color: "#EDE4D3",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache del app shell (todo el build estático)
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        // Opcional pero recomendado: fidelidad de fuentes offline (Google Fonts CDN)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // SW desactivado en `npm run dev`; se verifica con build + preview.
        enabled: false,
      },
    }),
  ],
});
```

Notas para el implementador (no son decisiones abiertas, son aclaraciones):
- `registerType: "autoUpdate"` + `injectRegister: "auto"` → el plugin **inyecta solo** el `<link
  rel="manifest">` y el script de registro del SW en el HTML del build. Por eso **no** se edita
  `main.jsx` ni se añade `<link rel="manifest">` en `index.html`.
- El precache lo arma Workbox a partir del build; `globPatterns` cubre JS/CSS/HTML/íconos. No hay que
  listar archivos a mano.
- `navigateFallback: "/index.html"` mantiene el modelo SPA también offline.

### Paso 4 — Meta tags en `index.html`

En el `<head>` de `index.html`, **después** de la línea del favicon existente
(`<link rel="icon" ... href="/favicon.svg" />`) y **antes** del `<title>`, añadir:

```html
    <meta name="description" content="Recetas de pan que se escalan por porcentaje de panadero." />
    <meta name="theme-color" content="#B5652E" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Panadería" />
```

- **No** añadir `<link rel="manifest">`: lo inyecta `vite-plugin-pwa` en el build (añadirlo a mano lo
  duplicaría).
- Mantener el `<link rel="icon" ... favicon.svg>` y el `<title>` existentes.

### Paso 5 — Headers de caché en Netlify (`netlify.toml`)

Añadir al final de `netlify.toml`, **sin borrar** el `[build]` ni el `[[redirects]]` existentes:

```toml
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

Motivo: el `sw.js` (y el manifest) **no** deben quedar cacheados por mucho tiempo, o el navegador no
detectaría nuevas versiones de la app tras un deploy. Con `max-age=0, must-revalidate` siempre se
revalida. Los assets con hash del build (JS/CSS `*.[hash].js`) sí pueden cachearse largo (default de
Netlify), no se tocan.

### Paso 6 — Confirmar que el redirect SPA NO interfiere (no cambiar nada)

El redirect `/* → /index.html status = 200` **no lleva `force`/`!`**, y en Netlify los redirects sin
`force` solo se aplican cuando **no existe** un archivo estático que coincida. Como `sw.js`,
`manifest.webmanifest` y los PNG de íconos **sí** existen en `dist/`, Netlify los sirve directamente
y el redirect no los intercepta. **Acción: dejar el `[[redirects]]` tal cual; NO añadirle `force =
true`.** (Este paso es una verificación, no un cambio.)

## Verificación end-to-end

1. **Dependencia e íconos instalados** (Pasos 1–2):
   ```
   npm install
   npx @vite-pwa/assets-generator@0.2 --preset minimal-2023 public/pwa-icon.svg
   ```
   Comprobar que en `public/` existen `pwa-192x192.png`, `pwa-512x512.png`,
   `maskable-icon-512x512.png` y `apple-touch-icon-180x180.png` (peso > 0).

2. **Tests de B-01 siguen en verde** (no debe haber regresión):
   ```
   npm test
   ```
   Esperado: los 10 tests de `src/lib/baker.test.js` en verde (la PWA no toca `src/`).

3. **Build de producción sin errores**:
   ```
   npm run build
   ```
   Esperado: build a `dist/` sin errores. Confirmar que en `dist/` aparecen:
   `sw.js`, `manifest.webmanifest`, `registerSW.js` y los `pwa-*.png` / `maskable-*.png` /
   `apple-touch-icon-*.png`. (Con Bash: `ls dist | grep -E "sw.js|manifest|pwa-|maskable|apple"`.)

4. **Servir el build y probar en el navegador**:
   ```
   npm run preview
   ```
   Abrir la URL que imprime (típicamente `http://localhost:4173`) en Chrome y abrir **DevTools >
   Application**:
   - **Manifest**: debe mostrar `name` "Cuaderno de panadería", `short_name` "Panadería",
     `theme_color` `#B5652E`, `background_color` `#EDE4D3`, `display: standalone`, y los 3 íconos
     (192, 512, 512-maskable) sin advertencias de "no icon".
   - **Service Workers**: un SW **activated and is running** para el origin. Sin errores en consola.
   - **Cache Storage**: una caché de Workbox (p. ej. `workbox-precache-...`) con el app shell
     (`index.html`, los `assets/*.js`/`*.css` con hash, íconos).

5. **Prueba offline** (el corazón del item):
   - Con la app ya cargada una vez, en **DevTools > Application > Service Workers** marcar
     **Offline** (o en la pestaña **Network** poner el throttling en **Offline**).
   - Recargar (F5). La app debe **cargar y funcionar** (seleccionar receta, mover el peso, ver
     ingredientes escalados) sin red. La tipografía puede caer a fuentes del sistema si aún no se
     cachearon (comportamiento esperado, ver Contexto).

6. **Instalabilidad**:
   - En Chrome desktop debe aparecer el ícono de **instalar** en la barra de direcciones; o en
     **DevTools > Application > Manifest** el botón/aviso de instalación sin errores bloqueantes.
   - **Opcional (Lighthouse)**: DevTools > Lighthouse > categoría **PWA** (o "Installable") → debe
     pasar los checks de manifest válido, íconos 192/512, SW registrado y respuesta offline (200).

7. **Sanidad del deploy Netlify** (revisión humana, tras publicar): en producción, pedir
   `/manifest.webmanifest` y `/sw.js` directamente en el navegador y confirmar que devuelven el
   archivo real (no el `index.html` del redirect) y que `sw.js` viaja con
   `Cache-Control: public, max-age=0, must-revalidate`.

## Fallback de íconos (solo si el Paso 2b falla)

Si `npx @vite-pwa/assets-generator` no logra generar los PNG en este equipo (típicamente por fallo de
instalación de `sharp`), **no** escribir binarios a mano. En su lugar:

**Opción A (preferida sin PNG): referenciar el SVG como ícono del manifest.** Chrome moderno acepta
íconos SVG para instalar. En el `manifest.icons` de `vite.config.js` usar temporalmente:

```js
icons: [
  { src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
  { src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
],
```

y en `index.html` apuntar el apple-touch-icon al SVG: `<link rel="apple-touch-icon"
href="/pwa-icon.svg" />`. Añadir `"pwa-icon.svg"` a `includeAssets`. Limitaciones conocidas: iOS no
usa SVG para el ícono de "Agregar a inicio" (mostrará un genérico) y Lighthouse puede avisar por
falta de PNG 192/512. La app **igual instala y funciona offline**.

**Opción B (documentar y desbloquear): dejar placeholders y una tarea de reemplazo.** Mantener las
entradas PNG del manifest (Paso 3) y anotar en las Notas del backlog B-02 que faltan los PNG reales;
generarlos después en otra máquina con `npx @vite-pwa/assets-generator@0.2 --preset minimal-2023
public/pwa-icon.svg` y copiarlos a `public/`. **No** commitear PNG vacíos/corruptos.

En cualquiera de los dos casos, dejar constancia clara en el resumen de la implementación de que se
usó el fallback y por qué.

## Fuera de alcance

- **Push notifications** y **Background Sync**: explícitamente fuera (lo pide el item).
- Estrategias de caché de datos de red / API: la app no tiene backend; el precache del build basta.
  (La integración con API de recetas es el item **B-06**, aparte.)
- **Self-hosting** de las fuentes Fraunces/Inter para offline pixel-perfect: se cubre parcialmente con
  el `runtimeCaching` opcional; migrar a fuentes locales es otra mejora, no este item.
- Cambios visuales, de layout o de la lógica de dominio (`baker.js`, `recipes.js`, componentes):
  **cero**. Este item solo añade capa PWA.
- `git init` / commits / push: no se hacen (convención de `CLAUDE.md`).
- Pantallas de splash personalizadas por dispositivo iOS (`apple-touch-startup-image` por resolución):
  innecesarias para el objetivo; el `background_color` + `theme_color` ya dan una splash coherente.
```
