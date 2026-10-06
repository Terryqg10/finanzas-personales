# Spec — Importación de extractos bancarios (CSV de Imagin)

Estado: **VALIDADA por Terry el 2026-10-06.**

## 1. Objetivo

Permitir subir el extracto de movimientos descargado de Imagin (la app lo llama "Excel", pero el archivo es un CSV) y crear los movimientos sin teclearlos, sin duplicar si se importa dos veces el mismo periodo. Es el "puente bancario" de la v1 (HANDOFF, Tarea 4); la conexión directa con el banco es la Fase 2 y queda fuera.

## 2. Formato de entrada (verificado con dos extractos reales de 2026-10-05)

Imagin ofrece dos descargas distintas; **solo se soporta el extracto de cuenta** (ver sección 3).

```
Concepto;Fecha;Importe;Saldo
NOMINA;30/09/2026;1.390,10EUR;1.413,83EUR
CARREF MAJADAHOND;05/10/2026;-5,50EUR;3,60EUR
```

| Campo           | Regla de lectura                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separador       | `;`                                                                                                                                                                                               |
| Cabecera        | Debe ser exactamente `Concepto;Fecha;Importe;Saldo`. Si es la del extracto de tarjetas (`Concepto;Tarjeta;Fecha;Importe`) se rechaza con un mensaje que explica cuál descargar                    |
| Fecha           | `dd/mm/aaaa` → `aaaa-mm-dd`; se valida que sea una fecha real                                                                                                                                     |
| Importe y Saldo | Coma decimal, punto de millares (`1.078,69EUR`) y sufijo de divisa pegado. Se extrae signo, valor y código de 3 letras                                                                            |
| Signo           | Negativo → `expense`; positivo → `income` (confirmado: nómina y Bizum recibidos vienen en positivo). `amount_original` se guarda en valor absoluto (el esquema exige `> 0`); importe 0 se rechaza |
| Concepto        | Viene **truncado a 17 caracteres** por el banco; se guarda tal cual                                                                                                                               |
| Líneas vacías   | Se ignoran                                                                                                                                                                                        |

El extracto de tarjetas usa conceptos completos y otros textos para el mismo cargo (p. ej. `PAGOS AGENCIA TRIBUTARIA` frente a `Pagos A.E.A.T`), así que **no se puede casar con el de cuenta**: mezclar ambos duplicaría movimientos. Por eso solo se admite uno.

## 3. Decisiones de Terry

1. **Duplicados:** clave de importación = fecha + concepto normalizado + importe + **saldo posterior** (la columna `Saldo` hace única cada fila; solo si dos filas coinciden también en saldo se añade un número de orden). Al reimportar se saltan los ya existentes y siempre hay vista previa.
2. **Categorías:** todo entra en la categoría global "Otros" (gastos) o "Ingresos" (ingresos); en la vista previa Terry puede cambiar la categoría de cada fila antes de confirmar. Sin reglas automáticas por comercio (fase posterior).
3. **Origen y Klarna:** se soporta únicamente el extracto de cuenta; el de tarjetas se rechaza. Los cargos de Klarna no reciben tratamiento especial.
4. **Transferencias internas (decidido por Terry el 2026-10-05):** el extracto incluye movimientos entre tus propios fondos (`TRANSFER.HUCHA DIGI`, `Aportación a una…`) que no son gasto ni ingreso reales y falsearían el Dashboard. Recomendación: en la vista previa las filas cuyo concepto empiece por `TRANSFER.HUCHA` o `Aportación a` salen **desmarcadas** con la etiqueta "posible transferencia interna"; Terry puede marcarlas si quiere. Es una lista fija en código, no un sistema de reglas.

## 4. Diseño

### 4.1 Base de datos (migración `0028`, SQL que Terry pega en el SQL Editor)

- `ALTER TABLE public.transactions ADD COLUMN import_key text;`
- `CREATE UNIQUE INDEX transactions_user_import_key_unique ON public.transactions (user_id, import_key) WHERE import_key IS NOT NULL;`
- RLS: no cambia; `transactions_owner_policy` ya cubre la columna nueva.
- Actualizar `src/types/supabase.ts` a mano en el mismo cambio y el snapshot `0027` no se toca (es histórico; la 0028 queda como migración propia).
- Los movimientos manuales y recurrentes tienen `import_key` NULL y no se ven afectados.

### 4.2 Capas (lógica separada de la UI)

| Archivo                                         | Tipo                  | Responsabilidad                                                                                                  |
| ----------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/lib/import/imagin-csv.ts`                  | Función pura, sin I/O | Parsear el texto a filas tipadas (`ParsedRow`) y errores por línea                                               |
| `src/lib/import/import-key.ts`                  | Función pura          | Normalizar concepto y generar `import_key` (con orden solo para filas totalmente idénticas)                      |
| `src/lib/validations/import.ts`                 | Zod                   | Esquema de la petición (límites de tamaño y filas)                                                               |
| `src/app/(app)/movimientos/importar/actions.ts` | Server Actions        | `previewImport` y `confirmImport`                                                                                |
| `src/app/(app)/movimientos/importar/page.tsx`   | Server Component      | Carga categorías del usuario y renderiza el cliente                                                              |
| `src/components/import/import-flow.tsx`         | Client Component      | Subida del archivo, vista previa, selector de categoría por fila y confirmación (necesita estado y `FileReader`) |

### 4.3 Flujo (sin estado en servidor)

1. El cliente lee el archivo como texto (UTF-8) y llama a `previewImport(texto)`.
2. El servidor parsea, calcula las `import_key`, consulta cuáles existen ya para ese usuario y devuelve filas con estado `nueva` / `ya importada` / `con error`.
3. El cliente muestra la tabla; el usuario ajusta categorías. Las filas `ya importada` salen desmarcadas y deshabilitadas.
4. `confirmImport(texto, categoríaPorFila)` **vuelve a parsear y a calcular claves en servidor** (no se confía en nada que venga del cliente), obtiene la tasa con `getExchangeRate` si la divisa del extracto difiere de la base del usuario (tasa 1 si coincide) e inserta en lote con `source = 'imported'`.
5. Si dos importaciones concurrentes chocan, el índice único lo rechaza: la acción trata el error `23505` como "ya importada", no como fallo.

### 4.4 Límites y errores

- Máximo 1 MB y 500 filas por archivo.
- Errores por línea (fecha inválida, importe ilegible) se muestran en la vista previa y no bloquean el resto.
- Fallo de red al obtener la tasa: se informa y no se inserta nada (inserción atómica por lote).
- Modo demo: la importación queda **deshabilitada** para usuarios anónimos.
- UI: tokens semánticos, tarjetas `bg-card rounded-2xl p-6 shadow-sm`, importes en `font-sans`, gasto `rose-500`, ingreso `emerald-600`, modo claro y oscuro.

## 5. Tareas atómicas (tras validar la spec)

1. Migración `0028` + actualizar `src/types/supabase.ts`. Terry ejecuta el SQL y `migration repair`.
2. `imagin-csv.ts` + tests con datos **inventados** (nunca con extractos reales en el repo).
3. `import-key.ts` + tests (filas idénticas, normalización, estabilidad al reimportar, importes con punto de millares).
4. Validación Zod y Server Actions `previewImport` / `confirmImport`.
5. UI de importación y enlace desde Movimientos.
6. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`; prueba manual con un extracto real por Terry (importar, reimportar y comprobar que no duplica).

## 6. Fuera de alcance

Reglas automáticas de categoría, otros bancos, guardar la tarjeta, tratamiento especial de Klarna y conexión bancaria (Fase 2).

## 7. Documentos del Project a actualizar tras validar

Spec de esta función y `qa/checklist-control-calidad.md` (casos: reimportar, fila inválida, divisa distinta de la base, demo bloqueada).
