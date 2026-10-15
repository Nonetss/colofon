# Contenido

La documentación no vive en este repositorio: vive en un **repositorio de
contenido** aparte, con fichas MDX y un catálogo de datos en YAML. La
plataforma lo lee, lo valida y le da al editor lo que necesita para
autocompletar. Las reglas de qué puede declarar un repositorio de contenido
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
| Slug | Su nombre en la URL del catálogo (`documentacion`, `homelab`…). Minúsculas, números y guiones; no se puede cambiar después de crearlo. |
| Origen | **URL externa** (el repositorio vive en GitHub, Gitea…) o **Alojado en la plataforma** (ver abajo). |
| URL | Solo con origen URL externa: la URL `https://` del repositorio git. Para uno privado, las credenciales van en la URL (`https://usuario:token@host/org/repo.git`). La plataforma nunca las muestra ni las escribe en el log. |
| Ref | La rama, el tag o el commit que se descarga. Al poner la URL completa, el formulario lee las ramas del repositorio y las ofrece en una lista, con la rama principal elegida; si no puede leerlas, se escribe a mano. |

El backend guarda un clon de cada repositorio en `.content/<id>/` (en Docker,
en el volumen `content_data`). Lo sincroniza al arrancar, cada cinco minutos
(job `Sincronizar contenido` en `/crons`), al crearlo o al cambiarle la URL o
el ref, y cuando pulsas **Sincronizar** en su fila. Cada sincronización deja
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
