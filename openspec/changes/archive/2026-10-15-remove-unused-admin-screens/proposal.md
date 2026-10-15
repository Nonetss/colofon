## Why

El panel de administración traía de la plantilla `stack` las pantallas de plugins, sesiones, organizaciones y equipos, que el producto no usa. Se quitan del frontend para que `/admin` muestre solo lo que se gestiona de verdad (usuarios, API keys y contenido), sin tocar la lógica del backend: los procedimientos, los plugins de Better Auth y el schema siguen disponibles por si vuelven a hacer falta.

## What Changes

- Se eliminan las páginas `/admin/plugins`, `/admin/sessions`, `/admin/organizations` y `/admin/teams`, sus slices `features/admin/{plugins,sessions,organizations,teams}` y sus superficies en `app-surfaces.ts`, con lo que desaparecen de la navegación y del resumen de `/admin`.
- Se mantienen sin cambios los procedimientos `v1.plugins.list`, `v1.sessionHistory.list` y `v1.organization.*`, los plugins `admin()` y `organization()` de Better Auth y el schema.
- Las specs que describían esas pantallas pasan a describir solo los procedimientos, y las que las citaban como ejemplo pasan a citar listas que siguen existiendo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `admin`: la visibilidad de plugins y el historial de sesiones quedan como lecturas de la API sin página; el ejemplo de búsqueda de usuarios deja de citar el historial de sesiones.
- `organization-management`: se eliminan los requisitos de las páginas de organizaciones y equipos y del selector de roles; la gestión queda en los procedimientos de administración.
- `frontend-data-table`: las listas que se renderizan como tabla y los ejemplos de ordenación, preferencias, columnas ocultas por defecto y tablas en un sheet dejan de citar las pantallas eliminadas.
- `list-filter-experience`: `/admin/sessions` deja de figurar entre las listas que filtran desde las cabeceras.
- `frontend-component-system`: el escenario de migración de páginas de administración deja de citar organizaciones, equipos, sesiones y plugins.

## Impact

- Código: `apps/frontend/src/features/admin/{plugins,sessions,organizations,teams}/`, `apps/frontend/src/pages/admin/{plugins,sessions,organizations,teams}/` y `apps/frontend/src/lib/app-surfaces.ts` (ya aplicado).
- API, base de datos, auth, gateway y Docker: ninguno.
- Documentación: `DESIGN.md`, `docs/human/` y la referencia `feature-structure.md` de la skill `stack` dejan de citar esas pantallas (ya aplicado).
