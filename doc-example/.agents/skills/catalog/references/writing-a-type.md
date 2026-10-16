# Writing a type

A type is a folder `catalog/<type>/` with its declaration `_type.yaml`. The
contract is `docs/data/types.mdx`; the field kinds are the entities of
`catalog/field-kinds/`. `_type.yaml` is a **declaration**: while it is
broken, the platform keeps its last valid version and nothing that depends on
it changes.

## Before adding one

- Look for an existing type that fits (`this-site-types.md`); create one only
  when none does. A missing field is a new field, not a new type.
- This site's types describe the contract. A new type here means the
  platform grew a new kind of thing writers need as a table.

## A real declaration

```yaml
# catalog/components/_type.yaml
nombre: Componente
plural: Componentes
icono: component
descripcion: Los componentes que una página puede usar, el único JSX que lee la plataforma. Cada uno va en un bloque propio
etiqueta: tag

campos:
  tag:
    tipo: texto
    descripcion: Cómo se escribe en una página
  purpose:
    tipo: texto
    descripcion: Qué muestra
  attributes:
    tipo: lista
    descripcion: Los atributos que acepta, siempre como cadenas literales
    de:
      tipo: objeto
      campos:
        name: { tipo: texto }
        required: { tipo: booleano }
        meaning: { tipo: texto }
  page:
    tipo: ficha
    opcional: true
    descripcion: La página que lo explica

vista:
  columnas: [tag, purpose]
```

## Type keys

| Key | What it is |
| --- | --- |
| `nombre` | Required. Singular name, Spanish ("Componente"). |
| `plural` | Required. Plural name ("Componentes"); the catalog page's title and the empty-table text. |
| `icono` | Optional. A Lucide icon name. |
| `descripcion` | Optional, always written here. What goes in the type and **what its id is** ("El id es el tipo tal como se escribe en `tipo`"). |
| `etiqueta` | Optional. The declared field shown as each entity's name, sorted and linked in tables; without it, the id. Use it when the id is not what a reader recognises (`path`, `tag`, `name`). |
| `campos` | Required. The fields, at least one, each with its `tipo`. |
| `vista.columnas` | Optional. The type's table columns, in order: declared fields plus `id`, `fuente`, `actualizado`. Also the default of every `<Entities>` without `columns`. |

Anything else is rejected. The type id is the folder name: lowercase, digits
and hyphens ("El nombre de un tipo va en minúsculas, sin acentos y con
guiones").

## Field keys

| Key | What it is |
| --- | --- |
| `tipo` | Required. The field kind (below). |
| `opcional` | Optional. `true` if it may be missing; every field is required otherwise. |
| `descripcion` | Optional, but on every field that is not obvious: the editor shows it as help and agents read it. Put the enum's meaning here (`"declaration: …; content: …"`). |
| `valores` | Required for `enum`: the values, at least one. |
| `a` | Required for `ref`: the target type's folder name. |
| `de` | Required for `lista`: the field that repeats (a whole field declaration). |
| `campos` | Required for `objeto`: its named fields. |

Field names: lowercase, digits and underscores, starting with a letter
(`public_ip`). `fuente` and `actualizado` can't be declared: "`fuente` no se
puede declarar: toda entidad lo admite sin declararlo".

The platform's schema also accepts an `etiqueta` on a field (its display
name). The guide doesn't document it yet and this site doesn't use it; don't
introduce it until the guide does.

## Field kinds

| Family | Kinds | Extra key |
| --- | --- | --- |
| scalar | `texto` (one non-empty line), `numero`, `entero`, `booleano` (shown "Sí"/"No"), `fecha` (`YYYY-MM-DD`), `url`, `email`, `ip` (v4 or v6) | — |
| choice | `enum` | `valores` |
| reference | `ref` (an entity id of type `a`, shown as its label, linked), `ficha` (a page path under `docs/` without `.mdx`, shown as a link with its title) | `a` for `ref` |
| composite | `lista` (shown joined by commas), `objeto` (shown as `name: value` pairs) | `de`, `campos` |

Kinds nest: a `lista` of `objeto`, each with another `lista`, is valid. The
same kinds declare `doc.config.yaml`'s `cabecera` fields.

## Choosing a kind

| The value is… | Kind |
| --- | --- |
| One of a fixed set you will group or filter by | `enum`, values short and English (`declaration`) |
| Another entity | `ref`, never its name as `texto` |
| The page that explains this entity | `ficha`, named `page` in this site |
| Several of the same | `lista` with `de` |
| A small record (an attribute with name, required, meaning) | `objeto`, usually in a `lista` |
| A date the data was true | `fecha` |

## Changing a type

- After changing a `_type.yaml`, the existing entities must still validate: a
  new required field is filled in every one of them in the same change (or
  added `opcional: true`).
- Renaming or removing a field: update every entity, the `etiqueta`, the
  `vista.columnas` and every `<Entities columns=… group=…>` on the pages
  (`grep -rn 'type="<type>"' docs`).
- A bad `a:` is reported on the declaration: "…: `a: x` no es ningún tipo de
  catalog/ (hay: …)". An `etiqueta` or column that is no field: "`x` no es
  ninguno de los campos".
