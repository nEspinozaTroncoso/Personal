# Flujo de trabajo agéntico — Pan App

Este documento explica **cómo se trabaja este proyecto con IA agéntica**: quién hace qué, con qué
modelo, y por qué. La idea es aprender un patrón reutilizable en proyectos futuros.

## Principio: planificar caro, ejecutar barato

- **Opus** razona mejor el diseño y las prioridades → se usa en ráfagas cortas donde el criterio
  importa (gestionar el backlog, diseñar el plan).
- **Sonnet 5** ejecuta tareas bien especificadas → más económico, se usa mucho (escribir el código).

Separar ambos roles **optimiza tokens y costo** sin perder calidad: el modelo caro produce
instrucciones precisas y el barato solo las ejecuta.

## Los tres agentes

| Agente | Modelo | Entrada | Salida |
|---|---|---|---|
| `gestor-backlog` | Opus | Ideas, estado del repo | `docs/BACKLOG.md` actualizado + item recomendado |
| `plan-panadero` | Opus | Un item del backlog | `docs/plans/<slug>.md` (plan detallado) |
| `implementador` | Sonnet 5 | Un plan de `docs/plans/` | Código funcionando + build verificado |

El modelo de cada uno está fijado en el `model:` de su archivo en `.claude/agents/`. **Se enruta
automáticamente**: al invocar un agente, corre con su modelo sin que cambies nada a mano. Lo único
manual es mantener tu **sesión interactiva en Opus** (con `/model`) para la parte de coordinación.

## El ciclo (de idea a producción)

```
   ┌─────────────────┐     ┌────────────────┐     ┌──────────────────┐
   │  gestor-backlog │ ──▶ │  plan-panadero │ ──▶ │  implementador   │
   │     (Opus)      │     │     (Opus)     │     │   (Sonnet 5)     │
   │  prioriza y     │     │  diseña el     │     │  escribe el      │
   │  recomienda     │     │  plan          │     │  código + build  │
   └─────────────────┘     └────────────────┘     └──────────────────┘
            ▲                                               │
            └───────────── marca "hecho" ◀──────────────────┘
                          + revisión + deploy Netlify
```

1. **Gestión** — `gestor-backlog` actualiza/prioriza `BACKLOG.md` y recomienda el siguiente item.
2. **Planificación** — `plan-panadero` convierte ese item en `docs/plans/<slug>.md`.
3. **Implementación** — `implementador` ejecuta el plan y corre `npm run build`.
4. **Revisión** — `/code-review` o revisión manual del diff.
5. **Cierre** — `gestor-backlog` marca el item como `hecho`; luego commit + deploy en Netlify.

## Cómo invocar cada agente

Basta con pedirlo en el chat por su nombre, por ejemplo:

> «Usa el agente **gestor-backlog** para revisar y priorizar el backlog.»
> «Usa el agente **plan-panadero** para planificar el item **B-01**.»
> «Usa el agente **implementador** para ejecutar `docs/plans/tests-baker.md`.»

## Reglas del flujo

- Ningún agente hace `git commit`/`push` salvo que se le pida explícitamente.
- El `implementador` no rediseña: si el plan es ambiguo, lo reporta en vez de improvisar.
- Todo item terminado se refleja en el backlog para mantener la trazabilidad.
- Las convenciones de código viven en `CLAUDE.md` (fuente de verdad para todos los agentes).
