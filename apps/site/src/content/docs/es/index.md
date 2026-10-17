---
title: Introducción
description: Qué es colofon, las ideas en las que se apoya y dónde está cada parte de esta documentación.
order: 1
---

Colofon es una plataforma para documentar sistemas (la infraestructura del trabajo, un homelab o cualquier otra cosa) que sirve igual a las personas y a los agentes de IA. La documentación vive en repositorios git propios, como páginas MDX, un catálogo en YAML y diagramas en JSON. La plataforma los sincroniza, los muestra como un sitio con una barra lateral por repositorio y sirve el mismo contenido a los agentes como Markdown, `llms.txt` y un servidor MCP.

Se distribuye como tres imágenes Docker (gateway, frontend y backend) más PostgreSQL.

## Principios

- **La plataforma no sabe nada del dominio.** Los tipos de datos (máquinas, servicios, proveedores…) y sus campos los declara el contenido, no el código.
- **Plataforma y contenido viven en repositorios separados.** Entre ambos hay un contrato versionado: `plataforma: "1"` en el `doc.config.yaml` de cada repositorio.
- **El contenido es texto en git.** Git es la fuente de verdad, con su historial, sus diffs y su revisión.
- **El backend lee el contenido en vivo.** Cambiar la documentación no reconstruye nada: el backend sincroniza el repositorio y lo sirve.
- **El MDX no ejecuta código.** Solo Markdown y los componentes de la plataforma, sin `import`, `export` ni expresiones.
- **Los secretos nunca llegan a la IA.** Un agente llama a un servicio con marcadores que la plataforma rellena y oculta en la respuesta.

## ¿Dónde encuentro…?

| Si buscas… | Lee |
| --- | --- |
| Instalarlo y entrar por primera vez | [Primer arranque](./first-run/) |
| Cómo es un repositorio de contenido y cómo se añade | [Repositorios de contenido](./content/) |
| Conectar un agente de IA con `llms.txt` o el MCP | [Agentes de IA](./agents/) |
| Las variables de entorno que importan | [Configuración](./configuration/) |
| Instalarlo a mano, detrás de HTTPS, y qué copiar | [Desplegar con Docker Compose](./deploy/) |
| Email y contraseña, OIDC y API keys | [Autenticación](./authentication/) |
| Las piezas del stack y el camino de una petición | [Arquitectura](./architecture/) |
| Ejecutarlo desde el código y cambiarlo | [Desarrollo](./development/) |
| Actualizar una instalación en marcha | [Actualizar](./upgrading/) |
