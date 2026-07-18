# APIs de recetas de pan — investigación (NO implementado)

> Documento **solo informativo**. No hay código de integración en el proyecto. Sirve para decidir,
> más adelante, si conviene traer recetas desde una API externa (item **B-06** del backlog).

## Resumen rápido

| API | Gratis | Requiere API key | Catálogo de pan | Nota clave |
|-----|--------|------------------|-----------------|------------|
| **Spoonacular** | Freemium (~150 req/día) | Sí | Amplio y detallado | La más completa; key ⇒ necesita proxy |
| **Edamam Recipe Search** | Freemium | Sí (app_id + app_key) | Bueno para búsqueda | Orientada a búsqueda/nutrición |
| **TheMealDB** | Sí | No (uso básico) | Limitado | La más fácil para prototipar |
| **Forkify API** | Sí | No | Medio | Educativa, ideal para practicar `fetch` |

## Detalle

### Spoonacular
- **Pros**: recetas completas (ingredientes, pasos, nutrición, imágenes), buena cobertura de pan,
  endpoints de búsqueda y de "por ingredientes".
- **Contras**: requiere API key; el tier gratuito tiene cuota diaria. La key **no debe exponerse**
  en el frontend.
- **Implicación**: habría que añadir un **proxy** (p. ej. una **Netlify Function**) que guarde la
  key como variable de entorno y reenvíe las peticiones.

### Edamam Recipe Search
- **Pros**: potente para búsqueda y filtros dietéticos/nutricionales.
- **Contras**: requiere `app_id` + `app_key`; mismo problema de exposición ⇒ proxy.

### TheMealDB
- **Pros**: gratis y sin key para uso básico; muy simple de consumir.
- **Contras**: catálogo de pan **limitado**; menos control sobre resultados.
- **Uso típico**: prototipos rápidos o demos.

### Forkify API
- **Pros**: gratis, sin key, pensada para aprender; buena para practicar `fetch`/estado async.
- **Contras**: dataset acotado; no es de calidad "producción".

## Recomendación (para cuando se aborde B-06)
- **Para aprender / prototipo sin backend**: empezar con **TheMealDB** o **Forkify** (sin key,
  sin proxy) para practicar el consumo de API en el frontend.
- **Para una versión más seria**: **Spoonacular**, aceptando el costo de montar una **Netlify
  Function** como proxy para proteger la key.

## Consideraciones transversales
- El modelo del proyecto es **porcentaje de panadero**; una receta externa vendría con cantidades
  fijas → habría que **normalizarla** a `pct` para encajar con `src/lib/baker.js`. Eso es diseño
  propio del item B-06, no de la API.
- Cualquier key va en variables de entorno del backend/función, **nunca** en el bundle del cliente.
