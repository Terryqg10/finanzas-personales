# Spec — Categorías sugeridas al importar un extracto

Estado: **VALIDADA por Terry el 2026-10-12.**

Amplía `specs/importacion-extractos.md`, que dejó las "reglas automáticas por comercio" como fase posterior.

## 1. Objetivo

Hoy todo lo importado entra como "Otros" (gastos) o "Ingresos" (ingresos) y Terry debe cambiar la categoría fila a fila. Con esta función, la vista previa **preselecciona la categoría que ya usaste** para ese mismo comercio, de modo que cada importación pide menos correcciones que la anterior. Terry sigue viendo y pudiendo cambiar todo antes de confirmar.

## 2. Enfoque: aprender del propio historial (sin reglas que gestionar)

La app ya guarda, en cada movimiento, su descripción y su categoría. En lugar de crear un sistema aparte de reglas, la sugerencia sale de ese historial:

- Para cada fila del extracto se busca en los movimientos del usuario los que tienen **el mismo concepto y el mismo tipo** (gasto o ingreso).
- Se sugiere la categoría **más usada** en esos movimientos; si hay empate, la del **más reciente**.
- Si no hay coincidencias, se mantiene el comportamiento actual ("Otros" o "Ingresos").

Así la función **aprende sola**: cada importación confirmada deja movimientos con las categorías elegidas, y esos pasan a ser la fuente de la siguiente sugerencia. Corregir la categoría de un movimiento ya existente (editándolo) también la mejora.

### Alternativa descartada (por ahora)

Una tabla de **reglas explícitas** (por ejemplo "contiene KLARNA → Compras") gestionada desde Configuración. Da más control (patrones parciales, ordenación de reglas) pero exige migración, pantalla de gestión y más casos que probar. Se puede añadir más adelante encima de esta base si el historial no basta.

## 3. Reglas

- **Coincidencia exacta** del concepto tras normalizarlo (minúsculas, sin tildes, espacios colapsados: la misma `normalizeConcept` de la importación) **y** mismo tipo. No se mezclan tipos: un gasto nunca recibe la categoría "Ingresos" por llamarse igual que un ingreso.
- Los conceptos del extracto de cuenta vienen truncados a 17 caracteres; como llegan siempre truncados igual, el mismo comercio coincide consigo mismo entre importaciones.
- Es **solo una sugerencia**: se preselecciona en el desplegable de cada fila, que sigue editable. Nada se guarda sin que Terry confirme.
- Se marca visualmente como sugerida solo cuando **difiere** de la categoría por defecto (si la sugerencia es "Otros", no aporta información y no se señala).
- Las filas ya importadas y las transferencias internas conservan su comportamiento actual (desmarcadas); también reciben sugerencia por si Terry las marca.
- La categoría sugerida siempre existe y es visible para el usuario: sale de sus propios movimientos (clave foránea `RESTRICT` y RLS).
- Si la consulta del historial falla, se descarta en silencio y la vista previa sale con las categorías por defecto: es una ayuda, no debe impedir importar.

## 4. Diseño

### 4.1 Sin cambios en base de datos

Se lee la tabla `transactions` existente con el cliente del usuario (RLS). No hay migración, ni tabla nueva, ni variables de entorno.

### 4.2 Capas

| Archivo                                         | Cambio                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/import/suggest-categories.ts`          | Función pura `suggestCategories(history, rows)`: agrupa el historial por (concepto normalizado, tipo), elige la categoría más frecuente con desempate por la más reciente y devuelve la sugerencia de cada fila           |
| `src/lib/data/imported-transactions.ts`         | `getCategoryHistory(supabase)`: lee `description`, `type`, `category_id` y `date` de los últimos 5000 movimientos del usuario, paginado como `getExistingImportKeys`                                                      |
| `src/lib/validations/import.ts`                 | `ImportPreviewRow` gana `suggestedCategoryId: string \| null`                                                                                                                                                             |
| `src/app/(app)/movimientos/importar/actions.ts` | `previewImport` calcula las sugerencias (tolerante a fallos) y las incluye en cada fila                                                                                                                                   |
| `src/components/import/import-flow.tsx`         | La categoría inicial de cada fila es `suggestedCategoryId` si existe; si no, la de por defecto. Etiqueta "Sugerida por tu historial" cuando difiere de la de por defecto, y en el resumen cuántas filas llevan sugerencia |

La confirmación (`confirmImport`) **no cambia**: sigue recibiendo la categoría elegida por fila y comprobando que sea visible para el usuario.

### 4.3 Límite

Se lee un máximo de **5000 movimientos recientes** del historial para acotar el coste; para un uso personal cubre años de datos.

## 5. Expectativas

Los movimientos importados hasta hoy están casi todos en "Otros", así que **al principio las sugerencias coincidirán con las de por defecto**. La mejora llega según Terry recategorice: al cambiar la categoría de un comercio en una importación (o editando un movimiento), la siguiente vez ese comercio aparece ya con su categoría. Para acelerarlo se puede recategorizar a mano la primera vez los comercios más repetidos.

## 6. Tareas atómicas (tras validar la spec)

1. `suggestCategories` + tests: más frecuente, desempate por reciente, tipos separados, normalización (tildes, mayúsculas, espacios), sin historial, concepto sin coincidencia, empate total.
2. `getCategoryHistory` (paginado, límite de 5000).
3. `previewImport` con las sugerencias y `ImportPreviewRow.suggestedCategoryId`.
4. Vista previa: categoría inicial sugerida, etiqueta y resumen.
5. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
6. Terry prueba: recategorizar un comercio en una importación, importar, y comprobar que en la siguiente importación aparece preseleccionado y etiquetado.

## 7. Fuera de alcance

Reglas por patrón parcial o editables, pantalla de gestión de reglas, recategorizar movimientos ya importados en bloque, coincidencias aproximadas entre conceptos parecidos, y sugerir categoría al crear un movimiento a mano.

## 8. Documentos del Project a actualizar tras validar

Esta spec y el archivo de QA (casos: sugerencia por frecuencia, desempate, comercio nuevo sin sugerencia, gasto frente a ingreso con el mismo nombre, fallo del historial, etiqueta solo si difiere de la categoría por defecto).
