# AGENTS.md

Un **repositorio de contenido de documentación** para la plataforma `doc`: la
guía «Escribir documentación», que explica cómo escribir un repositorio de
contenido y usa cada función que explica. También es el ejemplo que hay que
copiar al empezar el tuyo. Solo contiene contenido: páginas (MDX), el menú,
datos estructurados (YAML), diagramas (JSON) y las skills que la plataforma sirve a
otros agentes. La plataforma, que es otro repositorio, lo clona, lo valida y lo
publica. Aquí no se compila ni se ejecuta nada.

## Sobre este documento

- Las instrucciones para agentes son este `AGENTS.md` más la skill
  `documentation` (`.agents/skills/documentation/`). `CLAUDE.md` solo importa
  este fichero (`@AGENTS.md`) para que todos los agentes lean el mismo texto:
  nunca añadas instrucciones a `CLAUDE.md`.
- Este fichero contiene solo lo que se aplica a **toda** tarea: qué es este
  repositorio, el mapa, las reglas estrictas y el puntero a la skill. El detalle
  de las convenciones vive en las referencias de la skill.
- Las skills viven en `.agents/skills/<name>/`; `.claude/skills/<name>` es un
  enlace simbólico a ellas (`../../.agents/skills/<name>`). Una skill nueva va
  en `.agents/skills/` y recibe el mismo enlace simbólico.
- El detalle de una convención nueva va en una referencia bajo
  `.agents/skills/documentation/references/` más una fila en la tabla de rutas
  de la skill, no en una skill nueva.
- Un cambio en una convención actualiza el fichero que la enuncia, en el mismo
  commit.

## Mapa

| Ruta | Qué contiene |
| --- | --- |
| `doc.config.yaml` | El sitio: nombre, versión del contrato de la plataforma, campos extra de cabecera de las páginas |
| `menu.yaml` | Los grupos de la barra lateral; lo que dice sobre una entrada prevalece sobre las cabeceras de las páginas |
| `docs/` | Las páginas de la guía (`.mdx`). Cada carpeta es una sección con su `index.mdx` |
| `catalogo/<type>/_tipo.yaml` | La declaración de un tipo de datos (los de este sitio describen el propio contrato) |
| `catalogo/<type>/<id>.yaml` | Una entidad: el nombre del fichero es su id |
| `diagramas/<id>.json` | Un diagrama, dibujado a mano o de un tipo (`type`) que la plataforma coloca sola, mostrado en las páginas con `<Diagram id="…" />` |
| `diagramas/<id>.svg` | Una ilustración dibujada a mano en SVG, filtrada y pintada con los colores del tema |
| `skills/<name>/SKILL.md` | Skills que la plataforma **sirve a otros agentes** para trabajar con este sitio |
| `.agents/skills/documentation/` | La skill para **ti**, el agente que escribe aquí |
| `.claude/commands/questions.md` | `/questions`: rondas de preguntas para terminar de documentar una sección |
| `.vscode/settings.json` | El catálogo de esquemas de la plataforma, para el autocompletado en el editor |

Detalles y convenciones: la skill `documentation`.

## Skill del proyecto

Antes de escribir o cambiar nada, carga la skill `documentation` (la
herramienta Skill en Claude Code, o lee `.agents/skills/documentation/SKILL.md`).
Su `SKILL.md` contiene el modelo mental (la guía documenta el contrato y lo usa;
nombres del contrato frente a los de este sitio), las reglas que se aplican
siempre y una tabla de rutas hacia la referencia de cada tarea: estructura y
menú, páginas, catálogo, diagramas, skills servidas y rondas de preguntas. Lee
solo las referencias que necesite la tarea; una tarea que cruza áreas lee
varias.

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

La plataforma lee un conjunto fijo de nombres, escritos en español: `catalogo/`,
`_tipo.yaml`, `menu.yaml`, `diagramas/`, las claves de todo fichero YAML (las de
los diagramas JSON son las de los esquemas de la documentación anterior, en
inglés), los
tipos de campo, la cabecera común de página (`titulo`, `descripcion`, `icono`,
`orden`, `actualizado`), `fuente` y los enlaces `catalogo:`. Traducirlos rompe
la validación. Todo lo demás (ids de tipo, nombres de campo, valores, carpetas,
prosa) es propio de este sitio y se escribe en español; los ids de tipo, los
nombres de campo, los valores y las carpetas que ya existen están en inglés y
no se renombran, y la prosa va en español. La tabla completa está en la skill,
`references/layout.md`.

### Declara antes de usar

La plataforma no sabe nada del dominio: los tipos y sus campos se declaran
aquí. Nunca añadas a una entidad un campo que su `_tipo.yaml` no declare, ni a
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
`catalogo/<type>/`. Los datos estructurados van al catálogo; las explicaciones,
a una página.

## Validación

- El editor valida cada fichero YAML, incluido `menu.yaml`, a través del
  catálogo de esquemas de la plataforma (`yaml.schemaStore.url` en
  `.vscode/settings.json`, que requiere la extensión YAML de Red Hat), y cada
  diagrama con el esquema de diagramas (`json.schemas`, en el mismo fichero).
- La plataforma valida cada push al sincronizar (al instante en un repositorio
  alojado en ella, en cinco minutos como máximo, o de inmediato desde
  `/admin/content`). Las declaraciones inválidas (`doc.config.yaml`,
  `menu.yaml`, un `_tipo.yaml`) nunca sustituyen a las válidas; una página,
  entidad o diagrama roto se reporta y el resto se publica. Los administradores
  ven cada problema en su página (los de `menu.yaml` y los diagramas, en la
  portada), y el log los recoge todos.
- Antes de dar algo por terminado: todo YAML que hayas tocado valida, y todo
  enlace, campo `ficha`, referencia, entrada de menú y `entity` o `page` de
  diagrama apunta a algo que existe.

## Commits

Solo cuando lo pida el usuario. Una frase que diga qué cambia y por qué,
siguiendo el historial existente. Nunca acredites a una herramienta de IA: ni
`Co-Authored-By`, ni «Generated with…».
