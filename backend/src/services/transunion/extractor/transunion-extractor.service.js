const path = require("path");

const {
  prisma,
} = require("../../../lib/prisma");

const {
  TRANSUNION_RAW_SCHEMA_VERSION,
  transunionRawJsonSchema,
} = require("./transunion-extractor.schema");

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
Eres el Cerebro 1 de Carvanta para reportes de Auto Verificación de TransUnion.

Tu única función es extraer fielmente la información visible del documento.

Reglas obligatorias:

1. No emitas conclusiones, recomendaciones, riesgo ni dictamen.
2. No compares el documento con el expediente.
3. No inventes datos ausentes. Usa null o arreglos vacíos.
4. Conserva los valores tal como aparecen en el reporte.
5. recognizedAsTransUnion será true únicamente si el documento corresponde claramente a un Reporte de Auto Verificación de TransUnion.
6. Extrae todas las placas detectadas, incluso si aparecen repetidas en distintas secciones.
7. Extrae todos los financiamientos, pólizas, siniestros y consultas de robo disponibles.
8. Distingue las pólizas vigentes de las vencidas mediante el campo status, sin reinterpretarlo.
9. No conviertas "sin información" en un resultado negativo. Registra cada sección dentro de sectionsWithoutInformation.
10. No interpretes "sin reporte de robo" como garantía absoluta. Sólo extrae el estatus literal.
11. Extrae importes, fechas, kilometraje, condiciones físicas y estatus exactamente como aparecen.
12. El reporte puede contener tablas divididas entre varias páginas; reconstruye cada registro completo cuando sea posible.
13. Si una fila está incompleta o ambigua, conserva los datos legibles y agrega una advertencia.
14. En la sección Información de Financiamientos, separa cuidadosamente las columnas:
    - Número de Contrato
    - Tipo
    Por ejemplo, si aparece "CONFIDENCIAL" bajo Número de Contrato y
    "PLAN PISO" bajo Tipo, contractNumber debe ser "CONFIDENCIAL" y
    financingType debe ser "PLAN PISO". No combines ambos campos.
15. Cuando una tabla continúe en la página siguiente, relaciona la primera fila
    con su continuación antes de construir el objeto.
16. Los campos de confianza deben estar entre 0 y 1.
17. Devuelve exclusivamente el JSON solicitado por el schema.
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

function resolveArtifactAbsolutePath(filePath) {
  const relativePath = String(filePath || "")
    .replace(/^[/\\]+/, "");

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

  return Number(
    Math.max(
      0,
      Math.min(1, average)
    ).toFixed(4)
  );
}

async function extractTransUnionArtifact({
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

  if (artifact.type !== "TRANSUNION") {
    throw createHttpError(
      `El artifact es de tipo ${artifact.type}, no TRANSUNION`,
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
      processingStatus: "PROCESSING",
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
          transunionRawJsonSchema,

        instructions:
          EXTRACTION_INSTRUCTIONS,
      });

    const extractedData =
      extraction.data || {};

    const evidenceData = {
      source: "TRANSUNION",
      stage: "RAW_EXTRACTION",

      schemaVersion:
        TRANSUNION_RAW_SCHEMA_VERSION,

      artifact: {
        id: artifact.id,
        type: artifact.type,
        originalName:
          artifact.originalName,
        mimeType:
          artifact.mimeType,
        sizeBytes:
          artifact.sizeBytes,
      },

      ...extractedData,

      extraction: {
        provider:
          extraction.provider,

        model:
          extraction.model,

        responseId:
          extraction.responseId,

        usage:
          extraction.usage,

        extractedAt:
          new Date().toISOString(),
      },
    };

    const confidence =
      calculateOverallConfidence(
        evidenceData.fieldConfidence
      );

    const existingEvidence =
      await prisma.evidence.findFirst({
        where: {
          investigationId,
          artifactId:
            artifact.id,

          type:
            "TRANSUNION_RAW",
        },
      });

    const evidence =
      existingEvidence
        ? await prisma.evidence.update({
            where: {
              id:
                existingEvidence.id,
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
                "transunion-extractor-v1",

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

              createdById:
                userId,

              source:
                "AI_EXTRACTION",

              type:
                "TRANSUNION_RAW",

              data:
                evidenceData,

              extractionStatus:
                "COMPLETED",

              confidence,

              extractor:
                "transunion-extractor-v1",

              extractedAt:
                new Date(),
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
  extractTransUnionArtifact,
};