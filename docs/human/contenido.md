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

Se configura en el `.env` con **una** de estas dos variables:

| Variable | Qué es | Cuándo se ve un cambio |
| --- | --- | --- |
| `CONTENT_DIR` | Una carpeta. Relativa a la raíz del repo, empezando por `./` o `../` (por ejemplo `../documentacion`), o absoluta. | En la siguiente petición: se lee en cada una. |
| `CONTENT_REPO` | La URL de un repositorio git, con `CONTENT_REF` (rama, tag o commit; por defecto `main`). Para uno privado por HTTPS, las credenciales van en la URL. | Al arrancar el backend y cada cinco minutos (job `Sincronizar contenido` en `/crons`). |

Lo normal es `CONTENT_DIR` en desarrollo y `CONTENT_REPO` en producción.
Poner las dos a la vez es un error y el backend no arranca. Sin ninguna, el
backend funciona igual, pero sin contenido.

Con `CONTENT_REPO`, el backend guarda un clon en `.content/` (en Docker, en el
volumen `content_data`) y en cada sincronización lo deja exactamente como el
remoto: los cambios hechos a mano en el clon se pierden. Si el remoto no
responde, sigue con lo último que bajó. Si un commit deja el contenido
inválido, sigue sirviendo la última versión válida y apunta los errores en el
log, con el fichero y el motivo.

En Docker (los tres compose), la carpeta de `CONTENT_DIR` se monta en el
contenedor del backend en solo lectura. No hace falta reiniciar nada al
editar: el backend la lee en cada petición.

## Autocompletado en el editor

El backend sirve, sin login, un **catálogo de schemas**:

```
GET /api/v1/content/schemas
```

La extensión YAML de Red Hat (`redhat.vscode-yaml`, en VS Code y Cursor) lo
usa para autocompletar, validar y documentar cada YAML del contenido: los
campos de cada tipo con su descripción, los valores de cada `enum`, los ids
que acepta cada referencia y las rutas de las fichas. Basta **un ajuste**:

```json
{
  "yaml.schemaStore.url": "https://<sitio>/api/v1/content/schemas"
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
salen en el siguiente catálogo que pida el editor.

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
  texto de las fichas ni los valores de las entidades (una IP, una URL…).
- **El editor guarda los schemas mientras la sesión está abierta.** Si un id
  nuevo no aparece en las sugerencias, reabre el fichero o recarga la ventana
  (Developer: Reload Window).
