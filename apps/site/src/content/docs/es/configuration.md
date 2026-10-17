---
title: Configuración
description: Las variables de entorno de un despliegue, agrupadas por lo que hacen.
order: 5
---

Todos los servicios leen su configuración del `.env` que está junto a `compose.prod.yml`. El instalador te escribe uno; [`.env.example`](https://github.com/Nonetss/colofon/blob/main/.env.example) lista todas las variables con su valor por defecto y un comentario. El backend las valida al arrancar y se niega a arrancar con un mensaje que nombra la variable incorrecta.

Deja los valores entre comillas simples, como los escribe el instalador: así Compose los lee tal cual, sin interpolar `$VAR`.

## URL pública y puerto

| Variable | Qué es |
| --- | --- |
| `FRONTEND_PORT` | Puerto del host que publica el gateway. Por defecto `4444`. |
| `CORS_ORIGIN` | La URL pública que ve el navegador, como `https://docs.example.com`. Una sola URL, sin ruta detrás. |

`CORS_ORIGIN` sirve para algo más que CORS: `compose.prod.yml` la pasa también como `BETTER_AUTH_URL`, así que los callbacks del inicio de sesión se construyen con ella, y los enlaces completos de `/llms.txt` y del `llm.txt` de cada página la usan. Si la URL que abres en el navegador no coincide, el inicio de sesión falla.

## Base de datos

| Variable | Qué es |
| --- | --- |
| `POSTGRES_PASSWORD` | Contraseña del servicio `db` incluido. Obligatoria en `compose.prod.yml`. |
| `DATABASE_URL` | Dónde se conecta el backend. Con la base de datos incluida, `postgresql://postgres:<contraseña>@db:5432/colofon`. |

Genera la contraseña con `openssl rand -hex 32`: acaba dentro de `DATABASE_URL`, donde `/`, `+` y `=` habría que escaparlos. Para usar un PostgreSQL externo, mira [Desplegar](../deploy/#postgresql-externo).

## Autenticación

| Variable | Qué es |
| --- | --- |
| `BETTER_AUTH_SECRET` | Firma las sesiones y las cookies. Obligatoria, de al menos 32 caracteres (`openssl rand -base64 48`). Cambiarla cierra la sesión de todo el mundo. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | El administrador que se crea al arrancar cuando están las tres. Idempotente por email: nunca se vuelve a crear ni se sobrescribe. |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_DISCOVERY_URL` | Un proveedor OIDC para iniciar sesión, que solo se activa cuando están las tres. Mira [Autenticación](../authentication/). |

## Secretos

| Variable | Qué es |
| --- | --- |
| `SECRETS_ENCRYPTION_KEY` | Cifra los secretos que los usuarios guardan en `/me`, que la herramienta `request` del MCP rellena en las llamadas que hace un agente. El Base64 de exactamente 32 bytes (`openssl rand -base64 32`). Opcional: sin ella, los secretos están desactivados. |

> Perder o cambiar `SECRETS_ENCRYPTION_KEY` deja ilegibles todos los secretos guardados, y los usuarios tienen que volver a guardarlos. Haz copia de ella con el `.env`.

## Contenido

| Variable | Qué es |
| --- | --- |
| `TRUSTED_GIT_HOSTS` | Hosts git internos desde los que los usuarios pueden añadir repositorios, separados por comas (`git.casa.lan,gitea.lan`). Nombres exactos, sin comodines. Opcional. |

El backend clona cada repositorio desde dentro de tu red, así que un repositorio que un usuario añade desde su perfil (`/me/repositories`) se rechaza si su host resuelve a una dirección privada. Pon aquí los hosts internos de confianza, como un Gitea en casa; sus URLs tienen que seguir usando `https://`. Los repositorios que añaden los administradores en `/admin/content` no pasan esta comprobación.

## Logs

| Variable | Qué es |
| --- | --- |
| `LOG_LEVEL` | Gravedad mínima: `fatal`, `error`, `warn`, `info` (por defecto), `debug` o `trace`. |

Los logs salen por la salida estándar de los contenedores como líneas JSON; léelos con `docker compose logs`.
