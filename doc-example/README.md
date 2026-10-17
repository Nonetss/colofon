# Escribir documentación

Un **repositorio de contenido** para la plataforma `doc`: la guía para
escribir uno. Explica cómo escribir las páginas, el menú, el catálogo y los
diagramas que publica la plataforma, y usa cada una de esas funciones en sí
misma, de modo que sus propios ficheros son los ejemplos. Cópialo para empezar
tu propia documentación.

Solo contiene contenido. La plataforma, que es otro repositorio, lo clona, lo
valida y lo publica: una web para personas, un catálogo de esquemas para tu
editor, y `llms.txt` y el `llm.txt` de cada página para los agentes de IA. Aquí
no se compila ni se ejecuta nada.

## Qué contiene

| Ruta | Qué contiene |
| --- | --- |
| `doc.config.yaml` | El sitio: su nombre, la versión del contrato de la plataforma y los campos extra de cabecera que usan sus páginas |
| `menu.yaml` | La barra lateral: cuatro grupos (Inicio, Escritura, Datos, Publicación) y lo que muestra cada uno |
| `docs/` | Las páginas de la guía, en MDX. Cada carpeta es una sección con su `index.mdx` |
| `catalog/<type>/` | El propio contrato como datos: los `files` de un repositorio, los `field-kinds`, los `header-fields`, los `components` de página y los `diagram-types`. Las tablas de referencia de la guía se construyen a partir de él |
| `diagrams/` | Los diagramas de la guía, mostrados con `<Diagram id="…" />`: los dibujados a mano, un ejemplo de cada tipo que la plataforma coloca sola y una ilustración en SVG |
| `skills/guide/SKILL.md` | Una skill que la plataforma sirve a otros agentes: dónde explica esta guía cada parte del contrato |
| `AGENTS.md` | Instrucciones para el agente de IA que escribe aquí: las reglas comunes y, en «Este sitio», lo propio de la guía |
| `.agents/skills/colofon-*/`, `.claude/` | Las skills de escritura de colofon, **las mismas para todo repositorio de contenido**: este es su original, y la plataforma las sirve desde aquí. Tu repositorio no las copia |
| `.vscode/settings.json` | Autocompletado y validación de todos los ficheros YAML, a partir de la plataforma |

## Nombres del contrato frente a los tuyos

La plataforma lee un conjunto fijo de nombres que deben quedarse exactamente
como están: los ficheros y carpetas, en inglés (`doc.config.yaml`,
`menu.yaml`, `docs/`, `catalog/`, `_type.yaml`, `diagrams/`, `styles/`), las
claves de cada fichero YAML, en español (las de los diagramas, que son JSON,
van en inglés), los tipos de campo (`texto`, `ref`, `lista`…), la cabecera que
tiene toda página (`titulo`, `descripcion`, `icono`, `orden`, `actualizado`) y
los enlaces `catalog:`. Todo lo demás es
tuyo, en el idioma en que escribas. La tabla completa está en
`docs/repository/index.mdx`.

## Usarlo como punto de partida

1. **Copia este repositorio** y sustituye sus páginas, su menú, sus tipos de
   catálogo, sus diagramas, sus estilos y su skill servida por los tuyos;
   conserva las claves de `doc.config.yaml` y cambia sus valores. En
   `AGENTS.md`, reescribe solo la sección «Este sitio» con lo propio de tu
   sitio. **No copies `.agents/` ni `.claude/`**: las skills de escritura las
   sirve la plataforma, y tu agente las instala desde ella.
2. **Regístralo en la plataforma** en `/admin/content`: un nombre, un slug, y
   o bien la URL `https://` del repositorio y su rama, o bien «alojado en la
   plataforma» para hacer push a la propia plataforma.
3. **Apunta tu editor a él.** Instala la extensión YAML de Red Hat
   (`redhat.vscode-yaml`, sugerida por `.vscode/extensions.json`) y define
   `yaml.schemaStore.url` en `.vscode/settings.json` con la URL del catálogo
   que `/admin/content` muestra para tu repositorio. Con Ctrl+Espacio el editor
   sugiere cada clave, los valores de cada enum, los ids que acepta cada
   referencia, las rutas que puede nombrar una entrada del menú y los nombres
   de icono. En un espacio de trabajo con varias carpetas, pon ese ajuste en la
   configuración del espacio de trabajo.
4. **Si desarrollas contra una plataforma local** (`https://localhost:4321`):
   la extensión no confía en el certificado local. Añade
   `"http.proxyStrictSSL": false` a la configuración de **usuario** de tu
   editor mientras lo hagas, y quítalo después.

La propia guía, una vez publicada, explica cada paso en detalle: empieza por
su página «Primeros pasos».

## Escribir con un agente de IA

La plataforma sirve las **skills de escritura de colofon**: `colofon-documentation`
para el repositorio entero, una por carpeta (`colofon-docs`, `colofon-catalog`,
`colofon-diagrams`, `colofon-styles`, `colofon-skills`) y una por tarea
(`colofon-new-page`, `colofon-new-diagram`, `colofon-check`, `colofon-review`,
`colofon-pending`, `colofon-questions`). Para instalarlas, copia el texto de
«Skills para tu IA» en `/me`, o la pestaña «Skills» al crear una API key, y
pégaselo a tu agente: las instala todas, junto con `colofon` y las skills de
cada proyecto que puedas leer.

En tu repositorio, `AGENTS.md` (importado por `CLAUDE.md`) le dice al agente
qué skill cargar y, en «Este sitio», lo propio de tu documentación. Por
ejemplo, `/colofon-questions <sección>` ejecuta una ronda de preguntas: el
agente escribe las preguntas en `questions.md`, alguien las responde y, al
ejecutarla de nuevo, pasa las respuestas a las páginas.

## La única regla

**Ningún secreto entra nunca en un repositorio de contenido**: ni contraseña,
ni token, ni clave de API, ni frase de paso, en ningún sitio. Las páginas dicen
qué cuenta se usa y dónde viven sus credenciales, nunca su valor.
