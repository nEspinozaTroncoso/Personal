# Plan B-09 — Normalizar redondeo de `formatAmount` cerca de 10

## Contexto

`formatAmount(n)` (`src/lib/baker.js`) decide cómo se muestra cada cantidad de ingrediente:
valores por debajo de 10 con **1 decimal** (`toFixed(1)`), valores de 10 en adelante como
**entero** (`Math.round`). La intención de diseño es: "cantidades pequeñas necesitan la precisión
del decimal; cantidades grandes no".

Implementación actual:

```js
export function formatAmount(n) {
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}
```

**Rareza (detectada en B-01):** la rama se decide con el valor **crudo** `n`, pero el string se
produce **redondeando**. Para `n` en `[9.95, 10)` la condición `n < 10` es verdadera, se toma la
rama decimal, y `toFixed(1)` redondea hacia arriba → `formatAmount(9.96) === "10.0"`. Es
incoherente: un valor cuyo texto mostrado ya es 10 aparece con decimal (`"10.0"`), justo lo que la
rama de enteros pretendía evitar. La zona afectada es estrecha (`9.95 ≤ n < 10`) pero real: con
`scaleRecipe` cualquier ingrediente puede caer ahí según el peso objetivo.

El test de B-01 (`src/lib/baker.test.js`) **fija hoy** `formatAmount(9.96) === "10.0"` como el
comportamiento actual (documentado como observación, no como deseado). Cambiarlo es un cambio
consciente que este plan aprueba y que debe reflejarse en ese test.

## Decisión de la regla (el backlog delega esta decisión)

**Regla deseada:** la rama se decide **según el valor ya redondeado a 1 decimal**, no según el
valor crudo. Es decir: *si el número, mostrado con 1 decimal, sería `< 10`, se muestra con 1
decimal; si al redondearlo a 1 decimal alcanza o supera 10, se muestra como entero.*

Consecuencia práctica: el umbral efectivo de corte pasa de `10` a `9.95` (el punto donde
`toFixed(1)` empezaría a mostrar `"10.0"`). Todo lo `< 9.95` sigue en decimal; `9.95` en adelante
pasa a entero.

### Enfoque elegido y justificación

De las dos opciones evaluadas:

- **A (elegida) — redondear primero, decidir después:**
  ```js
  export function formatAmount(n) {
    const rounded1 = Math.round(n * 10) / 10; // valor a 1 decimal
    if (rounded1 < 10) return rounded1.toFixed(1);
    return Math.round(n).toString();
  }
  ```
- **B — comparar contra el umbral literal `9.95`:**
  ```js
  export function formatAmount(n) {
    if (n < 9.95) return n.toFixed(1);
    return Math.round(n).toString();
  }
  ```

Se elige **A** por **auto-consistencia**: la decisión de rama se deriva de la **misma operación de
redondeo** que produce el texto, así que es imposible por construcción que la rama decimal emita
`"10.0"`. El enfoque B depende del literal `9.95`, que **no es representable exactamente** en punto
flotante (el `double` más cercano es ≈ `9.9499999999999993`, ligeramente por debajo de 9.95). Eso
introduce una franja microscópica donde la comparación `n < 9.95` y el redondeo real de `toFixed(1)`
podrían discrepar en el borde. A es inmune a ese detalle y además **se lee como la intención**
("si el valor mostrado a 1 decimal sería < 10…"). El coste es un multiplicar/dividir extra:
despreciable.

Notas de A:
- La rama decimal usa `rounded1.toFixed(1)` (no `n.toFixed(1)`); ambos producen strings idénticos
  para cualquier `n` de esa rama (`toFixed(1)` ya redondea), pero usar `rounded1` deja explícita la
  coherencia con la condición.
- La rama entera conserva `Math.round(n)` sobre el crudo (equivale a `Math.round(rounded1)` en este
  rango; se mantiene `Math.round(n)` por continuidad con el código actual y los tests ≥10 vigentes).

## Archivos a tocar

- **`src/lib/baker.js`** — reemplazar **solo** el cuerpo de `formatAmount` por el enfoque A. **No
  tocar `scaleRecipe`** ni ninguna otra cosa del archivo.
- **`src/lib/baker.test.js`** — actualizar el bloque `describe("formatAmount")`: cambiar el caso que
  fija `9.96 === "10.0"` por el nuevo comportamiento y añadir los casos límite (ver abajo). No
  duplicar ni alterar los tests de `scaleRecipe` ni los casos de `formatAmount` que siguen válidos.

## Reutilización

- `formatAmount` y `scaleRecipe` ya viven en `src/lib/baker.js` (lógica pura, sin React). No se crea
  utilidad nueva ni se añaden dependencias: se ajusta la función existente.
- El único consumidor en el build es `src/components/IngredientList.jsx` (línea ~40:
  `{formatAmount(ing.amount)} {ing.unit}`), que solo **renderiza** el string devuelto → no asume el
  formato viejo, no requiere cambios.
- `BreadApp.jsx` (raíz) tiene su propia copia histórica de `formatAmount`, pero es **referencia, no
  parte del build** (ver CLAUDE.md) → **no tocar**.

## Pasos

1. En `src/lib/baker.js`, sustituir el cuerpo de `formatAmount` por el enfoque A (arriba). Mantener
   la firma `export function formatAmount(n)` y el resto del archivo intacto.
2. En `src/lib/baker.test.js`, dentro de `describe("formatAmount")`:
   - **Mantener sin cambios** el primer `it` (`valores < 10 … toFixed(1)`): `5.847…→"5.8"`,
     `0→"0.0"`, `2→"2.0"`, `9.94→"9.9"` siguen siendo correctos.
   - **Mantener sin cambios** el segundo `it` (`valores >= 10 … Math.round`): `10→"10"`,
     `11.6959…→"12"`, `584.79…→"585"`, `397.66…→"398"` siguen correctos.
   - **Reescribir** el tercer `it` (hoy titulado "borde alrededor de 10: la rama depende de n<10…")
     porque su premisa ya no aplica. Nuevo título orientado a la regla nueva (p. ej. *"borde
     alrededor de 10: la rama se decide con el valor ya redondeado a 1 decimal"*) con las
     aserciones de la tabla de la sección Verificación. En particular:
     - cambiar `expect(formatAmount(9.96)).toBe("10.0")` → `expect(formatAmount(9.96)).toBe("10")`.
     - conservar `10→"10"`, `10.4→"10"`, `10.6→"11"` (siguen válidos).
   - **Añadir** los casos límite nuevos sin duplicar: `9.949999→"9.9"`, `9.95→"10"`, `9.999→"10"`,
     y opcionalmente `3.456→"3.5"` (bien por debajo) y `234.6→"235"` (bien por encima) para dejar
     constancia de que el comportamiento fuera del borde no cambia.
3. Ejecutar la suite y confirmar verde.

## Verificación

**Casos límite especificados (todos deben cumplirse con el enfoque A):**

| Entrada `n`   | Zona                         | Salida esperada | Por qué |
|---------------|------------------------------|-----------------|---------|
| `9.949999`    | decimal (justo por debajo)   | `"9.9"`         | `Math.round(99.49999)/10 = 9.9 < 10` |
| `9.95`        | conflictiva (borde inferior) | `"10"`          | `Math.round(99.5)/10 = 10 ≥ 10` → `Math.round(9.95)=10` |
| `9.96`        | conflictiva (era `"10.0"`)   | `"10"`          | `rounded1 = 10 ≥ 10` → entero |
| `9.999`       | conflictiva (borde superior) | `"10"`          | `rounded1 = 10 ≥ 10` → entero |
| `10.0`        | exacto                       | `"10"`          | `rounded1 = 10 ≥ 10` → `Math.round(10)=10` |
| `3.456`       | bien por debajo              | `"3.5"`         | `Math.round(34.56)/10 = 3.5 < 10` |
| `234.6`       | bien por encima              | `"235"`         | `rounded1 = 234.6 ≥ 10` → `Math.round(234.6)=235` |

**Comandos:**

- `npm test` → toda la suite en verde. Antes de este item había **28 tests** (B-10); tras añadir los
  casos límite habrá algunos más, todos en verde. Ningún test previo debe quedar roto salvo el caso
  `9.96` que se reescribe conscientemente a `"10"`.
- `npm run build` → build sin regresiones (sanity check de que `baker.js` sigue importable).

**End-to-end (opcional, manual):** `npm run dev` y elegir una receta/peso donde algún ingrediente
caiga en `[9.95, 10)` g (p. ej. ajustar el peso hasta que la sal ronde ~9.97 g): la lista de
ingredientes (`IngredientList`) debe mostrar `"10 g"`, no `"10.0 g"`. El resto de cantidades se ve
igual que antes.

## Fuera de alcance

- **No** se modifica `scaleRecipe` ni los `pct` de las recetas (`src/data/recipes.js`).
- **No** se toca `BreadApp.jsx` (copia histórica fuera del build).
- **No** se cambia el modelo de porcentaje de panadero ni el aspecto visual.
- **No** se añaden dependencias.
- **No** se cubren entradas negativas o no numéricas: `scaleRecipe` siempre produce `amount`
  positivos, así que queda fuera del alcance de este item.
- **No** se edita la observación histórica en `docs/plans/b-01-tests-baker.md` ni la mención de B-09
  en `CLAUDE.md`/`docs/BACKLOG.md` (las gestiona el usuario / `gestor-backlog`).
