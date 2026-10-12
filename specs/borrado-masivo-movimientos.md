# Spec — Borrado masivo de movimientos (selección múltiple y por rango de fechas)

Estado: **VALIDADA por Terry el 2026-10-12**, con las decisiones de la sección 5.

## 1. Objetivo

Hoy los movimientos se borran de uno en uno. Se añaden dos formas de borrar varios a la vez:

1. **Selección múltiple:** marcar varios movimientos de la lista y borrarlos juntos.
2. **Borrado por fechas:** elegir "desde" y "hasta" y borrar todos los movimientos de ese periodo. Caso típico: borrar un periodo importado para volver a importarlo.

Es una acción **destructiva e irreversible** (no hay papelera), así que en ambos casos se ofrece, sin obligar, **descargar una copia** de lo que se va a borrar.

## 2. Comportamiento

### 2.1 Selección múltiple

- Un botón **Seleccionar** sobre la lista activa el modo selección: aparece una casilla en cada fila y desaparecen los botones de editar y borrar individuales.
- Una barra de acciones muestra "**N seleccionados**", **Seleccionar los de esta página**, **Cancelar** y **Borrar**. En móvil se coloca **por encima de la barra de navegación flotante**.
- **Borrar** abre un diálogo de confirmación con el número exacto: "Vas a borrar N movimientos. Esta acción no se puede deshacer." Incluye el botón opcional **Descargar copia** y el botón rojo **Borrar N movimientos**.
- La selección es **de la página visible**: al cambiar de página, aplicar un filtro o cancelar, se vacía (evita borrar sin querer filas que ya no se ven).
- Máximo **500** movimientos por borrado.

### 2.2 Borrado por fechas

- Un botón **Borrar por fechas** abre un diálogo en **dos pasos**:
  1. **Elegir el periodo:** "Desde" y "Hasta" (obligatorios; "desde" no puede ser posterior a "hasta"). Se precargan con las fechas del filtro activo, si las hay. Una casilla **"Solo los importados desde un extracto"** limita el borrado a los movimientos con origen `imported` (apagada por defecto).
  2. **Confirmar:** muestra "Se borrarán **N** movimientos entre {desde} y {hasta}", el botón opcional **Descargar copia** y el botón rojo **Borrar N movimientos**. Un solo botón de confirmar, sin palabra de seguridad.
- Si el periodo no contiene movimientos, se avisa y no se ofrece borrar.

### 2.3 Descargar copia (opcional)

- Nunca es obligatoria: se puede borrar sin descargar.
- Genera un **CSV** con `;` como separador y UTF-8 con BOM (Excel en español lo abre bien), con las columnas **Fecha** (`aaaa-mm-dd`), **Concepto**, **Categoría**, **Tipo** (`Ingreso` o `Gasto`), **Importe**, **Moneda** y **Origen** (`manual`, `importado` o `recurrente`). El importe va con coma decimal y en la moneda original del movimiento.
- Protección contra "inyección de fórmulas": un concepto que empiece por `=`, `+`, `-` o `@` se guarda precedido de un apóstrofe, para que Excel no lo ejecute como fórmula.
- En la **selección** se genera en el propio navegador con las filas que ya están en pantalla; en el **borrado por fechas** lo genera el servidor con el mismo periodo y la misma casilla de importados.

### 2.4 Común

- Tras borrar: mensaje con el número borrado, la lista se actualiza y el Dashboard se refresca. Si la selección dejó la página vacía, se vuelve a la primera.
- Los movimientos importados que se borran **vuelven a poder importarse** (su clave de importación desaparece con ellos).
- Los avisos de presupuesto ya enviados no se afectan; los presupuestos se recalculan solos al consultar.
- Los usuarios de la demo pueden borrar sus propios datos de ejemplo (la demo se limpia sola).

## 3. Diseño

### 3.1 Sin cambios en base de datos

`DELETE` y `SELECT` sobre `transactions` con el cliente del usuario; RLS (`transactions_owner_policy`) garantiza que solo se toca lo propio. No hay migración, tabla nueva ni variables.

### 3.2 Servidor

| Pieza                               | Entrada                       | Resultado                                                                                                               |
| ----------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Acción `deleteTransactions`         | lista de `id` (UUID, 1 a 500) | `DELETE ... WHERE id IN (...)`; devuelve cuántos se borraron                                                            |
| Acción `countTransactionsInRange`   | `from`, `to`, `onlyImported`  | Solo cuenta (`count: 'exact'`, sin traer filas) para el paso de confirmación                                            |
| Acción `deleteTransactionsInRange`  | `from`, `to`, `onlyImported`  | **Revalida en servidor** el rango (fechas válidas y ordenadas) y hace un único `DELETE` por rango; devuelve el recuento |
| Ruta `GET /api/transactions/export` | `from`, `to`, `onlyImported`  | Valida sesión y rango, lee los movimientos con su categoría (paginado) y devuelve el CSV como descarga                  |

- Un único `DELETE` por operación: o se borra todo o nada.
- Errores tipados y manejados; un fallo devuelve un mensaje claro sin borrar nada.
- El CSV de rango se lee paginado (PostgREST limita las filas por respuesta) con un tope de **20 000** filas por descarga; si se superara, se avisa y no se descarga a medias.

### 3.3 Capas

| Archivo                                                  | Responsabilidad                                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/validations/transaction-bulk.ts`                | Esquemas Zod: lista de ids (1–500) y rango de fechas ordenado; tipos de estado; con tests                             |
| `src/lib/export/transactions-csv.ts`                     | Función pura `buildTransactionsCsv(rows)`: cabecera, escape, apóstrofe contra fórmulas, BOM y coma decimal; con tests |
| `src/app/(app)/movimientos/actions.ts`                   | Las tres acciones nuevas                                                                                              |
| `src/app/api/transactions/export/route.ts`               | Descarga del CSV por rango                                                                                            |
| `src/components/transactions/transactions-list.tsx`      | Modo selección, casillas y barra de acciones; actualización optimista del lote                                        |
| `src/components/transactions/delete-selected-dialog.tsx` | Confirmación del borrado de la selección, con copia opcional                                                          |
| `src/components/transactions/delete-range-dialog.tsx`    | Diálogo de dos pasos del borrado por fechas, con copia opcional                                                       |
| `src/app/(app)/movimientos/page.tsx`                     | Coloca el botón **Borrar por fechas** y le pasa las fechas del filtro activo                                          |

La lista sigue siendo un Client Component (estado de selección y optimista); las acciones, de servidor. UI con tokens semánticos, rosa para lo destructivo, modo claro y oscuro.

## 4. Tareas atómicas

1. `transaction-bulk.ts` + tests: ids vacíos, repetidos, más de 500, no UUID; rango invertido o incompleto.
2. `transactions-csv.ts` + tests: cabecera y columnas, importes con coma decimal, escape de `;`, comillas y saltos de línea, apóstrofe ante `=`, `+`, `-`, `@`, BOM, y lista vacía.
3. Acciones de servidor y ruta de exportación.
4. Selección múltiple en la lista (modo, casillas, barra de acciones, diálogo con copia opcional, optimista).
5. Diálogo de borrado por fechas en dos pasos con copia opcional.
6. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
7. Terry prueba: borrar 2 o 3 movimientos seleccionados descargando antes la copia; borrar un periodo con la casilla de importados; comprobar el periodo vacío; borrar un periodo importado y reimportarlo; abrir el CSV en Excel.

## 5. Decisiones de Terry (2026-10-12)

- **Confirmación:** un botón de confirmar basta; no hace falta escribir una palabra.
- **Casilla "solo importados":** sí, apagada por defecto.
- **Copia de seguridad:** opción de **exportar antes de borrar**, nunca obligatoria.
- **Sin papelera ni "deshacer".**

## 6. Fuera de alcance

Papelera o deshacer, borrar según los demás filtros (categoría, tipo, importe), seleccionar entre páginas, borrado programado, exportación general desde otras pantallas y reimportar el CSV de copia.

## 7. Documentos del Project a actualizar

Esta spec y el archivo de QA (casos: seleccionar varios, borrar la selección, la selección se vacía al cambiar de página o filtro, rango con la casilla de importados, periodo vacío, copia opcional en ambos diálogos y su contenido en Excel, reimportar tras borrar, y que el Dashboard se actualiza).
