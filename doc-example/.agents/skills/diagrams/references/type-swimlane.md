# Swimlane (`"type": "swimlane"`, variant `process`)

**Best for:** a process that crosses people, teams or systems, where the
**handoffs** from one to another are the story: publishing a change, an
approval, a vendor exchange. The `process` variant adds what enters, what
leaves and what each step is done with, for when the payloads and tools
matter as much as the order.

**Not for:** who owns what, without a process (use `org-chart`), decision
logic with a single actor (use `flowchart`), messages back and forth between
actors in time (use `sequence`), or work by state with no flow (use
`kanban`).

## The file

```json
{
  "type": "swimlane",
  "title": "Quién hace qué al publicar",
  "desc": "Los pasos de publicar un cambio, repartidos entre quien escribe, la plataforma y quien lee",
  "lanes": [
    { "id": "writer", "name": "Quien escribe" },
    { "id": "platform", "name": "Plataforma", "hue": "teal" },
    { "id": "reader", "name": "Quien lee" }
  ],
  "steps": [
    { "id": "edit", "name": "Escribe la página", "lane": "writer", "entity": "files/page" },
    { "id": "push", "name": "Hace push", "lane": "writer" },
    { "id": "sync", "name": "Sincroniza", "lane": "platform" },
    { "id": "valid", "name": "¿Cumple el contrato?", "lane": "platform", "kind": "decision" },
    { "id": "publish", "name": "Publica", "lane": "platform", "focal": true },
    { "id": "report", "name": "Reporta problemas", "lane": "platform" },
    { "id": "read", "name": "Lee la página", "lane": "reader" }
  ],
  "links": [
    { "from": "edit", "to": "push" },
    { "from": "push", "to": "sync", "label": "GIT" },
    { "from": "sync", "to": "valid" },
    { "from": "valid", "to": "publish", "label": "SÍ" },
    { "from": "valid", "to": "report", "label": "NO" },
    { "from": "publish", "to": "read", "kind": "accent" },
    { "from": "report", "to": "edit", "kind": "dash" }
  ]
}
```

With `"variant": "process"`, a step also lists its chips:

```json
{ "id": "body", "name": "Cuerpo", "lane": "author", "inputs": ["la cabecera"], "tools": ["Markdown"] }
```

| Key | What it is |
| --- | --- |
| `lanes` | Required. The lanes, top to bottom, each an item with an `id` (see [items.md](items.md)). A lane's `hue` tints its steps that have none. |
| `steps` | Required. Each an item with an `id` and `lane` (a lane id), plus `kind`: `step` (default) or `decision` (a diamond); `col` (from 0) to pin its column; and, with the `process` variant, `inputs`, `outputs`, `tools`: lists of short texts. |
| `links` | Optional. `{ from, to, label?, kind?, info? }` between step ids; `kind` is `default`, `accent` or `dash`. |
| `variant` | Optional. `process`: draws each step's `inputs`, `outputs` and `tools` as chips under it. |

## What the platform does

- One **horizontal band per lane**, its name in capitals; a band is a zone, so
  hovering its title lights its steps.
- A step's **column** is its longest distance from the first step written,
  unless it gives `col`; two steps of one lane never share a column (the
  later one moves right).
- Links run at right angles, crossing bands at the handoffs.
- With `process`, each step gets chips under it, «ENTRA la cabecera», «SALE
  titulo, descripcion», «CON Markdown», one per list it has; every lane leaves
  room for the most chips any step has, so boxes stay aligned.
- The legend shows «Paso», and «Decisión», «Camino principal», «Opcional /
  vuelta», «Entra / sale / con qué» when used.

## What you decide

- **One lane per actor that does something**; a lane with one step is fine. A
  step belongs to one lane: pick the owner.
- **Write steps in flow order**, the first one first: it is where columns are
  counted from.
- **The accent goes on the handoff that matters** (the one that adds the most
  latency or coupling) or the outcome step. A run of accent links joined end
  to end counts as one main path.
- A way back (a correction loop) is a `dash` link.
- Use `process` only when inputs, outputs or tools change the reader's
  understanding; chips are short nouns («el fichero», «esquemas»), and a step
  needs at most one or two per list.

## Complexity budget

| Limit | Value |
| --- | --- |
| Lanes | 5 |
| Steps | 12 |
| Links | 16 |
| Accent elements | 2 (focal steps, and each run of joined accent links) |

Over budget → an overview with one step per phase, and a swimlane per phase.

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| Unnamed or generic lanes («Sistema») | The reader can't tell who acts |
| A step that "belongs" to two lanes | Pick one owner; the handoff is the information |
| Links that snake back and forth | Reorder the steps or pin `col` so the flow runs mostly right |
| Chips on every step, saying the obvious | Noise; drop `process` or the chips that add nothing |
| Labels on every link | The lanes and steps carry the meaning; label only decisions and handoffs |

## Reported

A step in a lane that doesn't exist ("`x` no es ninguno de los carriles"; left
out), a link to an unknown step (left out), `inputs`, `outputs` or `tools`
without the variant ("inputs es de la variante process: añade "variant":
"process""), a step without `id` or `lane`, the budget ("Un diagrama de
carriles lleva como mucho 5 carriles…") and the accents.

## Text version

One line per lane with its steps, "Quien escribe: Escribe la página, Hace
push", then one line per link, "Hace push → Sincroniza: GIT", with names
linked.

## Working example

The guide shows it working (repository `doc-example`):
`diagrams/swimlane-publish.json` and, for the `process` variant,
`diagrams/swimlane-process-page.json`, both in its `diagrams/time` page.
