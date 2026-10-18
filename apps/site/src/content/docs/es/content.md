---
title: Escribir contenido
description: Qué contiene un repositorio de contenido, el contrato entre él y la plataforma, el autocompletado en el editor y cómo se informan los problemas.
order: 3
---

La documentación no vive en la plataforma: cada sitio es un repositorio git propio, sin código, que la plataforma lee en vivo. Cambiar una página es un commit; el sitio lo sirve tras la siguiente sincronización, sin reconstruir nada.

La mejor forma de aprender el formato es [doc-example](https://github.com/Nonetss/doc-example), la guía «Escribir documentación»: explica cómo escribir un repositorio de contenido siendo uno. Regístrala en tu plataforma para leerla como un sitio más.

## La forma de un repositorio

```txt
documentacion/
├── doc.config.yaml        # nombre, versión de la plataforma, campos extra de cabecera
├── menu.yaml              # opcional: los grupos de la barra lateral
├── docs/                  # páginas MDX; cada carpeta es una sección con su index.mdx
├── catalog/
│   └── maquinas/
│       ├── _type.yaml     # el esquema del tipo
│       └── nas.yaml       # una entidad por fichero; el nombre del fichero es su id
├── diagrams/              # opcional: diagramas <id>.json o ilustraciones <id>.svg
├── styles/                # opcional: módulos CSS sobre los estilos de la plataforma
└── skills/                # opcional: las skills para agentes de este sitio
```

La plataforma solo impone esta forma, los campos de cabecera de las páginas y los tipos de campo. Todos los nombres de tipos, campos y páginas son del sitio: la misma plataforma documenta la infraestructura de una empresa o una frutería.

## `doc.config.yaml`

El nombre del sitio, su descripción y la versión mayor del contrato a la que apunta, `contract: "2"`. En `header` puede declarar campos de cabecera extra para las páginas, con los mismos tipos que el catálogo.

## Páginas

`docs/**/*.mdx`, cada una con su cabecera (`title` y `description` obligatorios; `icon`, `order` y `updated` opcionales) y un cuerpo en Markdown de GitHub. **El MDX no ejecuta nada**: `import`, `export` y las expresiones `{…}` se rechazan, y los únicos componentes son los tres de la plataforma:

- `<Callout type="warning">`: una nota destacada alrededor de Markdown.
- `<Entities type="maquinas" columns="…" />`: una tabla de un tipo del catálogo.
- `<Diagram id="red" />`: un diagrama de `diagrams/`.

Sin `menu.yaml`, la barra lateral sigue las carpetas. Con él, sus grupos listan en orden las páginas, carpetas y páginas del catálogo, y sus títulos e iconos mandan sobre los de las cabeceras.

## El catálogo

Los datos estructurados viven en `catalog/<tipo>/`: un `_type.yaml` que declara el tipo (nombre, plural, icono, campos y las columnas de su tabla) y un YAML por entidad. Entre los tipos de campo están `text`, `number`, `integer`, `boolean`, `date`, `url`, `email`, `ip`, `enum`, `ref` (otra entidad), `page` (una página), `list` y `object`. La plataforma genera las páginas del catálogo en `/<slug>/catalog`: una tabla por tipo y una página por entidad, con las páginas que la citan y las entidades que apuntan a ella.

## Diagramas, estilos y skills

- **Diagramas**: ficheros `diagrams/<id>.json`, dibujados a mano (el contenido coloca cada caja, flecha y zona) o en una de las 30 formas tipadas que la plataforma compone a partir de datos (diagrama de flujo, secuencia, cronología, Gantt, Sankey…). Un `diagrams/<id>.svg` es una ilustración hecha a mano. Se dibujan en el servidor, en los dos temas, y sus cajas pueden ser entidades del catálogo.
- **Estilos**: ficheros `styles/<módulo>.css` (`theme.css`, `page.css`, `tables.css`…) que la plataforma limpia y aplica sobre sus propios estilos en las páginas de ese repositorio.
- **Skills**: ficheros `skills/<nombre>/SKILL.md` que la plataforma sirve a los agentes como `<slug>-<nombre>` (ver [Para agentes de IA](../agents/)).

## Autocompletado en el editor

La plataforma sirve un catálogo de esquemas JSON por repositorio, construido a partir de sus propias declaraciones, así que no hay nada que generar ni subir. Apunta a él la extensión de YAML de VS Code o Cursor en `.vscode/settings.json`:

```json
{
  "yaml.schemaStore.url": "https://docs.example.com/api/v1/content/schemas/manual",
  "json.schemas": [
    {
      "fileMatch": ["/diagrams/*.json"],
      "url": "https://docs.example.com/api/v1/content/schemas/manual/diagram"
    }
  ]
}
```

Un tipo, campo o entidad nuevo aparece en el editor tras la siguiente sincronización.

## Problemas

La plataforma valida cada fichero en cada sincronización e informa de los problemas en español, con el fichero, la línea y el campo. Una página rota se sigue mostrando, con avisos en lugar de lo que no pudo leer, y los administradores ven sus problemas en la propia página. Si un commit deja inválidas las declaraciones (`doc.config.yaml`, `menu.yaml` o un `_type.yaml`), la plataforma sigue sirviendo las últimas válidas.

## Escribir con un agente

La plataforma sirve a cualquier agente las skills de escritura `colofon-*`: una por parte del repositorio (`colofon-docs`, `colofon-catalog`, `colofon-diagrams`, `colofon-styles`…) y una por tarea (`colofon-new-page`, `colofon-check`, `colofon-review`…). Un agente que las instala conoce el contrato y las convenciones antes de escribir una línea.
