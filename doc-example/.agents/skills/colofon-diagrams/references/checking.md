# Checking a diagram

A diagram is done when the editor marks nothing, the platform reports
nothing, and it reads well drawn. Check in that order.

## 1. In the editor

`.vscode/settings.json` points `json.schemas` for `diagrams/*.json` at the
platform's diagram schema for this repository. It completes keys by `type`
(a `gantt` file is offered `phases` and `today`, and `nodes` is marked), lists
the catalog entities and the pages a piece can link to, and marks wrong
values (a hue, a kind, a shape). Fix everything it marks before going on. An
`.svg` illustration has no schema: check it on the platform.

## 2. On the platform

After the push and the sync (instant for a repository hosted on the platform,
at most five minutes otherwise, or "Sincronizar" in `/admin/content`), admins
see each diagram's problems on the repository's home and on every page that
shows it, with the field path:

| You see | It means | Do |
| --- | --- | --- |
| `JSON …` with a line and column | The file is not valid JSON | Fix the syntax; nothing of it is drawn |
| "`x` no es una clave de …" | A key the form doesn't take | Check the type's reference; maybe it belongs to another form |
| "`x` no es ningún tipo de diagrama (…)" | Unknown `type` | Use a value from the routing table |
| "… no es ninguna entidad del catálogo" | `entity` points nowhere | Fix the id (`<type>/<id>`), or create the entity |
| "… no es ninguna página de docs/" | `page` points nowhere | Use the page path without `.mdx` |
| "… no es ninguna de las partes del diagrama" / "… de las cajas" | A link names an id that isn't there | Fix the id; the link is left out meanwhile |
| "… ya es el id de otra parte" | A repeated id | Ids are unique across the diagram |
| "tramo en diagonal …" | A drawn arrow with a diagonal segment | Add a corner point, or `"route": "curve"` |
| "Una etiqueta (label) necesita at" | A drawn label without position | Give `at` |
| "… no cabe en …px" | Text wider than its box | Shorten, move to `sub`/`info`, or widen |
| "… lleva como mucho … : pártelo en dos diagramas" | Past the type's budget | Split into overview and detail |
| "Como mucho 2 elementos van en el color de acento …" | Too many accents | Keep only what the reader must see first |
| "Se ha quitado … N veces" | An illustration had something outside the whitelist | Use role classes; drop what isn't allowed |
| `<Diagram id="x">: no hay ningún diagrams/x.json ni …` | The page names a diagram that doesn't exist | Fix the id or create the file |

Everything valid is still drawn, so a diagram that "looks fine" can still
carry problems: always look at the report.

## 3. Drawn

Open the page (or ask the user for a screenshot) and read the diagram as a
newcomer would:

- Can you tell in five seconds what it is about? The accent should answer.
- Do labels sit clear of lines and boxes? Do arrows cross where they needn't?
- Light **and** dark theme: nothing should rely on a colour alone.
- The text version (`<page>/llm.txt`) reads as a sensible description on its
  own.

If the automatic layout of a typed form reads badly, use the form's own
handles (a flowchart's `row`/`col`, a tree's `direction`, a timeline's
`scale`) before reaching for a drawn diagram.
