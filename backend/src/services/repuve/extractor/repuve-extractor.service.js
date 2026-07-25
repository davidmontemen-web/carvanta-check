const path = require("path");

const { prisma } = require("../../../lib/prisma");

const {
  REPUVE_RAW_SCHEMA_VERSION,
  repuveRawJsonSchema,
  buildEmptyRepuveRaw,
} = require("./repuve-extractor.schema");

const {
  extractStructuredDocument,
} = require("./openai-document.client");

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTRACTION_INSTRUCTIONS = `
Eres el Cerebro 1 de Carvanta para artifacts REPUVE.

Tu única función es leer el archivo y extraer literalmente toda la
información visible relacionada con la consulta vehicular.

Reglas obligatorias:
1. No compares la información con otras fuentes.
2. No emitas recomendaciones, riesgo, conclusiones ni dictámenes.
3. No corrijas datos aunque parezcan inconsistentes.
4. No inventes valores ausentes. Usa null.
5. Conserva en rawText una transcripción útil del contenido visible.
6. Cada fieldConfidence debe estar entre 0 y 1.
7. CLEAR significa que el texto declara ausencia de reporte o alerta.
8. ALERT significa que el texto declara reporte, coincidencia o alerta.
9. UNKNOWN significa que el apartado no existe, no es legible o es ambiguo.
10. recognizedAsRepuve solo será true cuando el documento sea una
consulta o evidencia relacionada claramente con REPUVE.
`.trim();

function createHttpError(message, statusCode, code) {
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
      "El artifact no tiene una ruta de archivo válida",
      422,
      "ARTIFACT_FILE_PATH_MISSING"
    );
  }

  return path.resolve(process.cwd(), relativePath);
}

function calculateOverallConfidence(fieldConfidence) {
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
    values.reduce((sum, value) => sum + value, 0) /
    values.length;

  return Math.max(
    0,
    Math.min(1, Number(average.toFixed(4)))
  );
}

function buildRawEvidenceData({
  artifact,
  extraction,
}) {
  const extractedData =
    extraction.data || buildEmptyRepuveRaw();

  return {
    source: "REPUVE",
    stage: "RAW_EXTRACTION",
    schemaVersion: REPUVE_RAW_SCHEMA_VERSION,

    artifact: {
      id: artifact.id,
      originalName: artifact.originalName,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.sizeBytes,
    },

    ...extractedData,

    extraction: {
      provider: extraction.provider,
      model: extraction.model,
      responseId: extraction.responseId,
      extractedAt: new Date().toISOString(),
      usage: extraction.usage,
    },
  };
}

async function extractRepuveArtifact({
  investigationId,
  artifactId,
  userId,
}) {
  const artifact = await prisma.artifact.findUnique({
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
    artifact.investigationId !== investigationId
  ) {
    throw createHttpError(
      "El artifact no pertenece a esta investigación",
      409,
      "ARTIFACT_INVESTIGATION_MISMATCH"
    );
  }

  if (artifact.type !== "REPUVE") {
    throw createHttpError(
      `El artifact es de tipo ${artifact.type}, no REPUVE`,
      409,
      "ARTIFACT_TYPE_MISMATCH"
    );
  }

  if (
    !SUPPORTED_MIME_TYPES.has(artifact.mimeType)
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

        originalName: artifact.originalName,
        mimeType: artifact.mimeType,

        jsonSchema: repuveRawJsonSchema,
        instructions: EXTRACTION_INSTRUCTIONS,
      });

    const evidenceData = buildRawEvidenceData({
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
          type: "REPUVE_RAW",
        },
      });

    const evidence = existingEvidence
      ? await prisma.evidence.update({
          where: {
            id: existingEvidence.id,
          },

          data: {
            source: "AI_EXTRACTION",
            data: evidenceData,
            extractionStatus: "COMPLETED",
            confidence,
            extractor: "repuve-extractor-v1",
            extractedAt: new Date(),
            createdById: userId,
          },
        })
      : await prisma.evidence.create({
          data: {
            checkId:
              artifact.investigation.checkId,

            investigationId,
            artifactId: artifact.id,

            source: "AI_EXTRACTION",
            type: "REPUVE_RAW",
            data: evidenceData,

            extractionStatus: "COMPLETED",
            confidence,
            extractor: "repuve-extractor-v1",
            extractedAt: new Date(),
            createdById: userId,
          },
        });

    await prisma.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        /*
         * EXTRACTED indica que terminó el Cerebro 1.
         * Si tu enum actual todavía no admite EXTRACTED,
         * se conserva PROCESSING para que el Cerebro 2
         * continúe en el siguiente sprint.
         */
        processingStatus: "PROCESSING",
        processingError: null,
      },
    });

    return {
      artifactId: artifact.id,
      evidence,
      raw: evidenceData,
    };
  } catch (error) {
    await prisma.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        processingStatus: "FAILED",
        processingError:
          String(error.message || error).slice(
            0,
            1000
          ),
      },
    });

    throw error;
  }
}

module.exports = {
  SUPPORTED_MIME_TYPES,
  extractRepuveArtifact,
  calculateOverallConfidence,
  resolveArtifactAbsolutePath,
};
