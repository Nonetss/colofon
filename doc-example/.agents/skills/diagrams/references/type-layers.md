# Layer stack (`"type": "layers"`)

**Best for:** levels where each one is built on the one below: a technical
stack, levels of abstraction, a protocol model, a context hierarchy. The
reader sees what sits on top of what and, optionally, what each level holds.

**Not for:** a ranking where the top is rarer (use `pyramid`), scope by
containment (draw it nested by hand, `drawn-nested.md`), components that talk
to each other sideways (draw an architecture by hand,
`drawn-architecture.md`), or quality tiers of the same data (`drawn-medallion.md`).

## The file

```json
{
  "type": "layers",
  "title": "Las capas de un sitio de documentación",
  "desc": "Del lector al git en el que vive el contenido",
  "layers": [
    { "name": "Lector", "sub": "web y llms.txt", "items": ["páginas", "catálogo", "llm.txt"] },
    { "name": "Plataforma", "sub": "sincroniza y valida", "focal": true },
    { "name": "Repositorio de contenido", "page": "repository",
      "items": ["doc.config.yaml", "menu.yaml", "docs/", "catalog/", "diagrams/"] },
    { "name": "Git", "sub": "una rama, un historial" }
  ]
}
```

| Key | What it is |
| --- | --- |
| `layers` | Required. The layers, **top to bottom**, each an item (see [items.md](items.md)) plus an optional `items`: a list of short texts drawn as chips. |

## What the platform does

- Draws each layer as a full-width band (720px), all the same width, with a
  small gap between them.
- Each band holds, left to right: its number (`01`, `02`… from the top,
  muted), its name, and its `sub` lines right-aligned at the far end.
- A layer with `items` gets a taller band and a row of chips under its name,
  in a small monospace face; chips are plain text, without links.
- Fills: the accent tint and outline for `focal`, the hue's tint for `hue`,
  the surface colour otherwise. The band links to the layer's `entity` or
  `page`, and its hover card shows `sub` and `info`.

## What you decide

- **Top is what the user touches, bottom is what everything rests on.** Hold
  that direction; say it in `desc` ("del lector, arriba, al git, abajo").
- **The `sub` is the layer's job** ("sincroniza y valida"), not a second name.
- **Chips are what the layer holds**, a few each, short (a file, a tool). Use
  them on the layers where they help, not on all of them.
- **One focal layer**: the one under discussion, the bottleneck, the one the
  page is about.

## Complexity budget

| Limit | Value |
| --- | --- |
| Layers | 7 |
| Chips per layer | 6 |
| Accent elements | 2 (focal layers) |

Over budget → merge layers that always change together, or zoom into one
layer with a second diagram.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Layers that don't rest on each other | It's a list; or an architecture if they talk sideways |
| Every layer in its own `hue` | The hierarchy disappears behind the colours |
| Long chips, or many | They don't fit the band's width; the platform reports it |
| The same piece as a chip in two layers | The reader can't tell where it lives |
| Bottom-to-top order in the file | The numbers and the reading both flip |

## Reported

A layer that is not an item, chips that don't fit the band's width (`Las
piezas de "…" no caben en el ancho de la capa: deja menos o acórtalas`), more
than 7 layers, more than 6 chips in a layer and more than two accents.

## Text version

A numbered list of the layers, top to bottom, with their `sub` in brackets and
their chips after a colon: "Lector (web y llms.txt): páginas, catálogo,
llm.txt".

## In this site

`diagrams/layers-content-stack.json`, shown in `docs/diagrams/concepts.mdx`.
