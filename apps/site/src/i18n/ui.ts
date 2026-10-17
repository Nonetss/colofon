export const languages = { en: "English", es: "Español" } as const
export type Lang = keyof typeof languages
export const defaultLang: Lang = "en"

export const INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/Nonetss/colofon/main/scripts/bootstrap.sh | bash"

export type TourStopId =
  | "diagrams"
  | "catalog"
  | "search"
  | "agents"
  | "repositories"

const en = {
  meta: {
    title: "Colofon: document your systems for people and AI agents",
    description:
      "A self-hosted documentation platform: MDX pages, a typed YAML catalog and diagrams kept in git, rendered for people and served to AI agents over llms.txt and MCP, without the AI ever seeing a secret.",
  },
  nav: {
    tour: "Tour",
    architecture: "Architecture",
    install: "Install",
    docs: "Docs",
    github: "GitHub",
    skip: "Skip to content",
    theme: "Switch between light and dark theme",
    language: "Language",
    menu: "Menu",
  },
  copy: {
    idle: "Copy",
    done: "Copied",
    label: "Copy the install command",
    code: "Copy the code",
  },
  hero: {
    title: "Documentation your team and your agents both read.",
    lede: "Colofon renders documentation repositories kept in git: MDX pages, a catalog of typed data and diagrams. People read it as a site; AI agents read the same pages over llms.txt and MCP, and call your services with secrets they never see.",
    installLabel: "Install on a server",
    installHint:
      "Run it in an empty directory. It asks a few questions, generates every secret and starts the stack with Docker Compose.",
    docs: "Read the docs",
    github: "Source on GitHub",
  },
  frame: {
    caption:
      "Screenshots of the running app reading the doc-example repository. Click one to enlarge it.",
    open: "Enlarge screenshot",
    viewer: "Screenshot viewer",
    close: "Close",
    previous: "Previous screenshot",
    next: "Next screenshot",
  },
  tour: {
    heading: "What you get",
    stops: {
      diagrams: {
        title: "Diagrams written as data.",
        body: "A diagram is a JSON file next to the pages: drawn box by box, or one of 30 typed forms (flowcharts, sequences, timelines, Sankey, Wardley maps…) that the platform lays out for you. They render on the server in both themes, and hovering a piece lights up what it connects to.",
        alt: "A documentation page with a state diagram: hovering a state shows its connections and dims the rest",
      },
      catalog: {
        title: "A catalog the content declares.",
        body: "Machines, services, suppliers or anything else: each type and its fields live in a YAML schema, one file per entity. The platform validates them, builds a table per type and a page per entity, and lists the pages that cite it.",
        alt: "A catalog table of diagram types with their purpose, variants and budget, with a filter and column controls",
      },
      search: {
        title: "Find any page from anywhere.",
        body: "⌘K or Ctrl+K searches the pages of the repository you are reading, or of every one at once, by title, description and section.",
        alt: "The search palette open over a page, listing the documentation pages that match «diagrama»",
      },
      agents: {
        title: "Ready for your AI.",
        body: "Every page is also Markdown, indexed by llms.txt, and the MCP at /mcp lets an agent search, read and query the catalog with your API key. One prompt installs the skills that teach it to use and write the documentation.",
        alt: "The «Skills para tu IA» page with the setup prompt to paste into an agent",
      },
      repositories: {
        title: "Your git, or the platform's.",
        body: "Point a repository at any https git remote and a branch, or host it on the platform and push to it. It syncs on startup, every five minutes and on every push, and a broken commit never takes the site down: the last valid version stays up.",
        alt: "The admin content page: the doc-example repository with its git URL, branch, sync state and the editor catalog URL",
      },
    } satisfies Record<
      TourStopId,
      { title: string; body: string; alt: string }
    >,
    dashboardAlt:
      "A documentation page of doc-example with its sidebar and a drawn diagram of how the platform fits together",
    rest: {
      heading: "And the rest of the platform",
      items: [
        {
          term: "Editor autocompletion",
          text: "Each repository publishes its JSON schemas, so VS Code or Cursor complete and check the YAML and diagrams as you type.",
        },
        {
          term: "Secrets the AI never sees",
          text: "Save a service's credentials once at /me. The MCP's request tool fills them into the call and masks them in the response.",
        },
        {
          term: "Problems, not crashes",
          text: "Every invalid header, link, entity or diagram is reported with its file and line, on the page itself for admins, while the rest of the site keeps working.",
        },
        {
          term: "Styles per repository",
          text: "A repository can restyle its own pages with CSS modules the platform cleans before applying.",
        },
        {
          term: "Light, dark and mobile",
          text: "Light, dark or system theme, a reader that works on a phone, and an installable PWA.",
        },
        {
          term: "Sign-in your way",
          text: "Email and password, plus any OIDC provider (Keycloak, Authentik, Google…) turned on with three variables.",
        },
      ],
    },
  },
  arch: {
    heading: "How it fits together",
    lede: "Three app images plus PostgreSQL, run with Docker Compose. Browsers and agents only talk to the Caddy gateway, which sends the API, the MCP and the hosted git repositories to the backend and everything else to the frontend. The backend owns the database and the clones of every content repository.",
    diagramTitle: "Topology",
    diagramDesc:
      "The browser and AI agents reach the Caddy gateway on port 80. The gateway sends /rpc, /api, /git, /mcp, /scalar and /openapi.json to the Hono backend on port 3000 and every other path to the Astro frontend on port 4321. The backend reads and writes PostgreSQL and fetches the content repositories from their git remotes.",
    legendHttp: "Connection, labelled with its protocol or route",
    legendOptional: "Outbound: only for repositories on an external remote",
    published: "published",
    pathsLabel: "Request paths",
    pagePath: "Reading a page",
    agentPath: "An agent asking",
    nodes: {
      browser: "Browser",
      agent: "AI agent",
      gateway: "Gateway",
      frontend: "Frontend",
      backend: "Backend",
      postgres: "PostgreSQL",
      remote: "Git remotes",
    },
    roles: {
      frontend: "Astro SSR · React",
      backend: "Hono · oRPC · MCP",
      postgres: "users · repositories",
      remote: "GitHub, Gitea…",
      clones: "content clones",
    },
    routing: {
      heading: "Gateway routing",
      route: "Request",
      target: "Goes to",
      rows: [
        {
          route: "/rpc/*  /api/*  /git/*  /mcp  /scalar*  /openapi.json",
          target: "backend:3000",
        },
        { route: "/health", target: "ok" },
        { route: "any other path", target: "frontend:4321" },
      ],
      note: "Only the gateway's port 80 is published, as FRONTEND_PORT (4444 by default). Put an https reverse proxy in front: session cookies are Secure.",
    },
    principles: [
      {
        term: "The platform knows nothing about your domain.",
        text: "Types and their fields are declared by the content, so the same platform documents a company's infrastructure, a homelab or a greengrocer. Platform and content live in separate repositories, bound by a versioned contract.",
      },
      {
        term: "MDX executes no code.",
        text: "Pages are Markdown plus three components: Callout, Entities and Diagram. Imports, exports and expressions are reported and skipped, never run, so the server that reads the content can safely hold secrets.",
      },
      {
        term: "Secrets never leave the vault.",
        text: "Each user's secrets are encrypted with SECRETS_ENCRYPTION_KEY and written once. An agent asks for a call with placeholders like {{service.token}}; the platform fills them in and masks them in the response, so the model never reads a credential.",
      },
    ],
    docsLink: "Read the architecture docs",
  },
  install: {
    heading: "Up in one command.",
    lede: "On a Linux host with Docker, curl and openssl, from an empty directory:",
    stepsLabel: "What the script does",
    steps: [
      "Asks for the port, the public URL, the internal git hosts users may add repositories from, and the first admin.",
      "Generates every secret with openssl, including the key that encrypts the users' secrets.",
      "Writes .env and downloads compose.prod.yml into the current directory.",
      "Starts the stack with the images from ghcr.io. The backend migrates the database and creates the admin on startup.",
    ],
    warning:
      "Back up the generated .env, above all SECRETS_ENCRYPTION_KEY, together with the database and the hosted_data volume. Hosted repositories may have no other copy, and without the key every stored secret is unreadable.",
    manual: "Prefer to set it up by hand?",
    manualLink: "Deploy with Docker Compose",
  },
  footer: {
    tagline: "Documentation for people and AI agents.",
    releases: "Releases",
    issues: "Issues",
    license: "License (AGPL-3.0)",
  },
  docs: {
    title: "Documentation",
    onThisPage: "On this page",
    pages: "Pages",
    edit: "Edit this page on GitHub",
    previous: "Previous",
    next: "Next",
  },
}

export type Dictionary = typeof en

const es: Dictionary = {
  meta: {
    title: "Colofon: documenta tus sistemas para personas y agentes de IA",
    description:
      "Una plataforma de documentación autoalojada: páginas MDX, un catálogo YAML tipado y diagramas guardados en git, que se muestran a las personas y se sirven a los agentes de IA por llms.txt y MCP, sin que la IA vea nunca un secreto.",
  },
  nav: {
    tour: "Recorrido",
    architecture: "Arquitectura",
    install: "Instalar",
    docs: "Documentación",
    github: "GitHub",
    skip: "Saltar al contenido",
    theme: "Cambiar entre tema claro y oscuro",
    language: "Idioma",
    menu: "Menú",
  },
  copy: {
    idle: "Copiar",
    done: "Copiado",
    label: "Copiar el comando de instalación",
    code: "Copiar el código",
  },
  hero: {
    title: "Documentación que leen tu equipo y tus agentes.",
    lede: "Colofon publica repositorios de documentación guardados en git: páginas MDX, un catálogo de datos tipados y diagramas. Las personas lo leen como una web; los agentes de IA leen las mismas páginas por llms.txt y MCP, y llaman a tus servicios con secretos que nunca ven.",
    installLabel: "Instalar en un servidor",
    installHint:
      "Ejecútalo en un directorio vacío. Hace unas pocas preguntas, genera todos los secretos y arranca el stack con Docker Compose.",
    docs: "Leer la documentación",
    github: "Código en GitHub",
  },
  frame: {
    caption:
      "Capturas de la aplicación en marcha leyendo el repositorio doc-example. Pulsa una para ampliarla.",
    open: "Ampliar captura",
    viewer: "Visor de capturas",
    close: "Cerrar",
    previous: "Captura anterior",
    next: "Captura siguiente",
  },
  tour: {
    heading: "Qué incluye",
    stops: {
      diagrams: {
        title: "Diagramas escritos como datos.",
        body: "Un diagrama es un fichero JSON junto a las páginas: dibujado caja a caja, o una de las 30 formas tipadas (flujos, secuencias, cronologías, Sankey, mapas de Wardley…) que la plataforma coloca por ti. Se dibujan en el servidor en los dos temas, y al pasar por una pieza se ilumina lo que conecta.",
        alt: "Una página de documentación con un diagrama de estados: al pasar por un estado se ven sus conexiones y se atenúa el resto",
      },
      catalog: {
        title: "Un catálogo que declara el contenido.",
        body: "Máquinas, servicios, proveedores o lo que sea: cada tipo y sus campos viven en un esquema YAML, con un fichero por entidad. La plataforma los valida, crea una tabla por tipo y una página por entidad, y lista las páginas que la citan.",
        alt: "Una tabla del catálogo con los tipos de diagrama, su propósito, variantes y límites, con un filtro y controles de columnas",
      },
      search: {
        title: "Encuentra cualquier página desde cualquier sitio.",
        body: "⌘K o Ctrl+K busca en las páginas del repositorio que estás leyendo, o en todos a la vez, por título, descripción y sección.",
        alt: "La paleta de búsqueda abierta sobre una página, con las páginas de documentación que coinciden con «diagrama»",
      },
      agents: {
        title: "Lista para tu IA.",
        body: "Cada página es también Markdown, indexada en llms.txt, y el MCP de /mcp deja que un agente busque, lea y consulte el catálogo con tu API key. Un solo texto instala las skills que le enseñan a usar y escribir la documentación.",
        alt: "La página «Skills para tu IA» con el texto de configuración para pegar en un agente",
      },
      repositories: {
        title: "Tu git, o el de la plataforma.",
        body: "Apunta un repositorio a cualquier remoto git por https y una rama, o alójalo en la plataforma y haz push. Se sincroniza al arrancar, cada cinco minutos y con cada push, y un commit roto nunca tumba el sitio: se sigue sirviendo la última versión válida.",
        alt: "La página de contenido de administración: el repositorio doc-example con su URL de git, la rama, el estado de sincronización y la URL del catálogo para el editor",
      },
    },
    dashboardAlt:
      "Una página de documentación de doc-example con su barra lateral y un diagrama dibujado de cómo encaja la plataforma",
    rest: {
      heading: "Y el resto de la plataforma",
      items: [
        {
          term: "Autocompletado en el editor",
          text: "Cada repositorio publica sus esquemas JSON, así que VS Code o Cursor completan y comprueban el YAML y los diagramas mientras escribes.",
        },
        {
          term: "Secretos que la IA no ve",
          text: "Guarda una vez las credenciales de un servicio en /me. La herramienta request del MCP las pone en la llamada y las enmascara en la respuesta.",
        },
        {
          term: "Problemas, no caídas",
          text: "Cada cabecera, enlace, entidad o diagrama inválido se reporta con su fichero y su línea en la propia página para los administradores, y el resto del sitio sigue funcionando.",
        },
        {
          term: "Estilos por repositorio",
          text: "Un repositorio puede cambiar el aspecto de sus páginas con módulos CSS que la plataforma limpia antes de aplicarlos.",
        },
        {
          term: "Claro, oscuro y móvil",
          text: "Tema claro, oscuro o del sistema, un lector que funciona en el móvil y una PWA instalable.",
        },
        {
          term: "Inicia sesión como prefieras",
          text: "Email y contraseña, y además cualquier proveedor OIDC (Keycloak, Authentik, Google…), que se activa con tres variables.",
        },
      ],
    },
  },
  arch: {
    heading: "Cómo está montado",
    lede: "Tres imágenes de la aplicación más PostgreSQL, levantadas con Docker Compose. Navegadores y agentes solo hablan con el gateway Caddy, que manda la API, el MCP y los repositorios git alojados al backend y todo lo demás al frontend. El backend es el dueño de la base de datos y de las copias de cada repositorio de contenido.",
    diagramTitle: "Topología",
    diagramDesc:
      "El navegador y los agentes de IA llegan al gateway Caddy por el puerto 80. El gateway manda /rpc, /api, /git, /mcp, /scalar y /openapi.json al backend Hono en el puerto 3000 y cualquier otra ruta al frontend Astro en el 4321. El backend lee y escribe en PostgreSQL y trae los repositorios de contenido de sus remotos git.",
    legendHttp: "Conexión, con su protocolo o ruta",
    legendOptional: "Saliente: solo para repositorios en un remoto externo",
    published: "publicado",
    pathsLabel: "Recorrido de las peticiones",
    pagePath: "Leer una página",
    agentPath: "Un agente pregunta",
    nodes: {
      browser: "Navegador",
      agent: "Agente de IA",
      gateway: "Gateway",
      frontend: "Frontend",
      backend: "Backend",
      postgres: "PostgreSQL",
      remote: "Remotos git",
    },
    roles: {
      frontend: "Astro SSR · React",
      backend: "Hono · oRPC · MCP",
      postgres: "usuarios · repositorios",
      remote: "GitHub, Gitea…",
      clones: "copias del contenido",
    },
    routing: {
      heading: "Enrutado del gateway",
      route: "Petición",
      target: "Va a",
      rows: [
        {
          route: "/rpc/*  /api/*  /git/*  /mcp  /scalar*  /openapi.json",
          target: "backend:3000",
        },
        { route: "/health", target: "ok" },
        { route: "cualquier otra ruta", target: "frontend:4321" },
      ],
      note: "Solo se publica el puerto 80 del gateway, como FRONTEND_PORT (4444 por defecto). Pon delante un proxy inverso con https: las cookies de sesión son Secure.",
    },
    principles: [
      {
        term: "La plataforma no sabe nada de tu dominio.",
        text: "Los tipos y sus campos los declara el contenido, así que la misma plataforma documenta la infraestructura de una empresa, un homelab o una frutería. Plataforma y contenido viven en repositorios separados, unidos por un contrato versionado.",
      },
      {
        term: "El MDX no ejecuta código.",
        text: "Las páginas son Markdown más tres componentes: Callout, Entities y Diagram. Los import, export y expresiones se reportan y se omiten, nunca se ejecutan, así que el servidor que lee el contenido puede guardar secretos con seguridad.",
      },
      {
        term: "Los secretos no salen de la bóveda.",
        text: "Los secretos de cada usuario se cifran con SECRETS_ENCRYPTION_KEY y se escriben una sola vez. Un agente pide una llamada con marcadores como {{servicio.token}}; la plataforma los rellena y los enmascara en la respuesta, así que el modelo nunca lee una credencial.",
      },
    ],
    docsLink: "Leer la arquitectura en la documentación",
  },
  install: {
    heading: "En marcha con un solo comando.",
    lede: "En un host Linux con Docker, curl y openssl, desde un directorio vacío:",
    stepsLabel: "Qué hace el script",
    steps: [
      "Pregunta el puerto, la URL pública, los hosts git internos desde los que los usuarios pueden añadir repositorios y el primer administrador.",
      "Genera todos los secretos con openssl, incluida la clave que cifra los secretos de los usuarios.",
      "Escribe .env y descarga compose.prod.yml en el directorio actual.",
      "Arranca el stack con las imágenes de ghcr.io. El backend migra la base de datos y crea el administrador al arrancar.",
    ],
    warning:
      "Haz copia del .env generado, sobre todo de SECRETS_ENCRYPTION_KEY, junto con la base de datos y el volumen hosted_data. Puede que los repositorios alojados no tengan otra copia, y sin la clave ningún secreto guardado se puede leer.",
    manual: "¿Prefieres montarlo a mano?",
    manualLink: "Desplegar con Docker Compose",
  },
  footer: {
    tagline: "Documentación para personas y agentes de IA.",
    releases: "Versiones",
    issues: "Incidencias",
    license: "Licencia (AGPL-3.0)",
  },
  docs: {
    title: "Documentación",
    onThisPage: "En esta página",
    pages: "Páginas",
    edit: "Editar esta página en GitHub",
    previous: "Anterior",
    next: "Siguiente",
  },
}

export const ui: Record<Lang, Dictionary> = { en, es }

export function t(lang: Lang): Dictionary {
  return ui[lang]
}
