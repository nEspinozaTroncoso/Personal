# Guía de Programación Agéntica con IA

> Guía didáctica y **transferible**. Usa el proyecto **Pan App** como ejemplo, pero cada concepto
> se extrapola a un escenario general para que lo reutilices en proyectos futuros.
>
> Documentos hermanos (específicos de este proyecto): `docs/AGENTIC_WORKFLOW.md` (el flujo aquí),
> `docs/BACKLOG.md` (trabajo pendiente), `CLAUDE.md` (convenciones y fuente de verdad).

---

## 1. Para qué sirve esta guía

Programar con IA agéntica no es "pedir código y pegarlo". Es **coordinar agentes** (asistentes de
IA con un rol y un modelo asignado) a través de un flujo con artefactos que dejan **trazabilidad**:
poder responder, semanas después, *"¿por qué existe este cambio y de dónde salió?"*.

Esta guía te enseña tres cosas:
1. El **modelo mental** del flujo agéntico.
2. **Cómo pedirme** implementaciones y cambios para obtener buenos resultados y trazabilidad.
3. Las **buenas prácticas y anti-patrones** que hacen la diferencia.

Cómo leerla: las secciones 2–4 son conceptuales; la **sección 5 es la más práctica** (cómo pedir);
la 6 es trazabilidad; 7–9 son referencia rápida.

---

## 2. Modelo mental: planificar caro, ejecutar barato

La idea central del ahorro de costo/tokens: **usa el modelo potente donde el criterio importa, y el
modelo económico donde solo hay que ejecutar**.

- **Planificar / decidir** → modelo potente (p. ej. **Opus**). Se usa en ráfagas cortas.
- **Ejecutar tareas bien especificadas** → modelo económico (p. ej. **Sonnet** o **Haiku**). Se usa
  mucho, así que ahí está el grueso del gasto.

Cuanto mejor sea el plan (hecho por el modelo caro), **menos tiene que "pensar" el modelo barato**,
y mejor sale la ejecución.

| En este proyecto (Pan App) | En general (cualquier proyecto) |
|---|---|
| `plan-panadero` y `gestor-backlog` usan `model: opus`; `implementador` usa `model: sonnet`. | Define agentes con el modelo adecuado a su rol: caro para diseño/decisión, barato para ejecución. |
| El `model:` está fijo en cada archivo `.claude/agents/*.md`. | El enrutado de modelo es **automático** por agente; no cambias de modelo a mano al invocarlos. |

> **Regla práctica**: mantén **tu sesión interactiva en el modelo potente** (para coordinar), y deja
> que los subagentes de ejecución corran en el modelo económico vía su `model:`.

---

## 3. Los roles / agentes

Un **agente** es un asistente con un rol acotado, herramientas limitadas y un modelo asignado.
Acotar el rol mejora la calidad y la trazabilidad (cada uno hace una cosa y la hace bien).

| Rol en Pan App | Modelo | Rol genérico equivalente | Responsabilidad |
|---|---|---|---|
| `gestor-backlog` | Opus | **Curador de backlog** | Prioriza, agrega, marca hecho/descartado, recomienda el siguiente item. |
| `plan-panadero` | Opus | **Arquitecto / planificador** | Convierte un item en un plan detallado y ejecutable. |
| `implementador` | Sonnet | **Ejecutor** | Escribe el código siguiendo el plan y verifica el build. |

**¿Cuántos agentes conviene tener?**
- **Mínimo viable**: 2 roles — *planificar* y *ejecutar*. Suficiente para proyectos pequeños.
- **Añade un curador de backlog** cuando la lista de ideas crece y necesitas orden/priorización.
- **Añade especialistas** (p. ej. *revisor*, *tester*, *documentador*) solo cuando el volumen lo
  justifique. Más agentes = más coordinación; no los crees "por si acaso".

> Extrapolación: el patrón **curador → arquitecto → ejecutor** sirve para casi cualquier stack
> (web, backend, datos). Cambian las herramientas, no los roles.

---

## 4. El ciclo de trabajo

```
   BACKLOG  ──▶  PLAN  ──▶  IMPLEMENTACIÓN  ──▶  REVISIÓN  ──▶  CIERRE  ──▶  DEPLOY
 (gestor-      (plan-        (implementador)     (/code-       (marcar     (Netlify/
  backlog)     panadero)                          review)      "hecho")     donde sea)
     ▲                                                             │
     └──────────────────── retroalimenta el backlog ◀─────────────┘
```

Cada paso produce un **artefacto** (algo tangible que queda registrado):

| Paso | Quién | Artefacto que deja |
|---|---|---|
| Backlog | curador | item con **ID** en `docs/BACKLOG.md` |
| Plan | arquitecto | `docs/plans/<slug>.md` |
| Implementación | ejecutor | cambios en el código + build verificado |
| Revisión | tú / revisor | comentarios, correcciones |
| Cierre | curador | item marcado `hecho` en el backlog |
| Deploy | tú | versión pública (URL) |

La cadena de artefactos **es** la trazabilidad (ver §6).

---

## 5. Cómo solicitarme las implementaciones y los cambios

Esta es la parte que más impacta el resultado. Una buena solicitud reduce el ida y vuelta y evita
que yo "adivine".

### 5.1 Anatomía de una buena solicitud

Incluye, aunque sea en una frase cada uno:

1. **Objetivo** — qué quieres lograr y *por qué* (el "para qué" ayuda a decidir bien).
2. **Alcance** — qué entra y, sobre todo, **qué NO** entra.
3. **Restricciones** — no cambiar X, no añadir dependencias, mantener el aspecto, etc.
4. **Criterio de "hecho"** — cómo sabremos que quedó bien (qué observar / probar).
5. **Referencias** — archivo, item del backlog, plan, o captura.

### 5.2 Plantillas listas para copiar

**Nueva feature**
```
Objetivo: quiero [feature] para [beneficio].
Alcance: incluye [A, B]. NO incluye [C].
Restricciones: [no romper X / reutilizar Y / sin nuevas dependencias].
Hecho cuando: [comportamiento observable / prueba].
Referencia: item [B-0X] del backlog.
Cómo: primero planifícalo con plan-panadero; luego lo ejecuto con implementador.
```

**Cambio / ajuste**
```
Cambia [qué] en [archivo/componente] para que [nuevo comportamiento].
Mantén: [lo que no debe cambiar].
Hecho cuando: [resultado esperado].
```

**Bug**
```
Bug: al hacer [pasos], ocurre [resultado actual], pero esperaba [resultado correcto].
Contexto: [archivo/pantalla, datos de ejemplo].
No cambies alcance más allá de arreglar esto.
```

**Refactor**
```
Refactoriza [área] para [objetivo: legibilidad/reutilización/rendimiento].
Invariante: el comportamiento y la salida deben quedar idénticos.
Hecho cuando: build ok y [prueba de que nada cambió a nivel usuario].
```

### 5.3 Ejemplos: bueno vs. vago

| Vago ❌ | Bueno ✅ |
|---|---|
| "Agrégale modo oscuro." | "Objetivo: modo oscuro con toggle. Alcance: solo colores desde `theme.js`; NO tocar la lógica de recetas. Hecho cuando: el toggle alterna claro/oscuro y persiste. Ref: B-04. Primero plan-panadero, luego implementador." |
| "Mejora la app." | (demasiado abierto — divídelo en items del backlog con objetivos concretos) |

> Versión genérica del ejemplo bueno: *"Objetivo: [feature]. Alcance: solo [capa]; no tocar
> [otra capa]. Hecho cuando: [criterio]. Ref: [ticket]."* — el mismo esqueleto sirve en cualquier
> proyecto.

### 5.4 ¿Plan mode, pedido directo o subagente?

| Situación | Qué conviene |
|---|---|
| Tarea compleja / con decisiones de diseño | **Plan mode** (o `plan-panadero`): primero plan, luego ejecución. |
| Cambio pequeño y claro (1–2 archivos) | **Pedido directo**, sin plan formal. |
| Ejecutar algo ya planificado, ahorrando tokens | **Subagente `implementador`** (corre en el modelo económico). |
| Ordenar/priorizar ideas | **Subagente `gestor-backlog`**. |

Cómo invocar un subagente: basta pedirlo por su nombre, p. ej.
> «Usa el agente **plan-panadero** para planificar el item **B-04**.»
> «Usa el agente **implementador** para ejecutar `docs/plans/modo-oscuro.md`.»

---

## 6. Trazabilidad: el "por qué" de cada cambio

Trazabilidad = poder reconstruir la historia de una decisión. Se logra **encadenando artefactos**
con identificadores y enlaces:

```
Item de backlog (B-04)  ─▶  Plan (docs/plans/modo-oscuro.md)  ─▶  Implementación  ─▶  Commit  ─▶  Deploy
      "qué y por qué"          "cómo"                              "el código"        "registro"   "versión viva"
```

Convenciones que lo hacen posible:

- **IDs estables** en el backlog (`B-04`), que nunca se reutilizan. Todo lo demás los referencia.
- **Un plan por feature** en `docs/plans/<slug>.md`, enlazado desde el item del backlog.
- **Commits que citan el item/plan** en su mensaje (p. ej. *"B-04: modo oscuro con toggle"*).
- **`CLAUDE.md` como fuente de verdad** de convenciones: si algo se decide "para siempre", vive ahí,
  no en un chat que se pierde.
- **El backlog refleja el estado real**: al terminar, el item pasa a `hecho`. Un backlog
  desactualizado destruye la trazabilidad.

| En Pan App | En general |
|---|---|
| `B-04` → `docs/plans/modo-oscuro.md` → commit "B-04: …" → deploy Netlify | ticket → doc de diseño → PR/commit que cita el ticket → release |

---

## 7. Buenas prácticas

- **Cambios pequeños y enfocados**: una intención por tarea. Más fácil de revisar y revertir.
- **Una tarea = un plan**: no mezcles features distintas en el mismo plan.
- **Verificar antes de declarar "hecho"**: correr el build/pruebas y *observar* el resultado, no
  suponerlo.
- **No añadir dependencias sin justificar**: cada librería es peso y superficie de mantenimiento.
- **Separar lógica pura de la UI**: el cálculo va en funciones puras y testeables (en Pan App,
  `src/lib/baker.js`); la UI solo presenta. Esto vale para cualquier proyecto.
- **Revisar el diff** (`/code-review` o a ojo) antes de integrar.
- **Higiene de commits**: mensajes que expliquen el *por qué*, no solo el *qué*; citar el item.
- **Reutilizar antes que reescribir**: busca utilidades existentes antes de crear nuevas.

---

## 8. Anti-patrones (evítalos)

- **Pedidos ambiguos** ("mejóralo", "hazlo más lindo") → obligan a adivinar. Da objetivo + criterio.
- **Saltarse el plan en tareas complejas** → retrabajo y decisiones improvisadas.
- **Mezclar varios cambios** en una sola tanda → imposible de revisar o revertir limpio.
- **Backlog desactualizado** → se pierde el "qué falta" y el "por qué se hizo".
- **Confiar sin verificar** → aceptar "quedó listo" sin correr nada. Pide evidencia.
- **Poner decisiones permanentes solo en el chat** → se pierden; van a `CLAUDE.md`.
- **Crear agentes de más** → coordinación innecesaria; suma roles solo cuando el volumen lo pida.

---

## 9. Checklist rápido

**Antes de pedir**
- [ ] ¿Está el objetivo y el "para qué" claros?
- [ ] ¿Definí qué NO entra en el alcance?
- [ ] ¿Existe un item de backlog con ID? ¿Necesita plan primero?

**Durante**
- [ ] ¿Tarea pequeña y enfocada?
- [ ] ¿Se reutiliza lo existente en vez de reescribir?

**Al cerrar**
- [ ] ¿Se corrió el build/pruebas y se observó el resultado?
- [ ] ¿El commit cita el item/plan?
- [ ] ¿El backlog quedó actualizado (`hecho`)?
- [ ] ¿Las decisiones permanentes quedaron en `CLAUDE.md`?

---

## 10. Glosario

- **Agente**: asistente de IA con un rol acotado, herramientas limitadas y un modelo asignado.
- **Subagente**: agente que invocas desde tu sesión para una tarea puntual; corre con *su* modelo.
- **Plan mode**: modo en el que primero se acuerda un plan (sin tocar código) y luego se ejecuta.
- **`model:`**: campo del archivo del agente (`.claude/agents/*.md`) que fija qué modelo lo ejecuta;
  el enrutado es automático.
- **Backlog**: lista priorizada de trabajo pendiente, con IDs estables.
- **Artefacto de trazabilidad**: cada salida registrada del ciclo (item, plan, commit, deploy) que,
  encadenada, permite reconstruir el "por qué" de un cambio.
