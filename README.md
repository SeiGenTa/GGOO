# GGOO Volley Beauchef Gesture App

Esta es una aplicación de código abierto para la comunidad de Volley Beauchef.

Su objetivo principal es gestionar de forma automática la inscripción de miembros a las pichangas del grupo. La aplicación permite que administradores publiquen fechas de partidos y que los miembros se inscriban, reemplazando el proceso manual que antes se realizaba por WhatsApp.

Como se trata de una comunidad cerrada, los nuevos usuarios deben registrarse con nombre y apellido (permitiendo también un apodo). Antes de ingresar a la aplicación, cada registro debe ser validado por un administrador con permisos para aprobar usuarios. Idealmente, esta validación considera que la persona pertenezca a la universidad y respete la regla de identificación de la comunidad.

La idea es que esta aplicación crezca según las necesidades del grupo y reciba aportes mediante merge requests (MR). También se contempla, a futuro, incluir una sección de contribuyentes.

## Estado actual

En esta sección se muestran los objetivos actuales del proyecto. Los elementos marcados con `X` ya están implementados; los marcados con `O` aún están pendientes.

- [X] Crear pichangas en las que los miembros puedan registrarse y ver el estado de la lista en tiempo real.
- [X] Gestor de miembros.
- [X] Gestor de permisos para administradores.
- [O] Aplicación de permisos dentro de toda la app.
- [O] Sistema de registro de tarjetas y consecuencias dentro del sistema de pichangas.
- [O] Vista de contribuyentes.

## Cómo apoyar en el desarrollo

### Requisitos

- `npm`
- `docker`

### Opcionales, pero recomendados

Docker suele funcionar de manera más estable en estos entornos:

- `WSL2`
- Un sistema basado en Linux (especialmente útil en equipos con menos recursos).

### Tecnologías

- Docker
- SvelteKit
- Prisma
- PostgreSQL
- shadcn-svelte (librería de componentes)

## Instructivo de desarrollo

### Clonar el repositorio

```bash
git clone https://github.com/SeiGenTa/GGOO
cd GGOO
```

### Iniciar el entorno de desarrollo

Asegúrate de tener Docker en ejecución y luego levanta el servicio con alguno de estos comandos:

```bash
docker compose up --build app
# o
make dev
```

La aplicación debería iniciar sin problemas incluso si no existe un archivo `.env`, ya que hay valores por defecto para desarrollo. Si lo prefieres, puedes crear tu `.env` a partir de `template.env`.

## Comandos disponibles en Makefile

Todos los comandos se ejecutan dentro del contenedor Docker del servicio `app`.

```bash
make help
```

Muestra todos los comandos disponibles y su descripción.

```bash
make dev
```

Levanta la aplicación en modo desarrollo.

```bash
make bash
```

Abre una terminal dentro del contenedor `app`.

```bash
make logs
```

Muestra los logs del servicio `app` en tiempo real.

```bash
make migrate
```

Ejecuta `npx prisma migrate dev` dentro del contenedor.

```bash
make apply-migrate
```

Ejecuta `npx prisma migrate deploy` dentro del contenedor.

```bash
make generate-prisma
```

Ejecuta `npx prisma generate` dentro del contenedor.

```bash
make createsuperuser
```

Ejecuta el comando de creación de superusuario:

```bash
cd src
npx ts-node manage.ts createsuperuser
```

## Flujo sugerido para inicializar el proyecto

```bash
make dev
make apply-migrate
make generate-prisma
make createsuperuser
```

Al completar estos pasos, deberías poder acceder a la aplicación y comenzar a probarla.

## Cómo aportar

Para contribuir, crea una rama nueva con tus cambios y luego abre un MR explicando claramente qué incluye. Un administrador del repositorio revisará el MR y decidirá su integración.

## Reutilizar el código para otros grupos

Este proyecto puede adaptarse para otras comunidades deportivas o grupos organizados con dinámicas similares. Algunas recomendaciones para crear una variación:

1. Cambiar nombre, textos e identidad visual de la aplicación.
2. Ajustar reglas de inscripción (cupos, validaciones, prioridades, etc.).
3. Adaptar roles y permisos según la organización del nuevo grupo.
4. Revisar y modificar el flujo de validación de usuarios.
5. Personalizar notificaciones y criterios de participación.

Como base técnica, puedes mantener la misma arquitectura (SvelteKit + Prisma + PostgreSQL + Docker) y extender la lógica de negocio según tus necesidades.

## Licencia

- MIT