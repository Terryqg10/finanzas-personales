# Spec — Doble toque en la barra inferior: volver al inicio de la página

Estado: **VALIDADA por Terry el 2026-10-08.**

## 1. Objetivo

En el móvil, al **tocar dos veces seguidas** cualquier icono de la barra de navegación flotante inferior, la página hace scroll suave hasta arriba. Es el gesto habitual de las apps móviles y evita arrastrar el dedo por listas largas (Movimientos, Presupuestos…).

## 2. Comportamiento

| Doble toque en…                       | Resultado                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| El icono de la página en la que estás | Scroll suave hasta el principio de la página                                        |
| El icono de otra página               | Se navega a esa página (el primer toque ya lo hace) y se queda al principio de ella |

- Un **toque simple** no cambia: sigue navegando como hasta ahora.
- La barra solo existe en móvil (`md:hidden`); el menú lateral de escritorio **no cambia**.
- El segundo toque no dispara una segunda navegación: se cancela la acción por defecto del enlace y solo se hace el scroll.
- Con la preferencia del sistema "reducir movimiento" activada, el scroll es **instantáneo** en lugar de suave.

## 3. Diseño

- La página hace scroll sobre la ventana (el layout no tiene contenedor interno con `overflow`), así que basta `window.scrollTo({ top: 0 })`.
- El doble toque se detecta con la **marca de tiempo** de los dos últimos clics (menos de 300 ms entre ambos). Se descartó `event.detail >= 2`: en Safari de iPhone no es fiable para toques. Tras un doble toque se reinicia la marca, así que un tercer toque seguido empieza de nuevo.
- Se añade `touch-action: manipulation` (clase `touch-manipulation`) a los iconos para que iOS no interprete el doble toque como zoom y no retrase el primer toque.
- Es un Client Component (ya lo es `AppBottomNav`: usa `usePathname`).

| Archivo                             | Cambio                                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/scroll.ts`                 | Funciones puras `isDoubleTap(anterior, ahora)` y `getScrollBehavior(prefersReducedMotion)`, con tests                                          |
| `src/components/app-bottom-nav.tsx` | `onClick` en cada icono: si es doble toque, `preventDefault()` y `window.scrollTo` con el comportamiento calculado; clase `touch-manipulation` |

Sin cambios en base de datos, rutas ni dependencias.

## 4. Tareas atómicas (tras validar la spec)

1. `src/lib/scroll.ts` + tests.
2. Doble toque y `touch-manipulation` en `app-bottom-nav.tsx`.
3. Verificación: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
4. Terry prueba en el móvil: doble toque en el icono de la página actual (desde mitad de una lista larga), doble toque en el icono de otra página, toque simple normal y que el menú de escritorio no cambie.

## 5. Fuera de alcance

Toque simple sobre el icono activo para volver arriba, gestos en el menú lateral de escritorio, y recordar la posición de scroll al volver a una página.

## 6. Documentos del Project a actualizar tras validar

Esta spec y el archivo de QA (casos: doble toque en la página actual, en otra página, toque simple, reducir movimiento, escritorio sin cambios).
