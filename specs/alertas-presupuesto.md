# Spec — Aviso de presupuesto al registrar un gasto (alertas, fase A)

Estado: **VALIDADA por Terry el 2026-10-06.**

## 1. Objetivo

Hoy los presupuestos se evalúan de forma pasiva: Presupuestos y el Dashboard muestran la barra en ámbar o rojo y un mensaje cuando una categoría supera su umbral o su límite (`BudgetsList`, `BudgetsSection`). Falta el aviso **en el momento** en que un gasto hace cruzar ese umbral. Esta fase añade ese aviso dentro de la app, sin servicios externos. El email (necesita dominio propio en Resend) y el push (necesita convertir la web en app instalable) quedan para fases posteriores.

## 2. Qué se considera un aviso

Al registrar un **gasto** nuevo, tras guardarlo, se avisa solo si ese gasto **hace cruzar** un nivel, nunca por estar ya por encima:

| Nivel       | Condición                                                       | Mensaje                                                         |
| ----------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `limit`     | gastado antes < límite y gastado después >= límite              | "Has superado el límite mensual de {categoría}."                |
| `threshold` | gastado antes < umbral y gastado después >= umbral (y < límite) | "Vas por el {n} % de tu límite de {categoría} (umbral: {u} %)." |

- Si un mismo gasto cruza el umbral y el límite a la vez, se avisa solo del límite (el más grave).
- Un gasto que ya encuentra la categoría por encima del umbral o del límite no genera aviso repetido.
- Solo cuenta la categoría del gasto, si tiene presupuesto, y solo si la fecha del gasto cae en el **mes en curso** (el presupuesto se evalúa siempre contra el mes en curso).
- Los ingresos y los gastos sin presupuesto no generan aviso.
- Comparación en la moneda base del usuario, con la misma conversión al vuelo que el Dashboard (`getBudgetProgress` con `rates`).

## 3. Diseño

### 3.1 Sin cambios en base de datos

Se reutiliza la RPC `get_budget_progress`. No hay migración, ni tabla nueva, ni RLS nueva.

### 3.2 Cálculo del "antes" sin una segunda consulta

`getBudgetProgress` devuelve el gastado **tras** guardar el gasto. El "antes" se obtiene restando el importe del gasto convertido a moneda base (importe × tasa, que la acción ya calcula para guardarlo). Una sola llamada a la RPC.

### 3.3 Capas

| Archivo                                                     | Tipo             | Responsabilidad                                                                                                                                                 |
| ----------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/budget-alerts.ts`                                  | Función pura     | `detectBudgetAlert({ spentAfter, addedAmount, monthlyLimit, alertThreshold, categoryName })` devuelve `null` o `{ level, categoryName, percentage, threshold }` |
| `src/lib/validations/transaction.ts`                        | Tipos            | `TransactionActionState` gana el campo opcional `budgetAlert`                                                                                                   |
| `src/app/(app)/movimientos/actions.ts`                      | Server Action    | En `createTransaction`, tras insertar un gasto, calcula el aviso y lo devuelve en el estado                                                                     |
| `src/components/transactions/create-transaction-dialog.tsx` | Client Component | Muestra un `toast.warning` con el mensaje del aviso, además del "Movimiento registrado"                                                                         |

### 3.4 Errores

El cálculo del aviso es **secundario**: si falla (RPC, tasas), el gasto ya está guardado y se devuelve el éxito normal sin aviso. Un fallo aquí nunca debe convertir un gasto guardado en un error.

### 3.5 Modo demo

Funciona igual (los datos de la demo incluyen presupuestos). No requiere tratamiento especial.

### 3.6 UI

Toast de `sonner` en tono de aviso, mismo patrón que el resto de la app. Sin colores fosforescentes; ámbar para el umbral y rosa/destructivo para el límite, como las barras actuales. Modo claro y oscuro.

## 4. Tareas atómicas (tras validar la spec)

1. `src/lib/budget-alerts.ts` + tests: cruce de umbral, cruce de límite, ambos a la vez (gana el límite), ya por encima (sin aviso), por debajo (sin aviso), importe exacto en el umbral, límite cero.
2. Ampliar `TransactionActionState` y `createTransaction` con el cálculo del aviso (tolerante a fallos).
3. Mostrar el aviso en `create-transaction-dialog.tsx`.
4. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`; prueba manual de Terry (crear un gasto que cruce el umbral, otro que cruce el límite, y uno que no cruce nada).

## 5. Fuera de alcance

- Aviso al **editar** un gasto o al registrar movimientos recurrentes.
- Aviso tras **importar un extracto** (lote histórico; los indicadores permanentes siguen mostrando el estado).
- Email, push y avisos con la app cerrada.
- Cambiar los textos o colores de los indicadores permanentes existentes.

## 6. Documentos del Project a actualizar tras validar

Spec de esta función y `qa/checklist-control-calidad.md` (casos: cruce de umbral, cruce de límite, gasto que no cruza, ingreso, categoría sin presupuesto, gasto de un mes pasado).
