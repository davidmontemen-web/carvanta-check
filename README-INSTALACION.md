# Carvanta — Sprint 6.2

Refactor del frontend del Investigation Workspace.

## Crear directorios

Desde la raíz del proyecto:

```bash
mkdir -p frontend/src/components/investigation/common
mkdir -p frontend/src/components/investigation/vehicle-base
mkdir -p frontend/src/components/investigation/repuve
mkdir -p frontend/src/components/investigation/invoice
mkdir -p frontend/src/components/investigation/report
```

## Reemplazar

```text
frontend/src/pages/InvestigationWorkspacePage.jsx
```

## Crear

Todos los archivos incluidos en:

```text
frontend/src/components/investigation/
frontend/src/services/investigationApi.js
```

## No modificar

```text
frontend/src/services/api.js
frontend/src/App.jsx
backend/
prisma/
```

## Validación

```bash
cd ~/carvanta/frontend
npm run lint
npm run build
npm run dev
```

Pruebas manuales:

1. Login ejecutivo.
2. Abrir expediente.
3. Cambiar entre todas las tareas.
4. Guardar identidad vehicular.
5. Cargar artifact REPUVE.
6. Cargar artifact en otra fuente.
7. Guardar documento fiscal.
8. Guardar transmisión.
9. Guardar análisis.
10. Ejecutar pipeline.
11. Recargar y confirmar persistencia.
