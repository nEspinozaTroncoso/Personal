# Pan App

Recetas de pan que se escalan por porcentaje de panadero: elige una receta y un peso total de
masa, y cada ingrediente se recalcula al instante en gramos y mililitros.

## Características

- **Cálculo por porcentaje de panadero**: 6 recetas, reescalado lineal al peso de masa deseado.
- **PWA instalable + offline**: se puede "agregar a la pantalla de inicio" y funciona sin conexión
  tras la primera visita.
- **Modo claro/oscuro**: toggle en la cabecera; respeta la preferencia del sistema y la recuerda.
- **Responsive**: pensada para el móvil, se adapta a pantallas anchas.

## Requisitos

- Node 18+ y npm.

## Desarrollo

```bash
npm install
npm run dev      # abre http://localhost:5173 (sin service worker)
npm run build    # genera dist/ (incluye sw.js + manifest.webmanifest)
npm run preview  # sirve el build local (aquí se puede probar la PWA)
npm test         # tests de la lógica de escalado (Vitest)
```

> La PWA (instalable/offline) solo se comprueba en `build` + `preview`, no en `dev`.

## Deploy en Netlify (gratis)

Hay tres formas de desplegar la app en Netlify:

1. **Netlify Drop** (la más rápida, sin cuenta ni CLI): corre `npm run build` y luego arrastra la
   carpeta `dist/` generada a [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. **Netlify CLI**: instala `npm i -g netlify-cli`, luego corre `netlify deploy` para un borrador
   de prueba y `netlify deploy --prod` para publicar en producción. El directorio a publicar es
   `dist`.
3. **Repo Git**: cuando el proyecto esté en un repositorio Git, conéctalo en Netlify. La
   configuración de build (`npm run build`, publicar `dist`) se toma automáticamente de
   `netlify.toml`.

## Uso en el móvil

Abre la URL pública de Netlify en el navegador del teléfono. Opcionalmente puedes "Agregar a
pantalla de inicio" para acceder como si fuera una app. La interfaz es responsive: en el teléfono
los bloques de ingredientes y procedimiento se apilan en una columna; en pantallas anchas
(`>720px`) se muestran lado a lado en 2 columnas.
