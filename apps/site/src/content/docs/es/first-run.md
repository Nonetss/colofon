---
title: Tu primer repositorio
description: Entra como administrador, registra un repositorio de contenido, sincronízalo y léelo, y luego abre el sitio a personas y agentes.
order: 2
---

Este recorrido lleva una instalación recién hecha hasta su primera documentación publicada. Las etiquetas citadas son las de la interfaz.

## 1. Entra como administrador

En su primer arranque, el backend crea el administrador descrito por `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` en el `.env` (el instalador los pregunta). Abre la URL pública e inicia sesión con ellos en `/login`. Todas las páginas salvo `/login` y `/signup` necesitan sesión.

Sin ningún repositorio el sitio arranca y funciona, pero el lector no tiene nada que mostrar. Los administradores llegan al panel desde **Administración** en el menú de la cuenta.

## 2. Registra un repositorio de contenido

Un repositorio de contenido es un repositorio git con tus páginas, tu catálogo y tus diagramas (ver [Escribir contenido](../content/)). Abre **Contenido** (`/admin/content`) y pulsa **Añadir repositorio**. Dale un nombre y un slug, su nombre en las URLs (`/<slug>/…`), que no se puede cambiar después. Luego elige su **Origen**:

- **URL externa**: una URL git `https://` (GitHub, Gitea…). Con la URL completa, el formulario lista las ramas del remoto para elegir la ref y las carpetas que contienen un `doc.config.yaml` para elegir la **Carpeta del contenido** (la raíz por defecto), de modo que el contenido puede vivir en una carpeta de un repositorio de código. Para uno privado, añade un usuario y un token de acceso con permiso de lectura; la plataforma nunca lo muestra ni lo escribe en los logs.
- **Alojado en la plataforma**: la plataforma hace de servidor git. Clona y haz push a `<URL pública>/git/<slug>.git`:

  ```bash
  git remote add colofon https://docs.example.com/git/manual.git
  git push colofon main
  ```

  Los repositorios alojados **no llevan credenciales**: cualquiera que llegue a la plataforma puede clonarlos y hacer push, `--force` incluido. Mantén la plataforma en una red de confianza.

## 3. Sincroniza y lee

Crear un repositorio externo lanza su primera sincronización; un push a uno alojado lo sincroniza al momento. Después, cada repositorio se sincroniza al arrancar, cada cinco minutos, cuando cambia su URL o su ref, y con el botón de su tarjeta, que muestra la última sincronización con su commit o su error completo.

Léelo en `/<slug>`: su `docs/index.mdx` con una barra lateral de secciones y páginas. La portada `/` lista todos los repositorios con sus secciones, y la búsqueda de la barra (`⌘K` / `Ctrl+K`) salta a cualquier página. Si una página tiene problemas (un campo desconocido, un enlace roto, un componente que la plataforma no ofrece), los administradores ven la lista completa en la página; el resto solo ve que los tiene.

## 4. Invita a más gente

Cualquiera que llegue al sitio puede crearse una cuenta en `/signup`, y todo usuario con sesión lee todos los repositorios que registraron los administradores. Los administradores gestionan las cuentas en `/admin/users` (crear, cambiar el rol o la contraseña, banear, borrar). Ver [Usuarios e inicio de sesión](../authentication/).

## 5. Tus propios repositorios

Cada usuario puede añadir también repositorios suyos desde **Repositorios** (`/me/repositories`). Solo los lee su dueño, ni siquiera los administradores: nadie más los ve en el lector, la búsqueda, las skills ni las herramientas de los agentes. El repositorio de un usuario siempre es externo, por `https://`, y su host no puede ser una dirección privada ni de loopback salvo que el servidor lo liste en `TRUSTED_GIT_HOSTS`.

Si el servidor tiene definida `SECRETS_ENCRYPTION_KEY`, la misma página guarda **credenciales git** (un host, un usuario y un token, guardado cifrado). Así un repositorio elige la credencial de su host en vez de llevar un token en la URL, y cambiar el token surte efecto en la siguiente sincronización.

## 6. Conecta un agente

Crea una API key en `/me/api-keys`. El diálogo muestra la clave una sola vez, con el texto listo para copiar para cada forma de conectar una IA: el prompt de configuración, el MCP de documentación para Claude Code, Codex y Cursor, y `llms.txt` a secas para una IA sin MCP. Ver [Para agentes de IA](../agents/).
