# Spec — Avisos de presupuesto también al editar un gasto (ampliación de la fase A y B)

Estado: **VALIDADA por Terry el 2026-10-07.**

Amplía `specs/alertas-presupuesto.md` (toast) y `specs/alertas-presupuesto-email.md` (email). Esas specs dejaban la edición fuera de alcance; Terry decidió el 2026-10-07 incluirla de forma completa.

## 1. Objetivo

Que **editar** un gasto avise igual que crearlo: toast y email si la edición hace que el presupuesto de su categoría cruce el umbral o el límite. Ejemplo que lo motivó: subir un gasto de 100 € a 310 € no avisaba.

## 2. Regla central: avisar por el aumento neto

Una edición solo puede avisar si **aumenta** lo gastado en el presupuesto de la categoría resultante, en el mes en curso. Se calcula la contribución del gasto antes y después de editarlo:

|         | Cuenta en el presupuesto de la categoría **nueva** si…                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Después | es un gasto (`expense`) y su fecha cae en el mes en curso → importe en moneda base; si no, 0                       |
| Antes   | era un gasto, **era de esa misma categoría** y su fecha caía en el mes en curso → importe en moneda base; si no, 0 |

`aumento = después − antes`. Si `aumento <= 0`, no hay aviso. Si es positivo, se reutiliza `detectBudgetAlert` con `addedAmount = aumento` y `spentAfter` leído tras guardar (misma lógica de cruce que al crear: solo avisa si **cruza** un nivel).

Casos resultantes:

| Edición                                                                             | Resultado                                                                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Subir el importe (100 → 310 €) en la misma categoría                                | Aviso por el aumento (+210 €) si cruza                                                                                           |
| Bajar el importe, o no cambiarlo                                                    | Sin aviso                                                                                                                        |
| Cambiar de categoría                                                                | El gasto entero (importe nuevo) cuenta en la categoría nueva → aviso si cruza. La categoría antigua solo pierde gasto: sin aviso |
| Cambiar la fecha de otro mes al mes en curso                                        | Cuenta entero en el mes en curso → aviso si cruza                                                                                |
| Cambiar la fecha del mes en curso a otro mes, o a otro tipo de movimiento (ingreso) | Pierde contribución: sin aviso                                                                                                   |
| Convertir un ingreso en gasto                                                       | Cuenta entero → aviso si cruza                                                                                                   |
| Editar solo la descripción                                                          | Sin aviso                                                                                                                        |

## 3. Comportamiento de toast y email

- **Toast:** se muestra siempre que la edición cruza un nivel. No tiene memoria: si Terry sube, baja y vuelve a subir el gasto cruzando el mismo nivel, el toast sale cada vez.
- **Email:** se aplica la reserva ya definida, `(usuario, presupuesto, mes, nivel)`: como mucho **un email por nivel y mes**, se cree o se edite. Editar arriba y abajo no manda correos repetidos.
- Mismas condiciones de envío (interruptor `notify_email`, no demo, con email) y mismo contenido.
- El cálculo es **secundario**, como en la creación: si falla, la edición ya está guardada, se devuelve el éxito y no hay aviso.

## 4. Diseño

### 4.1 Sin cambios en base de datos

Se reutilizan `get_budget_progress` y la tabla `budget_alert_emails`. No hay migración.

### 4.2 Datos del "antes"

`updateTransaction` lee la fila **antes** de actualizar (categoría, tipo, fecha, importe original y moneda). La moneda no cambia con la edición (el `update` actual no toca `currency_original`), así que la moneda del "antes" y del "después" es la misma. RLS asegura que solo se lee un gasto propio.

### 4.3 Tasas

El importe del "antes" y del "después" se convierte con las **mismas tasas actuales** que usa la RPC (`buildRateMap`), para que `spentAfter − aumento` sea coherente con el gastado devuelto. La moneda del gasto se añade explícitamente a la lista de monedas del mapa, por si tras guardar ya no la usa ningún otro movimiento.

### 4.4 Capas

| Archivo                                                   | Cambio                                                                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/budget-alerts.ts`                                | Nueva función pura `computeBudgetIncrease({ before, after, categoryId, currentMonth, rate })` que implementa la tabla de la sección 2; `detectBudgetAlert` no cambia |
| `src/lib/data/budget-alerts.ts`                           | `getBudgetAlertForExpense` pasa a aceptar el estado "antes" opcional y a usar `computeBudgetIncrease` (la creación es el caso con `before = null`)                   |
| `src/app/(app)/movimientos/actions.ts`                    | `updateTransaction` lee el "antes", guarda, calcula el aviso, lo devuelve en `budgetAlert` y encola el email con la misma `queueBudgetAlertEmail`                    |
| `src/components/transactions/edit-transaction-dialog.tsx` | Muestra `toast.warning` con el aviso, igual que el diálogo de creación                                                                                               |

### 4.5 Fuera de alcance

Importación de extractos, movimientos recurrentes, borrados (solo reducen), avisos al crear o editar un presupuesto cuando la categoría ya está por encima, y cambiar la moneda de un gasto (la edición actual no la permite).

## 5. Tareas atómicas (tras validar la spec)

1. `computeBudgetIncrease` + tests: subida, bajada, sin cambio, cambio de categoría, fecha de otro mes al actual y del actual a otro, gasto ↔ ingreso, mes distinto en ambos lados, importes con decimales.
2. Adaptar `getBudgetAlertForExpense` (creación y edición con la misma lógica) sin romper los tests ni el comportamiento de la creación.
3. `updateTransaction`: leer el "antes", calcular y devolver el aviso, encolar el email.
4. Toast en `edit-transaction-dialog.tsx`.
5. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
6. Terry prueba: subir un gasto hasta cruzar el umbral y luego el límite (email cada vez), bajarlo (sin aviso), cambiarlo de categoría (aviso en la nueva) y repetir la subida (toast sí, email no).

## 6. Documentos del Project a actualizar tras validar

Esta spec y `casos-qa-2026-10.md` (los casos de la tarea 6).
