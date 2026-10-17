# AGENTS.md

Un **repositorio de contenido de documentación** para la plataforma colofon.
Solo contiene contenido: páginas (MDX), el menú, datos estructurados (YAML),
diagramas (JSON), estilos propios (CSS) y las skills que la plataforma sirve
a los agentes que leen el sitio. La plataforma, que es otro repositorio, lo
clona, lo valida y lo publica. Aquí no se compila ni se ejecuta nada.

Qué documenta este repositorio en concreto y sus convenciones propias están
al final, en [«Este sitio»](#este-sitio).

## Sobre este documento

- Las instrucciones para agentes son este `AGENTS.md` más las skills de
  `.agents/skills/` y los commands de `.agents/commands/doc/`. `CLAUDE.md` solo
  importa este fichero (`@AGENTS.md`) para que todos los agentes lean el mismo
  texto: nunca añadas instrucciones a `CLAUDE.md`.
- **`.agents/` es común a todos los repositorios de contenido de colofon.**
  Explica cómo se documenta para la plataforma, nunca qué contiene un sitio.
  Se copia tal cual de la plantilla (`doc-example`) y no se edita en el
  repositorio de un sitio: solo se cambia en la plantilla, y cada sitio la
  vuelve a copiar entera.
- Todo lo que es propio de este sitio vive en la sección «Este sitio» de este
  fichero, o en sus declaraciones (`doc.config.yaml`, `menu.yaml`,
  `catalog/*/_type.yaml`). Una convención nueva del sitio va a «Este sitio»,
  en el mismo commit que el cambio que la introduce.
- Todo lo que hay antes de «Este sitio» es igual en todos los repositorios de
  contenido.
- Las skills viven en `.agents/skills/<name>/`, y `.claude/skills/<name>` es
  un enlace simbólico a ellas (`../../.agents/skills/<name>`). Los commands
  viven en `.agents/commands/doc/<name>.md`, se invocan como `/doc:<name>`, y
  `.claude/commands/doc` enlaza a esa carpeta.

## Mapa

| Ruta | Qué contiene |
| --- | --- |
| `doc.config.yaml` | El sitio: nombre, versión del contrato de la plataforma, campos extra de cabecera de las páginas (`cabecera`) |
| `menu.yaml` | Los grupos de la barra lateral; lo que dice sobre una entrada prevalece sobre las cabeceras de las páginas |
| `docs/` | Las páginas (`.mdx`). Cada carpeta es una sección con su `index.mdx` |
| `catalog/<type>/_type.yaml` | La declaración de un tipo de datos y sus campos |
| `catalog/<type>/<id>.yaml` | Una entidad: el nombre del fichero es su id |
| `diagrams/<id>.json` | Un diagrama, dibujado a mano o de un tipo (`type`) que la plataforma coloca sola, mostrado en las páginas con `<Diagram id="…" />` |
| `diagrams/<id>.svg` | Una ilustración dibujada a mano en SVG, filtrada y pintada con los colores del tema |
| `styles/<módulo>.css` | Los estilos propios del sitio (opcional), un fichero por módulo de la plataforma (`theme.css`, `tables.css`…), aplicados encima de los suyos |
| `skills/<name>/SKILL.md` | Skills que la plataforma **sirve a los agentes que leen** el sitio: sobre el proyecto documentado, propias de cada sitio |
| `.agents/skills/` | Las skills **para ti**, el agente que escribe aquí: comunes a todo sitio |
| `.agents/commands/doc/` | Los commands `/doc:` comunes: `questions`, `pending`, `check`, `review`, `new-page`, `diagram` |
| `.vscode/settings.json` | El catálogo de esquemas de la plataforma, para el autocompletado en el editor |

## Skills del proyecto

Antes de escribir o cambiar nada, carga la skill `documentation` (la
herramienta Skill en Claude Code, o lee `.agents/skills/documentation/SKILL.md`)
y la skill de la carpeta que vas a tocar:

| Carpeta | Skill | Qué contiene |
| --- | --- | --- |
| La raíz (`doc.config.yaml`, `menu.yaml`) | `documentation` | El modelo mental (lo común frente a lo del sitio, dónde se explica el contrato), las reglas que se aplican siempre, la estructura y el menú, la validación y las rondas de preguntas |
| `docs/` | `docs` | Dónde va una página y cómo se llama, la cabecera, cómo se lee una página, el MDX sin código, los componentes y los enlaces |
| `catalog/` | `catalog` | Datos o página, cómo se escriben un `_type.yaml` y una entidad, y cómo se muestran con `<Entities>` |
| `diagrams/` | `diagrams` | Qué forma elegir, una referencia por tipo, recetas dibujadas a mano y cómo se escriben y se comprueban |
| `styles/` | `styles` | Variable del tema o regla de un módulo, cómo se escribe un módulo y dónde se reportan sus problemas |
| `skills/` | `skills` | Las skills que la plataforma sirve a los agentes que leen el sitio |

Una tarea que cruza carpetas carga varias. El contrato de la plataforma lo
explica la guía «Escribir documentación» (repositorio `doc-example` en la
plataforma); las skills citan sus páginas por ruta.

## Reglas estrictas

### No edites `.agents/`

Las skills y los commands de `.agents/` son comunes a todos los sitios. Nunca
los cambies, añadas ni borres en el repositorio de un sitio, aunque no
encajen con él. Si una skill está mal o le falta algo, díselo al usuario: se
corrige en la plantilla `doc-example`. Lo que es propio de este sitio va en
«Este sitio».

### Nunca escribas un secreto

Ninguna contraseña, token, clave de API, frase de paso ni clave privada entra en
este repositorio: ni en una página, ni en una entidad, ni en un ejemplo, ni en
un comentario. Un repositorio de contenido se clona en servidores y lo leen
agentes; lo que entra aquí deja de ser secreto.

- Documenta **dónde** está la credencial y **qué cuenta** usar («la cuenta
  `admin`, en la bóveda como conexión `komodo`»), nunca su valor.
- Si alguien te da un secreto para documentar algo, úsalo solo para la tarea y
  nunca lo copies en un fichero.
- Si encuentras uno ya escrito, díselo al usuario en lugar de continuar.

### No renombres el contrato

La plataforma lee un conjunto fijo de nombres. En inglés: los ficheros y
carpetas (`catalog/`, `_type.yaml`, `menu.yaml`, `diagrams/`, `styles/` y sus
módulos), los enlaces `catalog:` y las claves de los diagramas JSON. En
español: las claves de todo fichero YAML, los tipos de campo, la cabecera
común de página (`titulo`, `descripcion`, `icono`, `orden`, `actualizado`) y
`fuente`. Cambiarlos rompe la validación. Todo lo demás (ids de tipo, nombres
de campo, valores, carpetas, prosa) es propio del sitio, y lo que ya existe no
se renombra. La tabla completa está en la skill `documentation`,
`references/contract-names.md`.

### Declara antes de usar

La plataforma no sabe nada del dominio: los tipos y sus campos se declaran
aquí. Nunca añadas a una entidad un campo que su `_type.yaml` no declare, ni a
una página un campo de cabecera que `doc.config.yaml` no declare bajo
`cabecera`.

### Las páginas no llevan código

Solo Markdown y los componentes de la plataforma (`Callout`, `Entities`,
`Diagram`). Nunca `import`, `export` ni expresiones `{…}`: la plataforma las
rechaza. En la prosa, escribe entre comillas invertidas todo lo que lleve `<` o
`{`.

### El menú y el YAML mandan

Toda página debe mostrarla `menu.yaml`; ninguna puede acabar en «Otros». Los
iconos de las páginas que muestra el menú se indican allí, no en sus cabeceras,
y un título fijado en el menú debe coincidir con el `titulo` de la página. Todo
`icono` es un nombre de icono de Lucide.

### Una entidad por fichero

Nunca pongas varias entidades en un mismo YAML ni mantengas catálogos fuera de
`catalog/<type>/`. Los datos estructurados van al catálogo; las explicaciones,
a una página.

## Validación

- El editor valida cada fichero YAML, incluido `menu.yaml`, a través del
  catálogo de esquemas de la plataforma (`yaml.schemaStore.url` en
  `.vscode/settings.json`, que requiere la extensión YAML de Red Hat), y cada
  diagrama con el esquema de diagramas (`json.schemas`, en el mismo fichero).
- La plataforma valida cada push al sincronizar (al instante en un repositorio
  alojado en ella, en cinco minutos como máximo, o de inmediato desde
  `/admin/content`). Las declaraciones inválidas (`doc.config.yaml`,
  `menu.yaml`, un `_type.yaml`) nunca sustituyen a las válidas; una página,
  entidad o diagrama roto se reporta y el resto se publica. Los administradores
  ven cada problema en su página (los de `menu.yaml`, los diagramas y
  `styles/`, en la portada), y el log los recoge todos.
- Antes de dar algo por terminado: todo YAML que hayas tocado valida, y todo
  enlace, campo `ficha`, referencia, entrada de menú y `entity` o `page` de
  diagrama apunta a algo que existe.

## Commits

Solo cuando lo pida el usuario. Una frase que diga qué cambia y por qué,
siguiendo el historial existente. Nunca acredites a una herramienta de IA: ni
`Co-Authored-By`, ni «Generated with…».

## Este sitio

Lo único de este fichero que cambia de un repositorio de contenido a otro.

### Qué es

La guía **«Escribir documentación»**: explica cómo escribir un repositorio de
contenido para la plataforma y **usa cada función que explica**, de modo que
sus propios ficheros son los ejemplos que copia quien empieza. Es además la
plantilla: su `.agents/` es el original del que copian todos los sitios.
Cuando la guía y la plataforma no coinciden, es un error de la guía.

### Nombres

Los ids de tipo, los nombres de campo, los valores de enum, las carpetas, los
ficheros y los ids de entidad y de diagrama están en inglés; la prosa, los
títulos, los grupos del menú y los valores pensados para leerse, en español.
El id de una entidad es el valor del contrato cuando lo hay
(`field-kinds/ref`, `header-fields/titulo`, `diagram-types/org-chart`); si
no, un nombre corto (`files/doc-config`).

### Secciones

Una carpeta por tema, nunca más honda que `docs/<tema>/<página>.mdx`:
`repository` (el repositorio, la configuración, el menú, los estilos),
`pages` (cabecera, Markdown, componentes), `data` (el catálogo: `docs/catalog/`
está reservado), `diagrams` (una página por familia de tipos, más `drawn` e
`illustrations`) y `publishing` (el editor, los agentes que leen y los que
escriben). En la raíz, la portada y `getting-started.mdx`. Cada grupo de
`menu.yaml` muestra carpetas enteras, cada una con su icono; el catálogo sale
como `{ ruta: catalog, titulo: Referencia }` en «Datos».

### Cómo se lee una página de la guía

Cada página explica una parte del contrato y es un ejemplo de sí misma. Las
páginas modelo son `docs/repository/menu.mdx` y `docs/pages/components.mdx`.

1. **La cabecera** cita las entidades que explica (`files`, `components`,
   `diagram_types`), y la `page` de cada una de esas entidades apunta aquí.
2. **La cosa en sí**: un ejemplo corto y copiable del fichero o bloque.
3. **Sus partes**: una tabla `| Clave | Qué es |` cuyas filas empiezan por
   «Obligatoria.» u «Opcional.», y una frase sobre cualquier otra clave.
4. **Funcionando**: el componente o el diagrama real, justo debajo del bloque
   que lo escribe.
5. **Qué se reporta**: qué se reporta, dónde se ve (en la página, en la
   portada o en el log) y qué sigue funcionando, con los mensajes de la
   plataforma citados tal cual.
6. En el `index.mdx` de una sección, una tabla «¿Dónde encuentro…?».

- Una función que la guía describe pero no muestra funcionando, pudiendo
  hacerlo, es un error.
- Los ejemplos usan un dominio de homelab (`machines`, `docker-01`,
  `network/dns`) para que se lean como un sitio real.
- Las tablas de referencia (ficheros, tipos de campo, campos de cabecera,
  componentes, tipos de diagrama) son siempre `<Entities>` de su catálogo,
  nunca tablas escritas a mano.
- `actualizado` es la fecha en que la página se revisó contra la plataforma.

### Cabecera

`doc.config.yaml` declara `files`, `components` y `diagram_types` (listas de
`ref` a esos tipos) y `open_questions`.

### Catálogo: el propio contrato como datos

| Tipo | Una entidad por… | Muestra funcionando |
| --- | --- | --- |
| `files` | Fichero o carpeta que puede tener un repositorio | un `enum` (`kind`) y una `ficha` (`page`) |
| `field-kinds` | Tipo de campo; el id es el tipo | un `enum` para agrupar (`family`) |
| `header-fields` | Campo común de cabecera; el id es el campo | un `ref` (`kind` → `field-kinds`) |
| `components` | Componente de página | una `lista` de `objeto` (`attributes`) |
| `diagram-types` | Tipo de diagrama; el id es su valor de `type` | un `enum` para agrupar (`family`, que decide su página de `docs/diagrams/`) |

- Los campos y su significado están en cada `_type.yaml`. La `ficha` de la
  página que explica una entidad se llama siempre `page`.
- Toda entidad lleva `fuente: manual` y como `actualizado` la fecha en que se
  comprobó contra el código de la plataforma.
- `components.attributes` es la fuente de los atributos que lista la skill
  `docs` (`references/components.md`, en la plantilla).

### Diagramas

| Fichero | Qué muestra | Dónde sale |
| --- | --- | --- |
| `diagrams/pipeline.json` | De un push al lector, al editor y a los agentes | la portada, `diagrams`, `diagrams/drawn`, `pages/components`, `publishing` |
| `diagrams/repository.json` | Los ficheros de un repositorio y cómo se relacionan | la portada, `repository`, `data` |
| `diagrams/<type>-<topic>.json` | Un ejemplo de cada tipo y de cada variante | la página de su familia, en la sección de su tipo |
| `diagrams/sync-shapes.json`, `diagram-forms.json` | Las formas, curvas, bucles, cabezas UML y `ops` de la forma dibujada | `diagrams/drawn` |
| `diagrams/repository-exploded.svg` | El ejemplo de ilustración | `diagrams/illustrations` |

- Los ejemplos de tipo se llaman `<type>-<topic>`; los dibujados, por tema.
- En los diagramas, un fichero del contrato es `"entity": "files/<id>"`, un
  componente `"components/<id>"` y un campo de cabecera
  `"header-fields/<id>"`.
- Las secciones «Working example» de las referencias de la skill `diagrams`
  nombran estos ficheros. Renombrar o mover un ejemplo, o la página de su
  familia, obliga a actualizar esa referencia aquí, en la plantilla.

### Estilos

Un solo módulo, `styles/theme.css`, que solo cambia el acento: `--primary`
en `:root` y en `.dark`, con el terracota de la plataforma
(`oklch(0.6724 0.1308 38.7559)` en los dos temas). Existe para que la guía
muestre `styles/` funcionando sin dejar de parecerse a cualquier sitio. Se
añade otro módulo solo cuando una página necesita mostrarlo funcionando, y
esa página dice que es el ejemplo. `docs/repository/styles.mdx` es la página
en la que comprobar un módulo: tiene enlaces, negrita, código, tablas y un
callout.

### Skill servida

`skills/guide/SKILL.md` (publicada como `doc-example-guide`) dice a cualquier
agente dónde explica la guía cada parte del contrato. Es corta y apunta a la
guía en vivo (`/doc-example/llms.txt`, las páginas «Referencia»). Cuando
cambia una regla que enuncia o se mueve algo a lo que apunta, se actualiza en
el mismo cambio. Las skills propias de la plataforma (`doc-writing`,
`colofon`) viven en el repositorio de la plataforma, en `packages/api/skills/`.

### Mantener la guía al día con la plataforma

Cuando la plataforma cambia lo que lee, el catálogo, la página que lo explica
y, si hace falta, las skills comunes de `.agents/` cambian en el mismo
cambio. El código está en `packages/content/src/` del repositorio de la
plataforma (con esta guía dentro como subtree: `../packages/content/src/`).
Léelo para comprobar hechos; nunca lo edites desde aquí.

| Tipo | Dónde está la verdad (`packages/content/src/`) |
| --- | --- |
| `files` | `load.ts`, `source.ts` y la spec OpenSpec `content-contract` |
| `field-kinds` | `meta-schema.ts` (`SCALAR_FIELD_KINDS` y las formas `enum`, `ref`, `lista`, `objeto`), `entity-schema.ts` |
| `header-fields` | `meta-schema.ts` (`PAGE_HEADER_FIELDS`), `pages/header.ts` |
| `components` | `pages/transform.ts` (`Callout`, `Diagram`), `pages/entities.ts` (`Entities`) |
| `diagram-types` | `pages/diagram-types/<type>.ts` (claves, variantes, presupuesto), `pages/diagrams.ts` |

| La plataforma… | En `catalog/` | En `docs/` y lo demás |
| --- | --- | --- |
| Añade un fichero, tipo de campo, campo de cabecera, componente o tipo de diagrama | Una entidad nueva, `fuente: manual`, `actualizado` de hoy, `page` a su página | La página lo explica y cita la entidad en su cabecera. Un tipo de diagrama recibe además su sección en la página de su familia, su ejemplo `<type>-<topic>` y, en `.agents/skills/diagrams/`, su referencia `type-<type>.md` con su fila en la tabla de formas |
| Cambia uno (un atributo, un valor de enum, un presupuesto) | Actualiza los campos y `actualizado` | Actualiza el ejemplo, la tabla de claves y «Qué se reporta» de la página, y la skill común que lo cuente |
| Quita uno | Borra la entidad | Quítalo de la página, de toda cabecera que lo cite y de las skills comunes |
| Añade una propiedad que toda entidad de un tipo debe mostrar | Un campo nuevo en `_type.yaml` (`opcional: true` hasta rellenarlo), y luego todas las entidades | La columna en los `<Entities>` que la necesiten |
| Cambia una regla que enuncia una skill servida | — | `skills/guide/SKILL.md` en el mismo cambio |

Cuando el usuario pida sincronizar la guía con la plataforma (un tipo o
todos):

1. **Informe, sin editar.** Para cada tipo, lista las entidades
   (`ls catalog/<type>/`) y lo que tiene la plataforma (la constante o
   carpeta de la tabla), y empareja unas con otras. Compara después cada
   valor (atributos, valores de enum, presupuestos, variantes, claves) con el
   código. Responde con una tabla por tipo: lo que la plataforma tiene y la
   guía no, lo que la guía tiene y la plataforma ya no, y lo que difiere, con
   los ficheros que tocaría cada cosa (páginas, cabeceras, ejemplos,
   referencias de `diagrams`, `skills/guide`).
2. **Aplicar, solo cuando el usuario lo diga.** Aplica lo aprobado siguiendo
   la tabla anterior. Sube `actualizado` en toda entidad y página que hayas
   comprobado, haya cambiado o no. Comprueba lo tocado como hace
   `/doc:check`. Lo que no puedas resolver con el código queda como
   `open_questions` en su página, no como una suposición.

Cuando una página se mueve o se renombra, actualiza cada `page:` que la
nombre (`grep -rn "^page: <ruta/vieja>$" catalog`): una `ficha` a una página
que no existe hace fallar a su entidad, que desaparece de todas las tablas.
