const { prisma } = require("../../../lib/prisma");
const {
  extractRepuveArtifact,
} = require("../extractor/repuve-extractor.service");
const {
  normalizeRepuveArtifact,
} = require("../normalizer/repuve-normalizer.service");
const {
  investigateRepuveArtifact,
} = require("../investigator/repuve-investigator.service");
const {
  dictateRepuveArtifact,
} = require("../dictator/repuve-dictator.service");

const activeRuns = new Map();

function createHttpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}



async function resolveRepuveArtifact({ investigationId, artifactId }) {
  const artifact = artifactId
    ? await prisma.artifact.findUnique({ where: { id: artifactId } })
    : await prisma.artifact.findFirst({
        where: {
          investigationId,
          type: "REPUVE",
        },
        orderBy: { createdAt: "desc" },
      });

  if (!artifact) {
    throw createHttpError(
      "Carga primero una evidencia REPUVE para iniciar el procesamiento",
      409,
      "REPUVE_ARTIFACT_MISSING"
    );
  }

  if (artifact.investigationId !== investigationId) {
    throw createHttpError(
      "El artifact REPUVE no pertenece a esta investigación",
      409,
      "ARTIFACT_INVESTIGATION_MISMATCH"
    );
  }

  if (artifact.type !== "REPUVE") {
    throw createHttpError(
      `El artifact indicado es de tipo ${artifact.type}, no REPUVE`,
      409,
      "ARTIFACT_TYPE_MISMATCH"
    );
  }

  return artifact;
}



async function executeRepuvePipeline({ investigation, artifact, userId }) {
  await prisma.check.update({
    where: { id: investigation.checkId },
    data: { status: "EN_INVESTIGACION" },
  });

  const extraction = await extractRepuveArtifact({
    investigationId: investigation.id,
    artifactId: artifact.id,
    userId,
  });

  const normalization = await normalizeRepuveArtifact({
    investigationId: investigation.id,
    artifactId: artifact.id,
    rawEvidenceId: extraction.evidence.id,
    userId,
  });

  const investigationResult = await investigateRepuveArtifact({
    investigationId: investigation.id,
    artifactId: artifact.id,
    normalizedEvidenceId: normalization.evidence.id,
    userId,
  });

  const dictation = await dictateRepuveArtifact({
    investigationId: investigation.id,
    artifactId: artifact.id,
    analysisEvidenceId: investigationResult.evidence.id,
    userId,
  });

  return {
    status: "COMPLETED",
    investigationId: investigation.id,
    checkId: investigation.checkId,
    artifactId: artifact.id,

    source: "REPUVE",

    stages: {
      extractionEvidenceId:
        extraction.evidence.id,
      normalizedEvidenceId:
        normalization.evidence.id,
      analysisEvidenceId:
        investigationResult.evidence.id,
      assessmentEvidenceId:
        dictation.evidence.id,
    },

    assessment: dictation.report,

    message:
      "REPUVE fue procesado correctamente. El resultado parcial está listo para revisión.",
  };
}

async function runRepuvePipeline({ investigationId, artifactId, userId }) {
  const investigation = await prisma.investigation.findUnique({
    where: { id: investigationId },
    include: { check: true },
  });

  if (!investigation) {
    throw createHttpError(
      "Investigación no encontrada",
      404,
      "INVESTIGATION_NOT_FOUND"
    );
  }

  if (investigation.status !== "IN_PROGRESS") {
    const existingReport = await prisma.evidence.findFirst({
      where: {
        investigationId,
        type: "REPUVE_REPORT",
        extractionStatus: "COMPLETED",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingReport) {
      return {
        status: "COMPLETED",
        investigationId,
        checkId: investigation.checkId,
        report: existingReport.data,
        reused: true,
      };
    }

    throw createHttpError(
      "La investigación ya no acepta procesamiento",
      409,
      "INVESTIGATION_NOT_PROCESSABLE"
    );
  }

  const artifact = await resolveRepuveArtifact({
    investigationId,
    artifactId,
  });

  const runKey = `${investigationId}:${artifact.id}`;

  if (activeRuns.has(runKey)) {
    throw createHttpError(
      "El pipeline REPUVE ya se está ejecutando para este artifact",
      409,
      "REPUVE_PIPELINE_ALREADY_RUNNING"
    );
  }

  const runPromise = executeRepuvePipeline({
    investigation,
    artifact,
    userId,
  }).catch(async (error) => {
    await prisma.check
      .update({
        where: { id: investigation.checkId },
        data: { status: "EN_INVESTIGACION" },
      })
      .catch(() => {});

    throw error;
  });

  activeRuns.set(runKey, runPromise);

  try {
    return await runPromise;
  } finally {
    activeRuns.delete(runKey);
  }
}

module.exports = {
  runRepuvePipeline,
};
