## 1. Frontend

- [x] 1.1 Borrar `apps/frontend/src/features/admin/{plugins,sessions,organizations,teams}/` y `apps/frontend/src/pages/admin/{plugins,sessions,organizations,teams}/`
- [x] 1.2 Quitar las superficies `admin-plugins`, `admin-sessions`, `admin-organizations` y `admin-teams` de `app-surfaces.ts`

## 2. Documentación

- [x] 2.1 Dejar de citar esas pantallas en `DESIGN.md`, `docs/human/autenticacion.md`, `docs/human/frontend.md` y `.agents/skills/stack/references/frontend/feature-structure.md`

## 3. Validación

- [x] 3.1 `check-types`, Biome y los tests del frontend en verde
- [x] 3.2 `openspec validate remove-unused-admin-screens --strict`
