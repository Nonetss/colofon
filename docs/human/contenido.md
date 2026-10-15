# Contenido

La documentación no vive en este repositorio: vive en un **repositorio de
contenido** aparte, con fichas MDX y un catálogo de datos en YAML. La
plataforma lo lee, lo valida, lo muestra en su lector y le da al editor lo
que necesita para autocompletar. Las reglas de qué puede declarar un repositorio de contenido
están en la spec `content-contract` y en `packages/content`.

## Forma del repositorio de contenido

| Ruta | Qué hay |
| --- | --- |
| `doc.config.yaml` | Nombre del sitio, versión de la plataforma (`plataforma: "1"`) y los campos extra de la cabecera de las fichas (`cabecera`). |
| `docs/` | Las fichas `.mdx`. Cada carpeta es una sección y lleva su `index.mdx`. |
| `catalogo/<tipo>/_tipo.yaml` | El esquema de un tipo: sus campos y cómo se muestra. El nombre de la carpeta es el id del tipo. |
| `catalogo/<tipo>/<id>.yaml` | Una entidad. El nombre del fichero es su id. |
| `skills/<nombre>/SKILL.md` | Skills para los agentes: cómo trabajar con este sitio. |

La plataforma no sabe nada del dominio: los tipos (máquinas, frutas,
proveedores…) y sus campos los decide el contenido.

## De dónde lo lee el backend

Los repositorios de contenido se guardan en la base de datos y se gestionan en
**`/admin/content`** (“Contenido”, solo administradores). Puede haber varios.
Cada uno tiene:

| Campo | Qué es |
| --- | --- |
| Nombre | Cómo se muestra en el panel. |
| Slug | Su nombre en las URL del lector y del catálogo (`documentacion`, `homelab`…). Minúsculas, números y guiones; no se puede cambiar después de crearlo. No puede ser un nombre reservado por la plataforma: `admin`, `api`, `rpc`, `git`, `login`, `signup`, `me`, `scalar`, `health`, `pwa` ni `404`. |
| Origen | **URL externa** (el repositorio vive en GitHub, Gitea…) o **Alojado en la plataforma** (ver abajo). |
| URL | Solo con origen URL externa: la URL `https://` del repositorio git. Para uno privado, las credenciales van en la URL (`https://usuario:token@host/org/repo.git`). La plataforma nunca las muestra ni las escribe en el log. |
| Ref | La rama, el tag o el commit que se descarga. Al poner la URL completa, el formulario lee las ramas del repositorio y las ofrece en una lista, con la rama principal elegida; si no puede leerlas, se escribe a mano. |

El backend guarda un clon de cada repositorio en `.content/<id>/` (en Docker,
en el volumen `content_data`). Lo sincroniza al arrancar, cada cinco minutos
(el job `Sincronizar contenido`, declarado en código; no tiene pantalla y el
resultado de cada sincronización se ve en la fila del repositorio en
`/admin/content`), al crearlo o al cambiarle la URL o el ref, y cuando pulsas
**Sincronizar** en su fila. Cada sincronización deja
el clon exactamente como el remoto: los cambios hechos a mano en el clon se
pierden. Si el remoto no responde, sigue con lo último que bajó, y la tabla
muestra el error. Si un commit deja el contenido inválido, sigue sirviendo la
última versión válida y apunta los errores en el log, con el fichero y el
motivo. Al borrar un repositorio se borra también su clon.

No hay fuente de carpeta local: para ver un cambio hay que hacer push y
sincronizar (o esperar a los cinco minutos).

### Repositorios alojados en la plataforma

Con origen **Alojado en la plataforma**, la propia plataforma es el servidor
git: no hace falta GitHub ni nada más. Su tarjeta en `/admin/content` muestra
la **URL de git**, `<origen de la plataforma>/git/<slug>.git`, para clonarlo y
hacer push:

```sh
git remote add origen https://docs.example.com/git/manual.git
git push origen main
```

- **Sin credenciales.** Cualquiera que llegue a la plataforma puede clonarlo y
  hacer push, `--force` incluido. Es a propósito; no lo expongas donde eso sea
  un problema.
- Cada push lo sincroniza al momento, sin esperar a los cinco minutos. Se
  publica la rama del campo Ref; los push a otras ramas se guardan pero no
  cambian el contenido.
- Recién creado está vacío, y su última sincronización queda en blanco hasta
  el primer push.
- **`/admin/git`** (“Git”, solo administradores) lista los repositorios
  alojados en tarjetas, con un buscador por nombre o slug. Al abrir uno vas a
  `/admin/git/<slug>`, donde eliges la rama, entras en las carpetas y abres
  los ficheros como texto. Es solo lectura; los binarios y los ficheros de más
  de 512 KB no se muestran. La URL guarda lo que estás viendo, así que se
  puede compartir.
- Los repositorios bare se guardan en `.hosted/<id>/` (en Docker, en el
  volumen `hosted_data`). Puede que sea la única copia del historial:
  inclúyelo en las copias de seguridad.
- Al borrar un repositorio alojado se borra su historial. Si le pones una URL
  externa, la plataforma deja de leerlo pero conserva su repositorio bare
  hasta que lo borres.

## Cómo se escriben las fichas

Cada fichero `docs/**/*.mdx` es una ficha. Cada carpeta de `docs/` es una
sección, con el título de su `index.mdx` (o el nombre de la carpeta si no lo
tiene); el `docs/index.mdx` de la raíz es la portada del repositorio. La
plataforma lee las fichas **sin ejecutar nada**: lo que no sabe leer lo
avisa como un problema.

### Cabecera

Cada ficha empieza con una cabecera YAML:

```mdx
---
titulo: DNS
descripcion: Cómo se resuelven los nombres de la red de casa.
icono: globe
orden: 2
actualizado: 2026-09-30
---
```

| Campo | Qué es |
| --- | --- |
| `titulo` | Obligatorio. El título de la ficha. |
| `descripcion` | Obligatorio. Una frase que se muestra bajo el título. |
| `icono` | Opcional. Un nombre de icono de Lucide en minúsculas y con guiones (`hard-drive`, `git-branch`). |
| `orden` | Opcional. Un número que ordena la ficha dentro de su sección; las que no lo tienen van al final, y a igualdad, por título. |
| `actualizado` | Opcional. Fecha `AAAA-MM-DD` de la última revisión. Si tiene más de seis meses, la ficha se marca con "Revisar". |

Además admite los campos que declare `cabecera` en `doc.config.yaml`, y
ningún otro.

### Cuerpo

- **Markdown al estilo de GitHub**: tablas, listas de tareas, tachado,
  enlaces automáticos y notas al pie.
- **Avisos**: una cita que empieza por `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`,
  `[!WARNING]` o `[!CAUTION]` se muestra como un aviso titulado Nota,
  Consejo, Importante, Aviso o Precaución:

  ```mdx
  > [!WARNING]
  > Este cambio reinicia el router.
  ```

- **Comentarios**: `{/* … */}` se descarta sin avisar.
- **Encabezados**: el título es `titulo`, así que el cuerpo empieza en `##`.
  Un `#` de primer nivel se avisa como problema.
- **Enlaces entre fichas**: con la ruta relativa al `.mdx` (`dns.mdx`,
  `../red/index.mdx#zonas`). Se convierten en rutas del lector y conservan el
  `#ancla`. Un enlace a una ficha que no existe se avisa y se muestra como
  texto.
- **Enlaces a entidades**: `[docker-01](catalogo:machines/docker-01)` lleva
  a la página de la entidad, que es el valor del primer campo `ficha` que
  declara su tipo. Si la entidad no tiene, se muestra como texto sin avisar;
  si el tipo o la entidad no existen, se avisa como enlace roto.
- **Imágenes**: con la ruta relativa a un fichero dentro de `docs/` (png,
  jpg, jpeg, gif, webp, avif o svg, de 10 MiB como mucho). Las sirve la
  plataforma. Un enlace a cualquier otro tipo de fichero se avisa.

### Componentes

La plataforma ofrece dos componentes. Cada uno va en su propio bloque, con una
línea en blanco antes y después; dentro de un párrafo se avisa y se muestra
como un aviso.

- **`<Callout>`**: un aviso con Markdown dentro. `type` es `note` (por
  defecto), `info`, `tip`, `important`, `warning`, `caution` o `danger`, y
  `title` cambia su título:

  ```mdx
  <Callout type="info" title="Antes de empezar">
  Las claves están en el vault, nunca en la documentación.
  </Callout>
  ```

- **`<Entities>`**: una tabla con las entidades válidas de un tipo del
  catálogo, ordenadas por su `etiqueta` (o su id):

  ```mdx
  <Entities type="services" group="category" columns="name,status,summary" />
  ```

  | Atributo | Qué hace |
  | --- | --- |
  | `type` | Obligatorio. El tipo, el nombre de su carpeta en `catalogo/`. |
  | `columns` | Opcional. Los campos que se muestran, separados por comas (`id` vale). Sin él, los de `vista.columnas` del tipo; sin estos, la etiqueta y todos los campos. |
  | `group` | Opcional. Un campo por el que se parte la tabla en bloques, en el orden de `valores` si es un `enum`, con las entidades sin valor al final. |

  La columna de la etiqueta enlaza a la página de cada entidad (su primer
  campo `ficha`). Las referencias muestran la etiqueta de la entidad a la que
  apuntan, los campos `ficha` el título de su página y los `url` son enlaces.
  Un tipo, columna o atributo que no existen y las entidades que no cumplen
  su tipo se avisan como problemas de la ficha; el resto de la tabla se
  muestra igual.

No se admiten `import`/`export`, las `{expresiones}` ni otros componentes
JSX: se avisan como problemas, y un componente que la plataforma no tiene,
como `<Entidades />`, se muestra como un aviso "El componente <Entidades> no
existe en la plataforma".

### Problemas

Los problemas de una ficha (cabecera inválida, componentes, enlaces rotos…)
se ven **solo los administradores**, en la propia ficha, y se escriben en el
log una vez por cada commit sincronizado. La ficha se muestra igualmente con
lo que se pudo leer.

## Cómo se leen las fichas

Cualquier usuario con sesión lee todos los repositorios:

| Ruta | Qué es |
| --- | --- |
| `/` | La portada "Todos": cada repositorio con su descripción y sus secciones. Si solo hay uno, o el selector está en uno, lleva directamente a `/<slug>`. |
| `/<slug>` | La portada del repositorio (su `docs/index.mdx`). |
| `/<slug>/<ruta>` | Una ficha: `docs/red/dns.mdx` es `/<slug>/red/dns`. |

El sidebar tiene arriba un **selector de repositorio**: "Todos" muestra cada
repositorio como un grupo con sus secciones, y uno solo muestra sus
secciones. La elección se recuerda en la cookie `docs_scope`, sigue a la
ficha que abres y acota también la búsqueda del navbar. En el móvil, el
sidebar se abre desde el navbar. Cada ficha lleva sus migas, los campos de la
cabecera, la anterior y la siguiente, y en pantallas anchas el índice "En
esta página".

### Que una IA lea la documentación

Cada ficha se lee también en Markdown, sin el HTML, añadiendo `/llm.txt` a su
dirección (`/<slug>/red/dns/llm.txt`, o `/<slug>/llm.txt` para la portada). Es
el mismo texto que copia "Copiar en Markdown", con los enlaces como
direcciones completas. Para que una IA encuentre las fichas hay dos índices,
según [llmstxt.org](https://llmstxt.org):

| Ruta | Qué es |
| --- | --- |
| `/llms.txt` | Todos los repositorios con contenido, uno por sección, cada ficha enlazada a su `llm.txt` con su descripción. |
| `/<slug>/llms.txt` | Lo mismo para un solo repositorio. |

Piden la misma credencial que el lector: la sesión del navegador o, para un
agente, una API key (se crea en `/admin/api-keys`) en la cabecera
`x-api-key`. Sin credencial responden `401` con una línea que lo explica, en
lugar de mandar al login. Las direcciones completas salen de `CORS_ORIGIN`.

Las API keys se crean sin límite de peticiones; las creadas antes de este
cambio conservan el límite del plugin (10 al día, y cada `llm.txt` gasta dos),
así que la que use un agente hay que volver a crearla.

## Autocompletado en el editor

El backend sirve, sin login, un **catálogo de schemas** por repositorio, con
su slug al final:

```
GET /api/v1/content/schemas/<slug>
```

La extensión YAML de Red Hat (`redhat.vscode-yaml`, en VS Code y Cursor) lo
usa para autocompletar, validar y documentar cada YAML del contenido: los
campos de cada tipo con su descripción, los valores de cada `enum`, los ids
que acepta cada referencia y las rutas de las fichas. Basta **un ajuste**; la
URL exacta de cada repositorio se copia desde su fila en `/admin/content`:

```json
{
  "yaml.schemaStore.url": "https://<sitio>/api/v1/content/schemas/<slug>"
}
```

Dónde va depende de qué tengas abierto:

- **El repositorio de contenido solo**: en su `.vscode/settings.json`,
  commiteado y apuntando a producción. Quien clone el repositorio tiene
  autocompletado sin hacer nada.
- **Un workspace con varias carpetas** (por ejemplo la plataforma y el
  contenido): en los ajustes **del workspace**. La extensión YAML solo lee
  este ajuste del workspace, nunca del `.vscode/` de cada carpeta.

Nadie genera ni commitea schemas: un tipo, una entidad o una ficha nuevos
salen en el catálogo después de la sincronización que los trae.

### Cosas a saber

- **Ese ajuste sustituye el catálogo público de SchemaStore** en esa ventana:
  ficheros como `compose.yml` o los workflows de GitHub pierden su
  autocompletado mientras esté puesto. En el repositorio de contenido no
  importa; en un workspace con la plataforma es el precio de tenerlo.
- **En desarrollo, el certificado local no es de confianza para la
  extensión.** El catálogo de `https://localhost:4321` no se descarga con la
  configuración por defecto (`http.proxyStrictSSL` activado). Hay dos salidas:
  apuntar al catálogo de producción si solo editas contenido, o poner
  `"http.proxyStrictSSL": false` en tus ajustes de usuario mientras
  desarrollas la plataforma.
- **Lo que expone el catálogo**: los nombres de tipos y campos, sus
  descripciones, los ids de las entidades y las rutas de las fichas. Nunca el
  texto de las fichas, los valores de las entidades (una IP, una URL…) ni la
  URL del repositorio.
- **Un slug que no existe responde 404**; uno recién creado responde un
  catálogo vacío hasta que termina su primera sincronización.
- **El editor guarda los schemas mientras la sesión está abierta.** Si un id
  nuevo no aparece en las sugerencias, reabre el fichero o recarga la ventana
  (Developer: Reload Window).
