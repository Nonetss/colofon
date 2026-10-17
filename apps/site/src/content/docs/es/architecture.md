---
title: Arquitectura
description: Los servicios del stack, cómo enruta el gateway cada petición y dónde vive el contenido.
order: 8
---

`compose.prod.yml` levanta cuatro servicios en una red de Docker. Solo el gateway publica un puerto; el resto solo es accesible dentro de la red.

| Servicio | Imagen | Hace |
| --- | --- | --- |
| `gateway` | `ghcr.io/nonetss/colofon-gateway` | Caddy. La única entrada pública, en `FRONTEND_PORT` (puerto `80` del contenedor). |
| `frontend` | `ghcr.io/nonetss/colofon-frontend` | Astro renderizado en el servidor, con islas de React: el lector de documentación, `/me` y `/admin`. Puerto `4321`. |
| `backend` | `ghcr.io/nonetss/colofon-backend` | Hono y oRPC sobre Bun: la API, el servidor git de los repositorios alojados y el MCP. Puerto `3000`. |
| `db` | `postgres:17` | Usuarios, sesiones, API keys, los repositorios de contenido y las tareas programadas. |

## Un solo origen

El gateway sirve el sitio, la API y los repositorios git alojados desde el mismo host, así que el navegador nunca hace llamadas a otro origen y las cookies de sesión funcionan sin más. Sus rutas están en `apps/gateway/routes.caddy`:

| Petición | Va a |
| --- | --- |
| `/rpc/*`, `/api/*`, `/git/*`, `/mcp`, `/scalar*`, `/openapi.json` | `backend:3000` |
| `/health` | responde `ok` (el healthcheck de compose) |
| cualquier otra ruta | `frontend:4321` |

Además comprime las respuestas (salvo los packs de git bajo `/git/*`) y añade algunas cabeceras de seguridad. HSTS le corresponde a quien termine TLS delante.

El frontend renderiza todas las páginas en el servidor. Llega al backend directamente por `BACKEND_URL` (`http://backend:3000`) para consultar la sesión y leer las páginas, sin pasar por el gateway.

## Arranque

Al arrancar, el backend:

1. Empieza a sincronizar todos los repositorios de contenido, sin esperar a que termine.
2. Aplica las migraciones pendientes de la base de datos y crea el administrador de `ADMIN_*` si aún no existe.
3. Arranca el planificador de cron, que vuelve a sincronizar el contenido cada cinco minutos.

Los servicios arrancan en orden (base de datos, backend, frontend, gateway), y cada uno espera al healthcheck del anterior.

## Dónde vive el contenido

Cada repositorio de contenido es una fila de la base de datos con su URL de git, su rama y su carpeta de contenido. El backend guarda un clon de cada uno y sirve las páginas desde él:

| Volumen | Ruta en el backend | Guarda |
| --- | --- | --- |
| `content_data` | `/app/.content` | Un clon por repositorio. Desechable: la siguiente sincronización lo reconstruye. |
| `hosted_data` | `/app/.hosted` | El repositorio bare de cada repositorio alojado en la plataforma, quizá la única copia de su historial. |
| `db_data` | (el servicio `db`) | La base de datos. |

Un repositorio se sincroniza al arrancar, cada cinco minutos, cuando se crea o cambian su URL o su rama, y a petición desde su tarjeta o con la herramienta `sync` del MCP. Uno alojado se sincroniza en cuanto alguien hace push a `/git/<slug>.git`.

## El contenido se lee, nunca se ejecuta

El backend convierte las páginas MDX en un árbol HTML saneado. Solo se admiten Markdown y los componentes de la plataforma (`<Callout>`, `<Entities>`, `<Diagram>`); `import`, `export`, las expresiones y el resto de JSX se marcan como problemas y se descartan, nunca se ejecutan. Los diagramas se dibujan como SVG en el servidor, y los `styles/` de un repositorio pasan por una lista blanca antes de llegar a la página.

Si un commit deja el contenido inválido, el backend sigue sirviendo la última versión válida y muestra los problemas a los administradores.
