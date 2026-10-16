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

- [x] Endpoint `/mcp` en el backend, autenticado con API key (`x-api-key`).
      Las herramientas leen con los procedimientos de `v1.docs` como el
      dueño de la key, así que heredarán los permisos del punto 2.
- [x] `repositories`, `index`, `search` y `read` (`add-docs-mcp`).
- [ ] `entity(type, id)`: una entidad con sus relaciones y las fichas que
      la citan.
- [ ] `skills()` / `skill(name)` (depende del punto 5).
- [ ] `read` de una sola sección: con `#ancla`, devolver solo esa sección
      (y sus subsecciones) en vez de la página entera.

### 7. Búsqueda y Markdown (de la primera prueba del MCP)

- [ ] Ranking: un prefijo corto ("tip") pesa más por el campo (título,
      encabezado) que la palabra exacta en el cuerpo. La spec ya dice que la
      palabra exacta pesa más; revisar el reparto de pesos. Afecta también
      al Ctrl+K.
- [ ] Extractos de tablas: las celdas salen unidas con espacios, cabecera
      incluida. Aplanarlas como `columna: valor`, como ya salen los
      atributos de los componentes.
- [ ] Markdown (`llm.txt`, "Copiar en Markdown" y `read`):
  - [ ] El Callout pierde su tipo; valorar `> [!TIP]` en vez de la cita
        con el título en negrita (hoy es una decisión a propósito).
  - [ ] Listas de objetos dentro de una celda: se separan con `, ` y no se
        ve dónde acaba cada objeto.
  - [ ] El título de grupo de `<Entities group>` sale como párrafo suelto;
        debería ser un encabezado o ir en negrita.

### 7. Documentación en una subcarpeta del repositorio

Que cualquier proyecto pueda llevar su documentación en una carpeta propia
(por ejemplo `docs/`) y colofon la renderice sin tener un repositorio aparte
solo para ella.

- [ ] Campo `path` en `contentRepository` (subcarpeta, vacío = raíz).
      Requiere migración.
- [ ] Que el loader de `packages/content` trate esa carpeta como la raíz del
      contrato (`catalog/`, `_type.yaml`, `diagrams/`, `styles/`,
      `menu.yaml`) e ignore el resto del repositorio.
- [ ] Campo en el formulario de `/admin/content` al dar de alta o editar un
      repositorio.
- [ ] Sincronizar solo cuando cambie algo dentro de esa carpeta (comparar el
      árbol de la subcarpeta en vez del commit), para no reconstruir con cada
      commit de código.
- Mirar si compensa un sparse checkout para no clonar el proyecto entero.

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
