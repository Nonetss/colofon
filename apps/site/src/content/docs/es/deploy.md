---
title: Desplegar con Docker Compose
description: Instalar con el script o a mano con compose.prod.yml, ponerlo detrás de HTTPS y saber qué copiar.
order: 6
---

Un despliegue es un directorio con dos ficheros: `compose.prod.yml`, que descarga las imágenes ya construidas, y el `.env` que lee. El instalador escribe los dos; también puedes escribirlos a mano.

## Con el instalador

En un host Linux con Docker, el plugin de Compose, `curl` y `openssl`, desde un directorio vacío:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/scripts/bootstrap.sh | bash
```

Lee tus respuestas del terminal aunque se ejecute con una tubería, y pregunta:

1. El **puerto** del host (por defecto `4444`) y la **URL pública** que usará el navegador. Te avisa si la URL es `http://` sin cifrar y no es `localhost`, porque el inicio de sesión fallaría.
2. Los **hosts git internos de confianza** desde los que los usuarios pueden añadir repositorios (opcional; mira [Configuración](../configuration/#contenido)).
3. El **primer administrador**: nombre, email y una contraseña de al menos 8 caracteres.

Después genera `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` y `SECRETS_ENCRYPTION_KEY` con `openssl`, escribe `.env` con permisos `600`, descarga `compose.prod.yml` si no está y, si se lo pides, descarga las imágenes y arranca el stack. Se niega a ejecutarse si ya existe un `.env`, así que nunca sobrescribe una instalación. `PB_REF` (`… | PB_REF=v0.1.0 bash`) elige la rama o etiqueta de `compose.prod.yml` que descarga; las imágenes siguen en `:main`.

## A mano

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/compose.prod.yml -o compose.prod.yml
touch .env && chmod 600 .env
```

Genera los secretos:

| Variable | Se genera con |
| --- | --- |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
| `SECRETS_ENCRYPTION_KEY` (opcional) | `openssl rand -base64 32` |

Y rellena `.env`, repitiendo la contraseña de la base de datos dentro de `DATABASE_URL`:

```bash
FRONTEND_PORT='4444'
CORS_ORIGIN='https://docs.example.com'
POSTGRES_PASSWORD='…'
DATABASE_URL='postgresql://postgres:…@db:5432/colofon'
BETTER_AUTH_SECRET='…'
SECRETS_ENCRYPTION_KEY='…'

ADMIN_NAME='Admin'
ADMIN_EMAIL='admin@example.com'
ADMIN_PASSWORD='…'
```

Cada variable se explica en [Configuración](../configuration/). Después, arráncalo:

```bash
docker compose -f compose.prod.yml --env-file .env pull
docker compose -f compose.prod.yml --env-file .env up -d
```

El backend aplica las migraciones y crea el administrador al arrancar, así que no hay paso de instalación. En uno o dos minutos, abre la URL pública e inicia sesión.

## Las imágenes

`compose.prod.yml` descarga `ghcr.io/nonetss/colofon-gateway`, `colofon-frontend` y `colofon-backend`, construidas para `amd64` y `arm64` en cada push a `main`, además de `postgres:17`. Mira [Actualizar](../upgrading/) para ponerlas al día o fijar una versión concreta.

## Detrás de HTTPS

Las cookies de sesión son `Secure`, así que el navegador solo las guarda por HTTPS o en `localhost`. Todo lo que vayan a usar otras máquinas necesita HTTPS.

El gateway sirve HTTP sin cifrar en `FRONTEND_PORT`. Pon tu proxy inverso (Caddy, Traefik, nginx…) delante, termina TLS ahí y reenvía todas las rutas a ese puerto: el sitio, la API, `/git/*` y `/mcp` viven en el mismo origen y el gateway los reparte. Deja `CORS_ORIGIN` en la URL `https://` que ve el navegador. HSTS le corresponde a ese proxy.

## PostgreSQL externo

Para usar una base de datos gestionada, quita de `compose.prod.yml` el servicio `db` y la entrada `depends_on` del backend que apunta a él, y apunta `DATABASE_URL` a la tuya:

```bash
DATABASE_URL='postgresql://usuario:contraseña@db.example.com:5432/colofon'
```

## Copias de seguridad

| Qué | Dónde | Por qué |
| --- | --- | --- |
| La base de datos | el volumen `db_data`, o tu PostgreSQL | Usuarios, API keys, secretos guardados (cifrados) y la lista de repositorios de contenido. |
| Los repositorios alojados | el volumen `hosted_data` | El repositorio bare de cada repositorio alojado en la plataforma. Puede ser la única copia de su historial. |
| `.env` | junto a `compose.prod.yml` | Sobre todo `SECRETS_ENCRYPTION_KEY`: sin ella, los secretos guardados no se pueden leer. |

`content_data` solo guarda clones de los repositorios y se puede dejar fuera: la siguiente sincronización lo reconstruye. Un volcado de la base de datos incluida:

```bash
docker compose -f compose.prod.yml exec db pg_dump -U postgres colofon > colofon.sql
```
