---
title: Usuarios e inicio de sesión
description: Cuentas, el rol de administrador, el primer administrador, el inicio de sesión único con cualquier proveedor OIDC, las API keys y por qué hace falta https.
order: 7
---

El inicio de sesión lo gestiona Better Auth. Todas las páginas salvo `/login` y `/signup` necesitan sesión, igual que la API, las rutas en Markdown y el MCP (o, en su lugar, una API key).

## Cuentas

El inicio de sesión con email y contraseña está siempre disponible, y la página `/signup` está abierta: cualquiera que llegue al sitio puede crearse una cuenta. Todo usuario con sesión lee todos los repositorios que registró un administrador, además de los suyos (ver [Tu primer repositorio](../first-run/)).

Desde el perfil (`/me`) cada usuario cambia su nombre y su contraseña y gestiona sus API keys, repositorios, secretos y skills.

## El rol de administrador

Un usuario es `admin` global o no lo es. Los administradores ven **Administración** en el menú de la cuenta, desde donde:

- Crean y borran usuarios, cambian su rol o su contraseña y los banean o desbanean (`/admin/users`). Un usuario baneado no puede entrar y pierde sus sesiones.
- Registran y sincronizan los repositorios de contenido de la plataforma (`/admin/content`) y exploran los alojados (`/admin/git`).
- Ven completos los problemas de cada página en el lector.

La referencia interactiva de la API en `/scalar` es solo para administradores. Los repositorios, secretos y API keys de cada usuario son privados también para los administradores.

## El primer administrador

El backend crea al arrancar el administrador descrito por `ADMIN_EMAIL`, `ADMIN_PASSWORD` (al menos 8 caracteres) y `ADMIN_NAME` (`Admin` por defecto), si ningún usuario tiene aún ese email. Es idempotente: reiniciar no duplica la cuenta ni cambia su contraseña. Sin `ADMIN_EMAIL` o `ADMIN_PASSWORD` se omite. El instalador rellena las tres.

## Inicio de sesión único (OIDC)

Para añadir un proveedor de identidad (Keycloak, Authentik, Google o cualquiera compatible con OIDC), registra un cliente en el proveedor y define tres variables:

```bash
OIDC_CLIENT_ID=colofon
OIDC_CLIENT_SECRET=...
OIDC_DISCOVERY_URL=https://keycloak.example.com/realms/acme
```

`OIDC_DISCOVERY_URL` es la URL base del emisor; se le añade `/.well-known/openid-configuration` para descubrir los endpoints. Se piden los scopes `openid`, `profile` y `email`. Permite esta URI de redirección en el proveedor:

```text
https://docs.example.com/api/auth/oauth2/callback/oidc
```

Si falta cualquiera de las tres variables, el SSO queda apagado y la página de inicio de sesión ofrece solo email y contraseña.

## API keys

Las API keys permiten que agentes y scripts actúen como un usuario: envía una en la cabecera `x-api-key` y la petición se ejecuta como su dueño, viendo exactamente lo que él ve.

```bash
curl -H "x-api-key: $COLOFON_KEY" https://docs.example.com/manual/llms.txt
```

Cada usuario crea, renombra y revoca sus propias claves en `/me/api-keys`, con una caducidad de 30, 90, 180 o 365 días, o ninguna. Nadie, ni siquiera un administrador, puede listar ni revocar las claves de otro usuario. El diálogo muestra la clave nueva una sola vez, junto con el texto para conectar una IA (ver [Para agentes de IA](../agents/)). Las claves no tienen límite de peticiones por clave, porque un agente lee muchas páginas.

Algunas acciones rechazan las API keys a propósito y necesitan una sesión del navegador: gestionar los secretos y guardar credenciales git, para que un agente con una clave no pueda añadir un origen ni leer un token.

## Hace falta https

Las cookies de sesión se emiten `Secure`, `HttpOnly` y `SameSite=Lax`, y la API de autenticación solo acepta peticiones desde la URL pública (`CORS_ORIGIN`). Los navegadores descartan las cookies `Secure` por http plano salvo en `localhost`, así que en cualquier otro host el stack debe servirse por https, normalmente con un proxy inverso delante del gateway (ver [Desplegar](../deploy/)).
