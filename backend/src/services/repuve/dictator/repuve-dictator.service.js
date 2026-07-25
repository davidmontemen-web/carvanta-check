const { prisma } = require("../../../lib/prisma");
const {
  generateStructuredAnalysis,
} = require("../../ai/openai-structured.client");
const {
  REPUVE_REPORT_SCHEMA_VERSION,
  repuveDictatorJsonSchema,
} = require("./repuve-dictator.schema");
const {
  buildRepuveDictatorInstructions,
} = require("./repuve-dictator.prompt");
const {
  calculateTrustIndex,
} = require("./trust-index.engine");
const {
  resolveVerdict,
} = require("./verdict.engine");

function createHttpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function severityWeight(value) {
  return {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  }[value] || 0;
}

function sortBySeverity(items = [], key = "severity") {
  return [...items].sort(
    (a, b) => severityWeight(b?.[key]) - severityWeight(a?.[key])
  );
}

function buildRequiredNextSteps(analysis = {}, verdict = {}) {
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations
    : [];
  const steps = recommendations.map((item) => ({
    code: item.code,
    priority: item.priority,
    action: item.description || item.title,
  }));

  if (verdict.code === "APPROVED") {
    steps.push({
      code: "CONTINUE_FULL_CHECK",
      priority: "LOW",
      action:
        "Continuar con las validaciones fiscal, documental, física y mecánica del expediente.",
    });
  }

  return steps;
}

function mergeUniqueNextSteps(required = [], aiItems = []) {
  const result = [];
  const seen = new Set();

  for (const item of [...required, ...aiItems]) {
    const code = String(item?.code || "").trim();
    const action = String(item?.action || "").trim();
    const key = code || action.toUpperCase();
    if (!key || !action || seen.has(key)) continue;
    seen.add(key);
    result.push({
      code: code || "EXECUTIVE_ACTION",
      priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
        item?.priority
      )
        ? item.priority
        : "MEDIUM",
      action,
    });
  }

  return sortBySeverity(result, "priority");
}

async function dictateRepuveArtifact({
  investigationId,
  artifactId,
  analysisEvidenceId,
  userId,
}) {
  const artifact = await prisma.artifact.findUnique({
    where: { id: artifactId },
    include: {
      investigation: {
        include: { check: true },
      },
    },
  });

  if (!artifact) {
    throw createHttpError(
      "Artifact no encontrado",
      404,
      "ARTIFACT_NOT_FOUND"
    );
  }

  if (artifact.investigationId !== investigationId) {
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

  const analysisEvidence = analysisEvidenceId
    ? await prisma.evidence.findUnique({
        where: { id: analysisEvidenceId },
      })
    : await prisma.evidence.findFirst({
        where: {
          investigationId,
          artifactId,
          type: "REPUVE_ANALYSIS",
          extractionStatus: "COMPLETED",
        },
        orderBy: { updatedAt: "desc" },
      });

  if (!analysisEvidence) {
    throw createHttpError(
      "No existe una evidencia REPUVE_ANALYSIS completada para dictaminar",
      409,
      "REPUVE_ANALYSIS_EVIDENCE_MISSING"
    );
  }

  if (
    analysisEvidence.investigationId !== investigationId ||
    analysisEvidence.artifactId !== artifactId ||
    analysisEvidence.type !== "REPUVE_ANALYSIS"
  ) {
    throw createHttpError(
      "La evidencia de análisis no corresponde al artifact solicitado",
      409,
      "REPUVE_ANALYSIS_EVIDENCE_MISMATCH"
    );
  }

  const analysis = analysisEvidence.data || {};
  const trustIndex = calculateTrustIndex(analysis);
  const verdict = resolveVerdict({ analysis, trustIndex });

  const aiResult = await generateStructuredAnalysis({
    instructions: buildRepuveDictatorInstructions(),
    input: {
      source: "REPUVE",
      immutableDecision: {
        verdict,
        trustIndex,
      },
      analysis: {
        summary: analysis.summary || null,
        risk: analysis.risk || "LOW",
        confidence: clamp(analysis.confidence),
        coverage: Number(analysis.coverage) || 0,
        findings: analysis.findings || [],
        recommendations: analysis.recommendations || [],
        reasoning: analysis.reasoning || {},
      },
    },
    jsonSchema: repuveDictatorJsonSchema,
  });

  const findings = sortBySeverity(
    Array.isArray(analysis.findings) ? analysis.findings : []
  );
  const recommendations = sortBySeverity(
    Array.isArray(analysis.recommendations)
      ? analysis.recommendations
      : [],
    "priority"
  );
  const nextSteps = mergeUniqueNextSteps(
    buildRequiredNextSteps(analysis, verdict),
    aiResult.data.nextSteps
  );

  const preview = {
    source: "REPUVE",
    status:
      verdict.code === "APPROVED" ? "COMPLETED" : "NEEDS_REVIEW",
    title: "Dictamen REPUVE",
    summary: aiResult.data.executiveSummary,
    coverage: Number(analysis.coverage) || 0,
    risk: analysis.risk || "LOW",
    confidence: clamp(analysis.confidence),
    findings,
    recommendations,
    verdict,
    trustIndex,
    nextSteps,
  };

  const reportData = {
    source: "REPUVE",
    stage: "REPORT",
    schemaVersion: REPUVE_REPORT_SCHEMA_VERSION,
    sourceAnalysisEvidenceId: analysisEvidence.id,
    sourceAnalysisSchemaVersion: analysis.schemaVersion || null,
    verdict,
    trustIndex,
    executiveSummary: aiResult.data.executiveSummary,
    findings,
    recommendations,
    nextSteps,
    explainability: {
      why: Array.from(
        new Set([
          ...(verdict.reasons || []),
          ...(aiResult.data.rationale || []),
        ])
      ),
      deductions: trustIndex.deductions,
    },
    transparency: {
      confidence: clamp(analysis.confidence),
      coverage: Number(analysis.coverage) || 0,
      evidenceChain: [
        "REPUVE_RAW",
        "REPUVE_NORMALIZED",
        "REPUVE_ANALYSIS",
        "REPUVE_REPORT",
      ],
      statement:
        "Dictamen generado a partir de evidencia estructurada y reglas auditables de Carvanta.",
    },
    disclaimer: aiResult.data.disclaimer,
    preview,
    provenance: {
      provider: aiResult.provider,
      model: aiResult.model,
      responseId: aiResult.responseId,
      usage: aiResult.usage,
      dictator: "repuve-dictator-v1",
      dictatedAt: new Date().toISOString(),
    },
  };

  const existingEvidence = await prisma.evidence.findFirst({
    where: {
      investigationId,
      artifactId,
      type: "REPUVE_REPORT",
    },
  });

  const confidence = clamp(analysis.confidence);
  const evidence = existingEvidence
    ? await prisma.evidence.update({
        where: { id: existingEvidence.id },
        data: {
          source: "CARVANTA_DICTATOR",
          data: reportData,
          extractionStatus: "COMPLETED",
          confidence,
          extractor: "repuve-dictator-v1",
          extractedAt: new Date(),
          createdById: userId,
        },
      })
    : await prisma.evidence.create({
        data: {
          checkId: artifact.investigation.checkId,
          investigationId,
          artifactId,
          source: "CARVANTA_DICTATOR",
          type: "REPUVE_REPORT",
          data: reportData,
          extractionStatus: "COMPLETED",
          confidence,
          extractor: "repuve-dictator-v1",
          extractedAt: new Date(),
          createdById: userId,
        },
      });

  await prisma.artifact.update({
    where: { id: artifact.id },
    data: {
      processingStatus: "PROCESSED",
      processingError: null,
    },
  });

  return {
    artifactId,
    analysisEvidenceId: analysisEvidence.id,
    evidence,
    report: reportData,
  };
}

module.exports = {
  buildRequiredNextSteps,
  mergeUniqueNextSteps,
  dictateRepuveArtifact,
};
