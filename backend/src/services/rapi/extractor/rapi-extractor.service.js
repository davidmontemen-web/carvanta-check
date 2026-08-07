const path = require("path");

const {
  prisma,
} = require("../../../lib/prisma");

const {
  RAPI_RAW_SCHEMA_VERSION,
  rapiRawJsonSchema,
  buildEmptyRapiRaw,
} = require("./rapi-extractor.schema");

const {
  extractStructuredDocument,
} = require(
  "../../repuve/extractor/openai-document.client"
);

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTRACTION_INSTRUCTIONS = `
Eres el Cerebro 1 de Carvanta para artifacts RAPI.

Tu única función es leer el archivo y extraer literalmente la información
visible de una consulta del Registro de Automotores de Procedencia Ilícita.

Reglas obligatorias:

1. No compares la información con otras fuentes.
2. No emitas recomendaciones, riesgo, conclusiones ni dictámenes.
3. No corrijas valores aunque parezcan inconsistentes.
4. No inventes datos ausentes. Usa null.
5. recognizedAsRapi sólo será true si el documento corresponde claramente
   al Registro de Automotores de Procedencia Ilícita.
6. queryType será VIN cuando el documento diga "número de serie".
7. queryType será PLATE cuando el documento diga "número de placa".
8. queriedValue debe contener exactamente el VIN o placa visible.
9. CLEAR significa que el documento declara que no cuenta con reporte de
   procedencia ilícita.
10. ALERT significa que el documento declara que sí existe reporte,
    coincidencia o alerta de procedencia ilícita.
11. UNKNOWN significa que el resultado no existe, es ilegible o ambiguo.
12. queriedAt debe conservar la fecha y hora visibles, sin inventar formato.
13. informationalOnly será true cuando el documento indique que la
    información es informativa y no tiene efectos legales.
14. Conserva en rawText una transcripción útil del documento.
15. Cada fieldConfidence debe estar entre 0 y 1.
`.trim();

function createHttpError(
  message,
  statusCode,
  code
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function resolveArtifactAbsolutePath(
  filePath
) {
  const relativePath = String(
    filePath || ""
  ).replace(/^[/\\]+/, "");

  if (!relativePath) {
    throw createHttpError(
      "El artifact no tiene una ruta válida",
      422,
      "ARTIFACT_FILE_PATH_MISSING"
    );
  }

  return path.resolve(
    process.cwd(),
    relativePath
  );
}

function calculateOverallConfidence(
  fieldConfidence
) {
  const values = Object.values(
    fieldConfidence || {}
  ).filter(
    (value) =>
      typeof value === "number" &&
      Number.isFinite(value)
  );

  if (values.length === 0) {
    return 0;
  }

  const average =
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length;

  return Math.max(
    0,
    Math.min(
      1,
      Number(average.toFixed(4))
    )
  );
}

function buildRawEvidenceData({
  artifact,
  extraction,
}) {
  const extractedData =
    extraction.data ||
    buildEmptyRapiRaw();

  return {
    source: "RAPI",
    stage: "RAW_EXTRACTION",
    schemaVersion:
      RAPI_RAW_SCHEMA_VERSION,

    artifact: {
      id: artifact.id,
      type: artifact.type,
      originalName:
        artifact.originalName,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.sizeBytes,
    },

    ...extractedData,

    extraction: {
      provider:
        extraction.provider,
      model: extraction.model,
      responseId:
        extraction.responseId,
      extractedAt:
        new Date().toISOString(),
      usage: extraction.usage,
    },
  };
}

async function extractRapiArtifact({
  investigationId,
  artifactId,
  userId,
}) {
  const artifact =
    await prisma.artifact.findUnique({
      where: {
        id: artifactId,
      },

      include: {
        investigation: true,
      },
    });

  if (!artifact) {
    throw createHttpError(
      "Artifact no encontrado",
      404,
      "ARTIFACT_NOT_FOUND"
    );
  }

  if (
    artifact.investigationId !==
    investigationId
  ) {
    throw createHttpError(
      "El artifact no pertenece a esta investigación",
      409,
      "ARTIFACT_INVESTIGATION_MISMATCH"
    );
  }

  if (
    ![
      "RAPI_VIN",
      "RAPI_PLACA",
    ].includes(artifact.type)
  ) {
    throw createHttpError(
      `El artifact es de tipo ${artifact.type}, no RAPI`,
      409,
      "ARTIFACT_TYPE_MISMATCH"
    );
  }

  if (
    !SUPPORTED_MIME_TYPES.has(
      artifact.mimeType
    )
  ) {
    throw createHttpError(
      `Formato no soportado: ${artifact.mimeType}`,
      415,
      "ARTIFACT_MIME_TYPE_UNSUPPORTED"
    );
  }

  await prisma.artifact.update({
    where: {
      id: artifact.id,
    },

    data: {
      processingStatus:
        "PROCESSING",
      processingError: null,
    },
  });

  try {
    const extraction =
      await extractStructuredDocument({
        absoluteFilePath:
          resolveArtifactAbsolutePath(
            artifact.filePath
          ),

        originalName:
          artifact.originalName,

        mimeType:
          artifact.mimeType,

        jsonSchema:
          rapiRawJsonSchema,

        instructions:
          EXTRACTION_INSTRUCTIONS,
      });

    const evidenceData =
      buildRawEvidenceData({
        artifact,
        extraction,
      });

    const confidence =
      calculateOverallConfidence(
        evidenceData.fieldConfidence
      );

    const existingEvidence =
      await prisma.evidence.findFirst({
        where: {
          investigationId,
          artifactId: artifact.id,
          type: "RAPI_RAW",
        },
      });

    const evidence =
      existingEvidence
        ? await prisma.evidence.update({
            where: {
              id: existingEvidence.id,
            },

            data: {
              source:
                "AI_EXTRACTION",

              data:
                evidenceData,

              extractionStatus:
                "COMPLETED",

              confidence,

              extractor:
                "rapi-extractor-v1",

              extractedAt:
                new Date(),

              createdById:
                userId,
            },
          })
        : await prisma.evidence.create({
            data: {
              checkId:
                artifact
                  .investigation
                  .checkId,

              investigationId,
              artifactId:
                artifact.id,

              source:
                "AI_EXTRACTION",

              type:
                "RAPI_RAW",

              data:
                evidenceData,

              extractionStatus:
                "COMPLETED",

              confidence,

              extractor:
                "rapi-extractor-v1",

              extractedAt:
                new Date(),

              createdById:
                userId,
            },
          });

    await prisma.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        processingStatus:
          "PROCESSING",

        processingError: null,
      },
    });

    return {
      artifactId:
        artifact.id,

      artifactType:
        artifact.type,

      evidence,

      raw:
        evidenceData,
    };
  } catch (error) {
    await prisma.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        processingStatus:
          "FAILED",

        processingError:
          String(
            error.message || error
          ).slice(0, 1000),
      },
    });

    throw error;
  }
}

module.exports = {
  extractRapiArtifact,
};