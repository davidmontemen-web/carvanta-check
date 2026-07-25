# Carvanta — Sprint 6.4.02

## Ruta y validación REPUVE

Esta microentrega conecta el endpoint existente de REPUVE con el motor determinista agregado en Sprint 6.4.01.

## Archivos

### Modificado

```text
backend/src/routes/investigations/repuve.routes.js
```

### Nuevo

```text
backend/src/validators/repuve.validator.js
```

## Requisito previo

Debe estar instalado Sprint 6.4.01:

```text
backend/src/services/repuve/repuve.constants.js
backend/src/services/repuve/repuve.service.js
```

## Qué conserva

- Endpoint actual:
  `POST /api/investigations/:id/repuve-result`
- Artifact REPUVE obligatorio
- Captura estructurada de vehículo
- Estados de Fiscalía, OCRA, Carfax y avisos ministeriales
- Creación o actualización de evidencia
- Marcado del artifact como procesado

## Qué agrega

- Validación centralizada del payload
- Comparación de VIN y placas contra el expediente
- Resultado determinista del módulo
- Findings REPUVE
- Recomendaciones
- Riesgo
- Confianza
- Preview
- Transacción atómica para evidencia, findings y artifact

## Instalación

Copia la carpeta `backend` sobre la raíz actual del proyecto.

```bash
unzip carvanta-sprint-6-4-02-repuve-route.zip
cp -R carvanta-sprint-6-4-02-repuve-route/backend/* /ruta/a/carvanta/backend/
```

## Respuesta esperada

El endpoint ahora responde:

```json
{
  "evidence": {},
  "preview": {
    "source": "REPUVE",
    "status": "COMPLETED",
    "risk": "LOW",
    "confidence": "HIGH",
    "findings": [],
    "recommendations": []
  }
}
```

## Prueba mínima

Enviar un body con:

```json
{
  "artifactId": "ID_DEL_ARTIFACT_REPUVE",
  "vin": "3N1AB7AD0KY123456",
  "plate": "ABC123A",
  "brand": "NISSAN",
  "model": "SENTRA",
  "year": "2019",
  "queriedAt": "2026-07-23",
  "prosecutorOfficeStatus": "CLEAR",
  "ocraStatus": "CLEAR",
  "carfaxStatus": "CLEAR",
  "ministerialStatus": "CLEAR"
}
```

Resultado esperado:

- Evidencia `REPUVE_RESULT`
- `risk: LOW`
- `status: COMPLETED`
- sin hallazgos REPUVE
- artifact marcado como `PROCESSED`

## Caso de alerta

Cambia cualquiera de los cuatro estados a:

```json
"ALERT"
```

Resultado esperado:

- `risk: CRITICAL`
- finding `REPUVE_THEFT_REPORT`
- recomendación `STOP_TRANSACTION`

## Nota

La lógica actual interpreta cualquier `ALERT` de las fuentes legales como un resultado crítico. En una entrega posterior podremos separar el tipo exacto de alerta por fuente y asignar reglas de riesgo más finas.
