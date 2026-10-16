# TODO

Lista de trabajo pendiente, ordenada por dependencias: los permisos van antes
que el MCP porque el MCP tiene que respetarlos.

## Prioridad

### 1. Organizaciones en `/admin`

- [ ] Recuperar la UI de organizaciones (alta, miembros, invitaciones,
      equipos).
- El backend ya existe: plugin `organization()` en
  `packages/auth/src/index.ts`, router `packages/api/src/v1/organization` y
  specs `organization-management` y `organization-access-control`.

### 2. Permisos de los repositorios de documentación

- [ ] Relacionar cada repositorio con organizaciones (o equipos).
      Requiere migración.
- [ ] Filtrar por permisos en el lector, la búsqueda, `llms.txt`, las rutas
      `.md`, el autocompletado de schemas y el MCP.

### 3. API keys ligadas a la documentación

- [ ] La key hereda los permisos de su dueño y puede restringirse a un
      subconjunto de sus repositorios (nunca más acceso que el usuario).
- [ ] Selector de repositorios al crear una key.
- Mirar si basta con `permissions`/`metadata` del plugin de API keys de
  Better Auth antes de pensar en migración.

### 4. Ordenar los repositorios

- [ ] Campo `position` en `contentRepository`. Requiere migración.
- [ ] Reordenar desde `/admin/content`.
- [ ] Usar ese orden en el selector de repositorios, la portada "Todos" y
      `llms.txt`.

### 5. Servir las skills

- [ ] `/skills/index.json` y `/skills/<nombre>/SKILL.md`.
- [ ] Anunciarlas desde `llms.txt`.
- [ ] Dos conjuntos: las de la plataforma y las de `skills/` de cada
      repositorio de contenido, filtradas por permisos.

### 6. MCP para agentes

- [ ] Endpoint en el backend, en la URL de colofon, autenticado con API key
      (`x-api-key`).
- [ ] Herramientas, todas filtradas por los permisos de la key:
  - [ ] `buscar`: la misma búsqueda del Ctrl+K (`documentation-search`).
  - [ ] `indice`: el `llms.txt` global o el de un repositorio.
  - [ ] `leer(ruta)`: una ficha en Markdown (reutiliza la ruta `.md`).
  - [ ] `entidad(tipo, id)`: una entidad con sus relaciones y las fichas que
        la citan.
  - [ ] `skills()` / `skill(nombre)`.
  - [ ] `repositorios()`.

## Resto de `VISION.md`

- [ ] Tablas de `<Entities>` interactivas como islas (ordenar y filtrar).
- [ ] Si un commit rompe el contenido, servir la última versión válida y
      mostrar los errores a los administradores.
- [ ] Bóveda y broker de secretos: conexiones, `consultar`, `actuar`,
      `generar_secreto`, redacción y auditoría. Primer caso: Duplicati.
- [ ] Importadores (por ejemplo, los dockers desde Komodo).
- [ ] Webhook del servidor git para sincronizar al hacer push.
- [ ] Conectores SSH y de bases de datos en solo lectura.
- [ ] Actualizar `VISION.md`: diagramas, búsqueda y `llms.txt` ya están hechos.

## Decisiones abiertas

- ¿Permisos por organización o por equipo?
- Un repositorio sin organización asignada, ¿lo ve cualquier usuario con
  login o solo los administradores?
- ¿Una API key puede abarcar varias organizaciones si su dueño pertenece a
  varias?
