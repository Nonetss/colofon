## Context

Las pantallas de plugins, sesiones, organizaciones y equipos llegaron con la plantilla `stack`. El usuario ha pedido quitarlas del panel de administración conservando la lógica del backend.

## Goals / Non-Goals

**Goals:**

- Que `/admin` solo ofrezca usuarios, API keys y contenido.
- Que las specs describan lo que existe: las lecturas y operaciones de la API siguen especificadas, las páginas no.

**Non-Goals:**

- Quitar procedimientos, plugins de Better Auth, tablas o migraciones.
- Cambiar los componentes compartidos de tabla: siguen soportando columnas ocultas por defecto, filas expandibles y tablas sin layout compacto aunque hoy ninguna pantalla use alguna de esas opciones.

## Decisions

- **Borrar las slices enteras, no ocultarlas.** Mantener código sin ruta ni consumidores es código muerto; si vuelve a hacer falta una pantalla se recupera desde el historial de git.
- **Los requisitos de API se mantienen y se reescriben sin la página.** `Plugin visibility` y `Administrative session history` mezclaban la lectura y su página; se quedan con la lectura, que sigue en el router `v1`.
- **Los requisitos de componentes genéricos se mantienen con ejemplos neutros.** Las columnas ocultas por defecto y las tablas en un sheet siguen siendo capacidades de `DataTableView`; sus escenarios dejan de nombrar pantallas eliminadas.

## Risks / Trade-offs

- [Los procedimientos de organizaciones, equipos, sesiones y plugins quedan sin consumidor en el frontend] → Siguen documentados en `/scalar` y cubiertos por sus tests, y se pueden llamar desde la API.
