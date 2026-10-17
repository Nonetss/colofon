---
title: Desarrollo
description: Ejecutar colofon desde el código, con el stack de desarrollo en Docker o en nativo, y las comprobaciones por las que pasa un cambio.
order: 9
---

Colofon es un monorepo de Turborepo sobre Bun: un frontend en Astro y un backend en Hono/oRPC en `apps/`, los paquetes TypeScript compartidos en `packages/` (API, auth, base de datos, contenido, cron, env, logger) y el gateway Caddy en `apps/gateway`. Necesitas Bun `1.4.2` y Docker con el plugin de Compose.

## Preparar

```bash
git clone https://github.com/Nonetss/colofon.git
cd colofon
bun install
bun run setup:dev
```

`setup:dev` escribe el `.env` de la raíz a partir de `.env.example`, con secretos generados y la creación del administrador activada. Es el único fichero de entorno: lo leen todos los workspaces y todos los ficheros compose. Si ya existe un `.env` lo respeta, salvo que pases `--force`.

## Ejecutarlo

Hay dos formas, con los mismos puertos del host, así que solo puede ir una a la vez:

| Comando | Qué arranca |
| --- | --- |
| `bun run dev` | El stack de desarrollo en Docker (`compose.dev.yml`) con recarga en caliente: el gateway, el frontend, el backend y PostgreSQL. `bun run dev:down` lo elimina. |
| `bun run dev:local` | Las aplicaciones en nativo con Turbo. Necesita un PostgreSQL (`bun run postgres:start` arranca el de desarrollo en `127.0.0.1:5432`) y el gateway de desarrollo en otro terminal: `bun run gateway`. |

En los dos casos, abre **`https://localhost:4321`**. El gateway de desarrollo lo sirve por HTTP/2 con un certificado de su propia autoridad local, delante de `astro dev` en `:4320`, así que en desarrollo se enruta igual que en producción. El inicio de sesión solo funciona en ese origen.

Para quitar el aviso del certificado, exporta la autoridad local cuando el gateway haya arrancado una vez e impórtala en el navegador como autoridad de confianza:

```bash
bun run dev:cert   # escribe caddy-local-root.crt
```

El backend aplica las migraciones y crea el administrador del `.env` al arrancar, igual que en producción.

## Contenido para mirar

`doc-example/` contiene un repositorio de contenido de ejemplo, el tipo de documentación que muestra la plataforma. La plataforma nunca lo lee del disco: para verlo, regístralo como repositorio de contenido en `/admin/content`.

## Comprobaciones

| Comando | Comprueba |
| --- | --- |
| `bun run check-types` | TypeScript en todos los workspaces (`tsc`, y `astro check` en el frontend). |
| `bun run check` | Biome: formato, lint y orden de imports, aplicando las correcciones. |
| `bun run test` | Los tests unitarios de `packages/api`, `packages/content`, `packages/cron` y `apps/frontend`. No necesitan base de datos ni red. |
| `bun run tailwind:check` | El lint de clases de Tailwind con `tailwint`. |

## Primero la spec

Cada capacidad tiene su spec en `openspec/specs/`. Los cambios pasan por OpenSpec: `openspec new change <nombre>`, luego propuesta, specs y diseño, tareas, implementación y, al final, se sincronizan las specs y se archiva el cambio. Lee la spec de un área antes de cambiarla: es la descripción de referencia de lo que tiene que hacer el código.

Los commits siguen Conventional Commits (`feat(frontend): …`, `fix(api): …`). Las migraciones de la base de datos se generan, se revisan y se suben a mano con los scripts `db:*`.
