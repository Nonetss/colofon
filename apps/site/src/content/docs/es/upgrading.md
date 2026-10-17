---
title: Actualizar
description: Poner al día una instalación en marcha, fijar una versión concreta y comprobar que los repositorios de contenido siguen encajando con la plataforma.
order: 10
---

## La actualización de siempre

Desde el directorio donde están `compose.prod.yml` y `.env`:

```bash
docker compose -f compose.prod.yml --env-file .env pull
docker compose -f compose.prod.yml --env-file .env up -d --remove-orphans
```

El backend aplica las migraciones nuevas de la base de datos al arrancar y vuelve a sincronizar todos los repositorios de contenido, así que no hay ningún paso aparte. Actualiza las tres imágenes (gateway, frontend y backend) a la vez: se construyen desde el mismo commit. Antes, haz una [copia de seguridad](../deploy/#copias-de-seguridad).

Cuando una versión cambia el propio fichero compose, vuelve a descargarlo antes del `pull`:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/compose.prod.yml -o compose.prod.yml
```

## Fijar una versión

`compose.prod.yml` usa la etiqueta `:main` de `ghcr.io/nonetss/colofon-gateway`, `colofon-frontend` y `colofon-backend`. Cada build de `main` se publica también como `main-<sha>`, con los ocho primeros caracteres del commit. Para quedarte en una, cambia las tres líneas `image:` a la misma etiqueta `main-<sha>`.

## El contrato del contenido

La plataforma y los repositorios de contenido se versionan por separado. Cada repositorio dice para qué versión del contrato está escrito en su `doc.config.yaml`:

```yaml
plataforma: "1"
```

Hoy `"1"` es la única versión, así que actualizar la plataforma no obliga a tocar el contenido. Un repositorio que declara una versión que la plataforma no conoce se marca como inválido al sincronizar, y la plataforma sigue sirviendo su última versión válida.
