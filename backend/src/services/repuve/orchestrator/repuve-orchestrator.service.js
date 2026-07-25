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

function normalizeScore(trustIndex) {
  const candidates = [
    trustIndex?.score,
    trustIndex?.value,
    trustIndex?.total,
  ];

  const value = candidates
    .map(Number)
    .find(Number.isFinite);

  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveQuality(score) {
  if (score >= 80) return "ALTA";
  if (score >= 60) return "MEDIA";
  return "BAJA";
}

function buildLegacyReportData(repuveReport = {}) {
  const findings = Array.isArray(repuveReport.findings)
    ? repuveReport.findings
    : [];
  const recommendations = Array.isArray(repuveReport.recommendations)
    ? repuveReport.recommendations
    : [];
  const score = normalizeScore(repuveReport.trustIndex);

  return {
    quality: resolveQuality(score),
    riskLevel: repuveReport.preview?.risk || repuveReport.risk || "LOW",
    alerts: findings,
    recommendation:
      recommendations
        .map((item) => item.description || item.title)
        .filter(Boolean)
        .join(" ") ||
      "Conservar la evidencia oficial y continuar con las validaciones documentales del expediente.",
    summary:
      repuveReport.executiveSummary ||
      repuveReport.preview?.summary ||
      "La investigación REPUVE fue procesada correctamente.",
  };
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

async function publishClientReport({ investigation, repuveReport }) {
  const reportData = buildLegacyReportData(repuveReport);

  const report = await prisma.report.upsert({
    where: { checkId: investigation.checkId },
    update: reportData,
    create: {
      checkId: investigation.checkId,
      ...reportData,
    },
  });

  await prisma.$transaction([
    prisma.investigation.update({
      where: { id: investigation.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    }),
    prisma.check.update({
      where: { id: investigation.checkId },
      data: { status: "REPORTE_LISTO" },
    }),
  ]);

  return report;
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

  const clientReport = await publishClientReport({
    investigation,
    repuveReport: dictation.report,
  });

  return {
    status: "COMPLETED",
    investigationId: investigation.id,
    checkId: investigation.checkId,
    artifactId: artifact.id,
    stages: {
      extractionEvidenceId: extraction.evidence.id,
      normalizedEvidenceId: normalization.evidence.id,
      analysisEvidenceId: investigationResult.evidence.id,
      reportEvidenceId: dictation.evidence.id,
    },
    report: dictation.report,
    clientReport,
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
  buildLegacyReportData,
};
