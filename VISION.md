# Visión

Qué es este proyecto, para qué sirve y hacia dónde va. Recoge las decisiones
tomadas al diseñarlo; el detalle técnico de lo ya construido está en las guías
de [`docs/human/`](docs/human/README.md) y en las specs de `openspec/specs/`.

## El propósito

Una **plataforma para documentar sistemas** (la infraestructura del trabajo,
un homelab o cualquier otra cosa) que sirva por igual a **personas** y a
**agentes de IA**.

La idea nace de la documentación de la infraestructura del trabajo. Con su
`llms.txt`, un agente se leyó la documentación, entendió dónde estaba cada cosa
y cuál era el flujo de trabajo, y montó unas copias en Duplicati de forma
autónoma, sin que hubiera que explicarle nada. Funcionó muy bien, pero tenía
dos problemas:

1. **La estructura era improvisada.** Los catálogos de `datos/` crecían a
   mano, cada uno con su forma y su página hecha a medida.
2. **Hubo que pasarle la contraseña de Duplicati al agente.**

Este proyecto busca lo mismo, pero con una estructura definida y **sin que la
IA vea nunca un secreto**.

## Principios

- **La plataforma no sabe nada del dominio.** Los tipos de dato (máquinas,
  servicios, frutas, proveedores…) y sus campos los declara el contenido. La
  misma plataforma vale para la infraestructura del trabajo o para una
  frutería.
- **Plataforma y contenido van en repositorios separados.** La lógica se
  actualiza sin tocar la documentación y al revés, y quien documenta trabaja
  en un repositorio sin código. Entre los dos hay un contrato versionado
  (`plataforma: "1"` en `doc.config.yaml`).
- **El contenido es texto en git.** Fichas MDX y datos YAML; git es la fuente
  de verdad, con su historial, sus diffs y su revisión.
- **El backend lee el contenido en vivo.** Cambiar la documentación no exige
  reconstruir la web: el backend sincroniza el repositorio y lo sirve. La web,
  el editor y el MCP leen la misma copia.
- **El MDX no ejecuta código.** Solo Markdown y los componentes que da la
  plataforma, sin `import`, `export` ni expresiones. El servidor que lee el
  contenido es el mismo que guarda los secretos, así que el contenido nunca
  puede ejecutar nada en él.
- **Los secretos no salen de la bóveda.** Ni en el chat, ni en un fichero que
  la IA pueda leer, ni en las respuestas que recibe.

## Las piezas

| Pieza | Qué es | Estado |
| --- | --- | --- |
| Repositorio de contenido | Fichas MDX, catálogo YAML con esquema y skills, en su propio repo | ✅ Contrato y validación |
| Catálogo con esquemas | Tipos de dato declarados por el contenido, validados | ✅ |
| Autocompletado en el editor | Catálogo de schemas servido por el backend | ✅ |
| Repositorios en la plataforma | Alta, sincronización y estado en `/admin/content` | ✅ |
| Web de documentación | Render de las fichas, páginas por tipo, búsqueda, `llms.txt` | 🟡 Render de las fichas, navegación y selector de repositorios; faltan componentes, páginas por tipo, búsqueda completa y `llms.txt` |
| Diagramas | Declarados en YAML, con layout automático e interactivos | ⏳ |
| Skills | Instrucciones para agentes, servidas por el sitio | ⏳ |
| MCP de conocimiento | Buscar, leer y consultar el catálogo desde cualquier agente | ⏳ |
| Bóveda y broker de secretos | La IA usa APIs sin ver las credenciales | ⏳ |
| Importadores | El catálogo se rellena desde las APIs, sin pasar por el modelo | ⏳ |

### Repositorio de contenido

```
documentacion/
├── doc.config.yaml        # nombre, versión de plataforma, campos extra de la cabecera
├── docs/                  # fichas MDX; cada carpeta es una sección con su index.mdx
├── catalogo/
│   └── maquinas/
│       ├── _tipo.yaml     # el esquema del tipo
│       └── nas.yaml       # una entidad por fichero; el nombre es su id
└── skills/                # skills propias de este sitio
```

Lo que **sí** impone la plataforma: cada carpeta de `docs/` es una sección del
menú, las fichas llevan siempre `titulo` y `descripcion` (y si hace falta
`icono`, `orden` y `actualizado`), y los tipos de campo. Todo lo demás, incluida
la forma de organizar las fichas, lo decide el contenido. Las convenciones de
cada sitio (por ejemplo "cada servicio tiene Qué es, Configuración actual y
Observaciones") viven en sus skills y guías, no en la plataforma.

Guía: [`docs/human/contenido.md`](docs/human/contenido.md).

### Catálogo con esquemas

Cada tipo se declara en `catalogo/<tipo>/_tipo.yaml`: su nombre, sus campos y
cómo se muestra. Los tipos de campo son `texto`, `numero`, `entero`,
`booleano`, `fecha`, `url`, `email`, `ip`, `ficha` (una página de `docs/`),
`enum`, `ref` (una entidad de otro tipo), `lista` y `objeto`, cada uno con
`opcional` y `descripcion`. La `descripcion` de cada campo sustituye a los
comentarios de cabecera que tenían los YAML de la documentación anterior: la
ve quien edita y la lee la IA.

- **Una entidad por fichero.** Diffs limpios, y la IA toca una cosa sin
  reescribir un YAML de miles de líneas.
- **Procedencia.** Toda entidad admite `fuente` (de dónde sale el dato:
  `manual`, `komodo`…) y `actualizado` (la fecha del dato).
- **Referencias.** Una ficha declara de qué habla con los campos que el sitio
  añade a la cabecera en `doc.config.yaml` (`maquinas: [nas]`,
  `frutas: [manzana]`). Eso permite, en cada entidad, la lista de "fichas que
  hablan de esto".
- **Errores en español**, con el fichero, la línea y el campo. Un
  `uso: texto: con dos puntos` sin comillas dice exactamente eso.

### Autocompletado en el editor

El backend sirve un catálogo de schemas por repositorio
(`/api/v1/content/schemas/<slug>`), y el editor lo usa con un solo ajuste
(`yaml.schemaStore.url`). Ctrl+Espacio sugiere los campos de cada tipo, los
valores de los `enum`, los ids que existen en cada referencia y las rutas de
las fichas. No se genera ni se commitea nada: un tipo o una entidad nuevos
aparecen después de sincronizar. En desarrollo, la extensión YAML necesita
`"http.proxyStrictSSL": false` en los ajustes de usuario para aceptar el
certificado local.

### Web de documentación (en parte)

Ya existe el **lector**: `/` es la portada "Todos" con cada repositorio y
sus secciones, `/<slug>` la portada de un repositorio y `/<slug>/<ruta>` una
ficha. El backend convierte cada ficha MDX en un **árbol** sin ejecutar nada
y el frontend lo pinta en el servidor, con un sidebar de secciones y fichas, un
selector de repositorio ("Todos" o uno), migas, anterior y siguiente, y el
índice "En esta página". Las fichas pueden usar dos componentes de la
plataforma: `<Callout>` (un aviso) y `<Entities type="services"
group="category" />` (una tabla del catálogo, servida en el HTML), y enlazar
entidades con `catalogo:machines/docker-01`. Qué admite una ficha está en
[`docs/human/contenido.md`](docs/human/contenido.md#cómo-se-escriben-las-fichas).

Pendiente:

- Montar como islas los **componentes** interactivos (ordenar y filtrar las
  tablas de `<Entities>`, por ejemplo): hoy las tablas son estáticas.
- **Páginas automáticas** por tipo y por entidad, con sus relaciones y las
  fichas que la citan.
- **Búsqueda** en el texto de las fichas (hoy el buscador del navbar solo las
  encuentra por título, descripción y sección) y **`llms.txt`**, que es lo
  primero que lee un agente al llegar.
- **Si un commit rompe el contenido**, el sitio sigue sirviendo la última
  versión válida y muestra los errores a los administradores.

### Diagramas

Siguen el formato de los esquemas de la documentación anterior
(`site/esquemas/lib.mjs`), que ya se veían bien. Aquí:

- Cada diagrama es un **fichero JSON** en `diagramas/`, con las mismas claves
  que `lib.mjs`: **las coordenadas las pone el contenido** (cada caja, cada
  tramo de flecha, cada zona), así un esquema de la documentación anterior se
  pasa casi copiando. Para una fila simple está la cadena, que se coloca sola.
- Se generan como **SVG en el servidor** (visibles sin JavaScript, en claro y
  oscuro) y **todos son interactivos**: resaltar al pasar el ratón, trazar el
  camino desde un origen, qué cae si cae una pieza y una tarjeta con las
  conexiones de cada caja.
- Una caja puede ser **una entidad del catálogo** (`"entity": "maquinas/nas"`)
  y coge de ella el nombre y el enlace.
- Más adelante, **diagramas derivados** que salen solos de las relaciones del
  catálogo.

Se probó el layout automático (ELK) y se dejó: no daba el control del
dibujo que tenían los esquemas hechos a mano.

Descartados: Mermaid (poco control sobre el estilo y la interacción) y D2 (es
un binario de Go, y la interacción habría que añadirla encima).

### Skills (pendiente)

La idea: le dices a un agente "en esta web están las skills de mi trabajo"
(o de mi homelab), y él las descubre, se las trae y a partir de ahí sabe
trabajar con la plataforma desde cualquier proyecto.

- **Dos conjuntos.** Las **de la plataforma**, en este repositorio y comunes a
  cualquier sitio: cómo se escribe una ficha, cómo se hace un diagrama, cómo
  se usan el MCP y las conexiones. Y las **del contenido**, en `skills/` del
  repositorio de contenido: lo propio de ese trabajo ("todo se despliega con
  Komodo", "antes de tocar la red, mira X").
- **Descubrimiento.** `llms.txt` las anuncia; `/skills/index.json` las lista
  con su versión; `/skills/<nombre>/SKILL.md` las sirve en el formato estándar
  de Agent Skills; el MCP también las ofrece.
- **Finas.** Una skill descargada es una foto y se queda vieja, así que dicen
  *cómo trabajar y dónde buscar*, no *qué hay*. El conocimiento se consulta en
  vivo en el sitio.
- Los **procedimientos** ("cómo crear una copia en Duplicati") son fichas
  normales, para personas y agentes. Las skills apuntan a ellas en vez de
  copiarlas.

### MCP de conocimiento (pendiente)

Un MCP en el backend de producción, autenticado con las API keys de Better
Auth, para que cualquier agente consulte la documentación:

- `buscar(texto)`: búsqueda en fichas y catálogo.
- `leer(ruta)`: una ficha en Markdown limpio.
- `entidad(tipo, id)`: una entidad con sus relaciones y las fichas que la
  citan.
- `skills()` / `skill(nombre)`: las skills del sitio.

### Bóveda y broker de secretos (pendiente)

La pieza central. Quiero poder documentar Komodo, Pangolin o Duplicati sin
pasarle nunca una contraseña a la IA, y que sirva para **cualquier app** sin
tener que programar cada una.

**La regla de base.** Un secreto no puede estar en ningún sitio que la IA pueda
leer: ni en el chat, ni en un `.env` local, ni en un fichero del repo (un
agente con Bash puede leer cualquier cosa del disco). Los secretos viven
cifrados en el backend, y la IA solo tiene un mando a distancia.

**Conexiones genéricas.** No se programa "esto es Komodo". Se da de alta una
*conexión* con:

- una **URL base fija**;
- una **autenticación declarativa** con huecos para los secretos, que cubre
  casi todo con pocos tipos:
  - cabeceras (`X-Api-Key: {{api_key}}`, como Komodo);
  - bearer (`Authorization: Bearer {{token}}`, como Pangolin);
  - basic, o un parámetro en la URL;
  - **login previo**: una petición con la contraseña devuelve un token, que se
    extrae, se cachea y se inyecta (como Duplicati);
- los **secretos**, que se escriben desde la web y **nunca se pueden volver a
  leer**, como los secrets de GitHub. Van cifrados (AES-GCM, con una clave
  maestra en el entorno del backend), y solo un administrador gestiona la
  bóveda.

**Herramientas del MCP:**

- `conexiones()`: lo que hay disponible y para qué sirve. Nunca muestra un
  secreto.
- `consultar(conexion, ruta, …)`: llamadas de **lectura**, con un filtro
  opcional (jq) que recorta la respuesta en el servidor para no gastar tokens.
- `actuar(conexion, metodo, ruta, body)`: llamadas que **cambian cosas**. Al
  ser una herramienta aparte, el cliente puede permitir `consultar` siempre y
  pedir confirmación para cada `actuar`.
- `generar_secreto(nombre)`: crea un secreto nuevo en la bóveda. La IA solo
  conoce su nombre.

**Actuar sin ver secretos.** La IA escribe **referencias** en lugar de
valores, y el broker las sustituye justo antes de enviar la petición:

```json
{ "passphrase": "{{secreto:duplicati-cifrado-planka}}" }
```

Así puede montar una copia cifrada o un stack nuevo con su contraseña de base
de datos sin conocerla.

**Blindaje:**

1. **Exfiltración por la petición.** La IA solo elige la ruta: no puede
   cambiar el host ni pisar las cabeceras de autenticación, y no se siguen
   redirecciones a otro host.
2. **Secretos propios en la respuesta.** Antes de devolver nada, se borra el
   valor de cada secreto de la conexión, también en base64 y codificado para
   URL.
3. **Secretos de terceros en la respuesta.** Komodo devuelve las variables de
   entorno de los stacks, y Duplicati sus passphrases. Se redactan con reglas
   (claves como `password`, `secret`, `token`, `key`…) y con detectores de
   formatos conocidos. Seamos honestos: lo que se garantiza es que **tus
   credenciales** no llegan a la IA; lo de terceros se mitiga, no se
   garantiza.
4. **Que no rompa nada.** Cada conexión declara qué rutas son de lectura y
   cuáles de escritura (Komodo es RPC, así que va por ruta, no por método
   HTTP). Por defecto solo lectura.
5. **Auditoría.** Cada llamada queda registrada: quién, con qué conexión, a qué
   ruta y con qué resultado.

Para validar la idea, el primer caso propuesto es **Duplicati**: ya se hizo a
mano en la documentación anterior, tiene login previo (el caso de
autenticación más difícil) y crear una copia necesita una passphrase, que es
justo el caso de las referencias a secretos.

### Importadores (pendiente)

Comandos como "sincroniza los dockers desde la conexión de Komodo" que piden
los datos al broker y escriben las entidades del catálogo, validadas contra su
esquema. Los datos grandes (las 3.000 líneas de dockers de la documentación
anterior) no pasan por el modelo, y regenerarlos es un comando en vez de una
conversación.

### Más adelante

- Conectores además de HTTP: SSH (un `docker ps`, leer un compose) y bases de
  datos en solo lectura.
- Un webhook del servidor git para sincronizar al hacer push, en vez de cada
  cinco minutos.

## Quién lo usa

- **Tú y tus compañeros**, en la web, con login. Los administradores gestionan
  los repositorios de contenido y, cuando exista, la bóveda.
- **Agentes de IA**, por el MCP y las skills, con una API key que les permite
  *hacer llamadas*, no *ver secretos*.

## Qué se ha quitado de la plantilla

Este repositorio nació de la plantilla `stack`. Lo que el producto no
necesitaba se ha quitado: Loki, Tempo y OpenTelemetry, junto con el registro de
actividad y el visor de trazas. Los logs salen por la salida estándar del
contenedor. Con el lector salieron también del frontend la portada de
módulos y las pantallas de los crons; el planificador sigue en el backend y
sus jobs se gestionan por la API. El resto de la base (Better Auth, oRPC,
crons, comentarios, iconos de entidad, Docker, OpenSpec) sigue disponible.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Guía del contenido, de las fichas y del autocompletado | [`docs/human/contenido.md`](docs/human/contenido.md) |
| Lector (código) | `packages/content/src/pages`, `packages/api/src/v1/docs` y `apps/frontend/src/features/docs` |
| Contrato del contenido (código) | `packages/content` |
| Specs | `openspec/specs/content-contract`, `content-editor-schemas` y `content-repository-management` |
| Cambios ya hechos y su porqué | `openspec/changes/archive/` |
| Repositorio de contenido de ejemplo | `https://git.noneweb.online/nonete/documentacion` |
