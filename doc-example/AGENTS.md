# AGENTS.md

Un **repositorio de contenido de documentación** para la plataforma `doc`: la
guía «Escribir documentación», que explica cómo escribir un repositorio de
contenido y usa cada función que explica. También es el ejemplo que hay que
copiar al empezar el tuyo. Solo contiene contenido: páginas (MDX), el menú,
datos estructurados (YAML), diagramas (JSON) y las skills que la plataforma sirve a
otros agentes. La plataforma, que es otro repositorio, lo clona, lo valida y lo
publica. Aquí no se compila ni se ejecuta nada.

## Sobre este documento

- Las instrucciones para agentes son este `AGENTS.md` más las skills de
  `.agents/skills/`: `documentation`, la del repositorio entero, y una por
  cada carpeta de contenido (`docs`, `catalog`, `diagrams`, `styles`, `skills`).
  `CLAUDE.md` solo importa
  este fichero (`@AGENTS.md`) para que todos los agentes lean el mismo texto:
  nunca añadas instrucciones a `CLAUDE.md`.
- Este fichero contiene solo lo que se aplica a **toda** tarea: qué es este
  repositorio, el mapa, las reglas estrictas y el puntero a la skill. El detalle
  de las convenciones vive en las referencias de la skill.
- Las skills viven en `.agents/skills/<name>/`; `.claude/skills/<name>` es un
  enlace simbólico a ellas (`../../.agents/skills/<name>`). Una skill nueva va
  en `.agents/skills/` y recibe el mismo enlace simbólico. Los commands siguen
  la misma regla: viven en `.agents/commands/doc/<name>.md`, se invocan como
  `/doc:<name>`, y `.claude/commands/doc` enlaza a la carpeta
  (`../../.agents/commands/doc`). Un command nuevo va en esa carpeta y no
  necesita enlace propio.
- El detalle de una convención nueva va en la skill de la carpeta a la que
  afecta; lo que afecta al repositorio entero (los ficheros de la raíz, el
  menú, las rondas de preguntas), en una referencia de `documentation`. Una
  carpeta de contenido nueva recibe su propia skill y una fila en la tabla de
  rutas de `documentation`.
- Un cambio en una convención actualiza el fichero que la enuncia, en el mismo
  commit.

## Mapa

| Ruta | Qué contiene |
| --- | --- |
| `doc.config.yaml` | El sitio: nombre, versión del contrato de la plataforma, campos extra de cabecera de las páginas |
| `menu.yaml` | Los grupos de la barra lateral; lo que dice sobre una entrada prevalece sobre las cabeceras de las páginas |
| `docs/` | Las páginas de la guía (`.mdx`). Cada carpeta es una sección con su `index.mdx` |
| `catalog/<type>/_type.yaml` | La declaración de un tipo de datos (los de este sitio describen el propio contrato) |
| `catalog/<type>/<id>.yaml` | Una entidad: el nombre del fichero es su id |
| `diagrams/<id>.json` | Un diagrama, dibujado a mano o de un tipo (`type`) que la plataforma coloca sola, mostrado en las páginas con `<Diagram id="…" />` |
| `diagrams/<id>.svg` | Una ilustración dibujada a mano en SVG, filtrada y pintada con los colores del tema |
| `styles/<módulo>.css` | Los estilos propios del sitio (opcional), un fichero por módulo de la plataforma (`theme.css`, `tables.css`…), aplicados encima de los suyos en sus páginas |
| `skills/<name>/SKILL.md` | Skills que la plataforma **sirve a otros agentes** para trabajar con este sitio |
| `.agents/skills/documentation/` | La skill para **ti**, el agente que escribe aquí: el repositorio entero |
| `.agents/skills/<carpeta>/` | Una skill por carpeta de contenido (`docs`, `catalog`, `diagrams`, `styles`, `skills`): cómo se escribe lo que va en ella |
| `.agents/commands/doc/questions.md` | `/doc:questions`: rondas de preguntas para terminar de documentar una sección |
| `.agents/commands/doc/pending.md` | `/doc:pending`: lo que queda por resolver o revisar en el sitio, por sección |
| `.agents/commands/doc/check.md` | `/doc:check`: comprueba que el contenido valida y lista los problemas, sin editar |
| `.agents/commands/doc/review.md` | `/doc:review`: revisa una página, entidad, diagrama o módulo de estilos contra las convenciones, sin editar |
| `.agents/commands/doc/sync-platform.md` | `/doc:sync-platform`: compara el catálogo y la guía con el contrato actual de la plataforma |
| `.agents/commands/doc/new-page.md` | `/doc:new-page`: escribe una página nueva con su cabecera y su entrada en el menú |
| `.agents/commands/doc/diagram.md` | `/doc:diagram`: elige la forma de un diagrama, lo escribe en `diagrams/` y lo comprueba |
| `.vscode/settings.json` | El catálogo de esquemas de la plataforma, para el autocompletado en el editor |

Detalles y convenciones: la skill `documentation` y la de cada carpeta.

## Skills del proyecto

Antes de escribir o cambiar nada, carga la skill `documentation` (la
herramienta Skill en Claude Code, o lee `.agents/skills/documentation/SKILL.md`)
y la skill de la carpeta que vas a tocar:

| Carpeta | Skill | Qué contiene |
| --- | --- | --- |
| La raíz (`doc.config.yaml`, `menu.yaml`) | `documentation` | El modelo mental (la guía documenta el contrato y lo usa; nombres del contrato frente a los de este sitio), las reglas que se aplican siempre, la estructura y el menú, la validación y las rondas de preguntas |
| `docs/` | `docs` | Las secciones, la cabecera, cómo se lee una página de la guía, el MDX sin código, los componentes y los enlaces |
| `catalog/` | `catalog` | Los tipos de este sitio, cómo se escriben sus entidades y cómo se mantienen al día con la plataforma |
| `diagrams/` | `diagrams` | Qué forma elegir, los diagramas de este sitio y sus ejemplos, y cómo se escriben y se comprueban |
| `styles/` | `styles` | Los estilos propios del sitio: variable del tema o regla de un módulo, el `theme.css` de este sitio, cómo se escribe un módulo y dónde se reportan sus problemas |
| `skills/` | `skills` | Las skills que la plataforma sirve a otros agentes |

Una tarea que cruza carpetas carga varias.

## Reglas estrictas

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
módulos), los enlaces `catalog:` y las claves de los diagramas JSON (las de los
esquemas de la documentación anterior). En español: las claves de todo fichero
YAML, los tipos de campo, la cabecera común de página (`titulo`,
`descripcion`, `icono`, `orden`, `actualizado`) y `fuente`. Cambiarlos rompe la
validación. Todo lo demás (ids de tipo, nombres de campo, valores, carpetas,
prosa) es propio de este sitio y se escribe en español; los ids de tipo, los
nombres de campo, los valores y las carpetas que ya existen están en inglés y
no se renombran, y la prosa va en español. La tabla completa está en la skill
`documentation`, `references/contract-names.md`.

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
