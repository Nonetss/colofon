# Links

Every link and image is checked against the repository when the site is
read. The contract is `docs/pages/markdown.mdx` ("Enlaces", "Imágenes").

## What to write

| To link to… | Write | Leads to |
| --- | --- | --- |
| Another page | Its **relative path with `.mdx`**: `[El menú](../repository/menu.mdx)`, `[Tipos](types.mdx#tipos-de-campo)` | That page, keeping the anchor |
| A section's entry page | Its `index.mdx`: `[Diagramas](../diagrams/index.mdx)` | The section page |
| An entity | `catalog:<type>/<id>`: `[menu.yaml](catalog:files/menu)` | The entity's page (its `ficha`), or its generated catalog page when it has none |
| A type's table | `catalog:<type>`: `[Tipos de campo](catalog:field-kinds)` | The type's generated catalog page |
| An external site | The full `https://` URL | That site, in a new tab |
| An image | A path relative to the page, under `docs/`: `![El panel](img/panel.png)` | The image, zoomable |

- **Relative to the page's own folder**: from `docs/pages/header.mdx`, the menu
  page is `../repository/menu.mdx`, the components page `components.mdx`.
- A link to an entity **also cites it**: the entity's page lists yours under
  "Páginas que la citan". Link the entities a sentence is about, not every
  mention.
- Prefer `catalog:` over a link to the explaining page when the sentence is
  about the thing (the file, the component); link the page when it is about
  how to write it.
- Anchors are GitHub-style slugs of the heading: lowercase, spaces to hyphens,
  accents kept (`#qué-se-reporta`).

## Images and files

- `png`, `jpg`, `jpeg`, `gif`, `webp`, `avif` or `svg`, up to 10 MiB, under
  `docs/`, normally in an `img/` folder next to the page that uses it.
- Only pages (`.mdx`) and images can be linked inside the repository: a link
  to any other file is reported ("…: solo se enlazan fichas (.mdx) e
  imágenes").
- For how things connect, draw a diagram (`diagrams` skill) rather than
  pasting a screenshot of one.

## What gets reported

A broken link is shown as plain text, a broken image as its alt text, and the
problem names the line:

| Written | Reported |
| --- | --- |
| A page that doesn't exist | "Enlace roto: ….mdx no es ninguna ficha" |
| An entity or type that doesn't exist | "Enlace roto: catalog:… no es ninguna entidad del catálogo" |
| A path that climbs out of `docs/` | "Enlace roto: … queda fuera de docs/" |
| A missing image | "Imagen rota: … no existe" |
| A `catalog:` link as an image, or a non-image | "Imagen rota: … no es una imagen" |

## Don't

| Anti-pattern | Why it fails |
| --- | --- |
| A link without `.mdx` (`../repository/menu`) | Not resolved as a page: reported as a non-page file |
| An absolute reader URL (`/<slug>/repository/menu`) | Not checked, and breaks if the slug changes |
| Linking `catalog/files/menu.yaml` as a file | Only pages and images link; use `catalog:files/menu` |
| "Click aquí" as link text | The text is what the reader and agents see; name the target |
