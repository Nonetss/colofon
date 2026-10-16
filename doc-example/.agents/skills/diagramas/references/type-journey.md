# Journey (`"type": "journey"`)

**Best for:** what one person does across the stages of an experience and
**how it feels** at each: a first repository, an onboarding, a trial. The
sentiment curve is what sets it apart; the reader asks "where does it hurt?".

**Not for:** a process with no feelings in it (use `swimlane` or
`flowchart`), dated events (use `timeline`), the stories of a product sliced
into releases (use `story-map`), or a system with no person in it (draw it by
hand). If you can't name how the person feels at every stage, it isn't a
journey.

## The file

```json
{
  "type": "journey",
  "title": "El primer repositorio de contenido",
  "desc": "Cómo vive quien escribe su primer repositorio, de descubrir la guía a publicarlo",
  "stages": [
    { "name": "Descubre", "sentiment": "bien", "actions": ["Lee la guía"], "page": "getting-started" },
    { "name": "Configura", "sentiment": "neutral", "actions": ["doc.config.yaml", "menu.yaml"] },
    { "name": "Primer push", "sentiment": "mal", "thoughts": ["¿Por qué falla?"], "pain": "muchos avisos" },
    { "name": "Corrige", "sentiment": "bien", "actions": ["Sigue los avisos"] },
    { "name": "Publica", "sentiment": "muy-bien", "actions": ["Comparte el enlace"] }
  ]
}
```

| Key | What it is |
| --- | --- |
| `stages` | Required. Left to right, each an item (see [items.md](items.md); no `id` needed) with `sentiment`: `muy-mal`, `mal`, `neutral`, `bien` or `muy-bien`. |
| `stages[].actions`, `thoughts`, `touchpoints` | Optional. What they do, think, and where it happens: lists of short texts, as rows under the curve. |
| `stages[].pain` | Optional. What hurts at that stage, as a dashed accent tag. |

## What the platform does

- One column per stage (168 px), headed «ETAPA 1», «ETAPA 2»… over its name.
- The **sentiment band**: five hairlines named «Muy bien» to «Muy mal», and a
  smooth curve through one dot per stage at its level.
- The **trough** is the first stage with the lowest sentiment below
  `neutral`: its dot is bigger and in the accent. A journey that never dips
  below `neutral` has none.
- Under the curve, a row per list any stage uses, captioned «HACE», «PIENSA»,
  «DÓNDE»; each `pain` is a dashed accent tag in capitals under that stage's
  actions.
- Accents: the trough counts one, **all the pains together** one more.
- The legend shows «Sentimiento», and «Punto más bajo», «Dolor» when present.

## What you decide

- **One persona per map.** Two curves erase each other.
- **Name every sentiment honestly**; a flat curve means there is nothing to
  map.
- **Pain only where it dips**, at the trough and at most one more stage. Pain
  everywhere is no signal.
- **Don't add `focal`**: the trough and the pain already take the two
  accents, and a focal stage is counted but not drawn differently.
- Texts are short (they are measured against the column): «Lee la guía», not
  a sentence. Use `info` for the rest.

## Complexity budget

| Limit | Value |
| --- | --- |
| Stages | 6 |
| Pains | 2 |
| Accent elements | 2 (the trough, the pains as one, and any focal stage) |

Over budget → split into two journeys (getting started, and staying).

## Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| No dip, every stage `bien` | Nothing to find; it's a process |
| A pain on every stage | Nothing is focal |
| Sentences in `actions` | They overflow the column and are reported |
| An internal system flow with no person | No person, no feeling: draw an architecture |
| More than six stages | Too wide to read; split the journey |

## Reported

A stage with an unknown `sentiment` or none (that stage is left out), a name or text that doesn't fit
its column, the budget ("Un mapa de experiencia lleva como mucho 2 puntos de
dolor…") and the accents.

## Text version

One entry per stage, "Primer push: Mal", with its rows under it: "hace: …",
"piensa: ¿Por qué falla?", "dónde: …", "dolor: muchos avisos".

## In this site

`diagramas/journey-first-repo.json`, shown in `docs/diagrams/time.mdx`.
