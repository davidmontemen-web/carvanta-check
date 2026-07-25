const { prisma } = require("../../../lib/prisma");
const {
  generateStructuredAnalysis,
} = require("../../ai/openai-structured.client");
const {
  REPUVE_ANALYSIS_SCHEMA_VERSION,
  repuveInvestigatorJsonSchema,
} = require("./repuve-investigator.schema");
const {
  buildRepuveInvestigatorInstructions,
} = require("./repuve-investigator.prompt");

const RISK_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function createHttpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function cleanComparable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function maxRisk(...risks) {
  return risks
    .filter(Boolean)
    .reduce(
      (highest, risk) =>
        (RISK_WEIGHT[risk] || 0) >
        (RISK_WEIGHT[highest] || 0)
          ? risk
          : highest,
      "LOW"
    );
}

function buildDeterministicContext({
  normalized,
  check,
}) {
  const rules = [];
  const normalizedVin = cleanComparable(
    normalized?.vehicle?.vin
  );
  const checkVin = cleanComparable(check?.vin);
  const normalizedPlate = cleanComparable(
    normalized?.vehicle?.plate
  );
  const checkPlate = cleanComparable(
    check?.placas ?? check?.plate
  );
  const result =
    normalized?.analysisInput?.result || "OTHER";

  if (checkVin && normalizedVin && checkVin !== normalizedVin) {
    rules.push({
      code: "VIN_MISMATCH",
      severity: "HIGH",
      title: "El VIN consultado no coincide",
      description:
        "El VIN de REPUVE no coincide con el VIN registrado en el expediente.",
      evidence: [
        `VIN expediente: ${check?.vin || ""}`,
        `VIN REPUVE: ${normalized?.vehicle?.vin || ""}`,
      ],
    });
  }

  if (!normalizedVin) {
    rules.push({
      code: "VIN_MISSING",
      severity: "HIGH",
      title: "Consulta sin VIN verificable",
      description:
        "El conocimiento normalizado no contiene un VIN utilizable.",
      evidence: ["REPUVE_NORMALIZED.vehicle.vin está vacío"],
    });
  }

  if (
    checkPlate &&
    normalizedPlate &&
    checkPlate !== normalizedPlate
  ) {
    rules.push({
      code: "PLATE_MISMATCH",
      severity: "MEDIUM",
      title: "Las placas consultadas no coinciden",
      description:
        "Las placas de REPUVE no coinciden con las registradas en el expediente.",
      evidence: [
        `Placas expediente: ${check?.placas ?? check?.plate ?? ""}`,
        `Placas REPUVE: ${normalized?.vehicle?.plate || ""}`,
      ],
    });
  }

  const resultRules = {
    THEFT_REPORT: {
      code: "THEFT_REPORT",
      severity: "CRITICAL",
      title: "Reporte de robo vigente",
      description:
        "El resultado oficial normalizado indica reporte de robo.",
    },
    RECOVERED: {
      code: "RECOVERED_VEHICLE",
      severity: "HIGH",
      title: "Vehículo con antecedente de recuperación",
      description:
        "El resultado normalizado indica que el vehículo fue recuperado.",
    },
    NOT_FOUND: {
      code: "NOT_FOUND",
      severity: "MEDIUM",
      title: "Vehículo no encontrado en REPUVE",
      description:
        "La consulta no produjo un registro concluyente.",
    },
    OTHER: {
      code: "UNCLASSIFIED_RESULT",
      severity: "MEDIUM",
      title: "Resultado REPUVE no concluyente",
      description:
        "El resultado no corresponde a una clasificación concluyente.",
    },
  };

  if (resultRules[result]) {
    rules.push({
      ...resultRules[result],
      evidence: [`Resultado normalizado: ${result}`],
    });
  }

  for (const issue of normalized?.validation?.issues || []) {
    if (
      !rules.some((rule) => rule.code === issue.code)
    ) {
      rules.push({
        code: issue.code || "NORMALIZATION_ISSUE",
        severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
          issue.severity
        )
          ? issue.severity
          : "MEDIUM",
        title: "Incidencia de normalización",
        description: issue.message ||
          "La normalización detectó una incidencia.",
        evidence: [issue.field || "REPUVE_NORMALIZED"],
      });
    }
  }

  const requiredChecks = [
    Boolean(normalized?.vehicle?.vin),
    Boolean(normalized?.vehicle?.plate),
    Boolean(normalized?.query?.queriedAt),
    Boolean(normalized?.analysisInput?.result),
    Boolean(normalized?.analysisInput?.evidenceReviewed),
    Boolean(
      normalized?.query?.queryFolio ||
        normalized?.registration?.registrationFolio
    ),
  ];

  const coverage = Math.round(
    (requiredChecks.filter(Boolean).length /
      requiredChecks.length) *
      100
  );

  const deterministicRisk = rules.reduce(
    (risk, rule) => maxRisk(risk, rule.severity),
    "LOW"
  );

  return {
    rules,
    coverage,
    deterministicRisk,
    identity: {
      expediente: {
        vin: check?.vin || null,
        plate: check?.placas ?? check?.plate ?? null,
      },
      repuve: {
        vin: normalized?.vehicle?.vin || null,
        plate: normalized?.vehicle?.plate || null,
      },
    },
  };
}

function mergeUniqueFindings(deterministic, aiFindings) {
  const result = [];
  const seen = new Set();

  for (const finding of [
    ...(deterministic || []),
    ...(aiFindings || []),
  ]) {
    const key = String(finding?.code || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(finding);
  }

  return result;
}

function buildRequiredRecommendations(findings) {
  const codes = new Set(findings.map((item) => item.code));
  const recommendations = [];

  if (codes.has("THEFT_REPORT")) {
    recommendations.push({
      code: "STOP_TRANSACTION",
      priority: "CRITICAL",
      title: "Detener la operación",
      description:
        "No continuar con compra, venta, toma o financiamiento hasta aclarar jurídicamente el reporte.",
    });
  }

  if (codes.has("VIN_MISMATCH") || codes.has("VIN_MISSING")) {
    recommendations.push({
      code: "VERIFY_VIN",
      priority: "HIGH",
      title: "Validar físicamente el VIN",
      description:
        "Comparar el VIN del expediente contra chasis, tablero y documentos antes de repetir la consulta.",
    });
  }

  if (codes.has("RECOVERED_VEHICLE")) {
    recommendations.push({
      code: "REVIEW_RECOVERY_DOCUMENTS",
      priority: "HIGH",
      title: "Revisar documentos de recuperación",
      description:
        "Solicitar liberación ministerial, constancia de recuperación y documentos que acrediten la situación actual.",
    });
  }

  if (
    codes.has("NOT_FOUND") ||
    codes.has("UNCLASSIFIED_RESULT") ||
    codes.has("OFFICIAL_RESULT_UNKNOWN")
  ) {
    recommendations.push({
      code: "MANUAL_REVIEW",
      priority: "MEDIUM",
      title: "Repetir y documentar la consulta oficial",
      description:
        "Realizar revisión manual y conservar fecha, folio y evidencia legible del nuevo resultado.",
    });
  }

  return recommendations;
}

function mergeUniqueRecommendations(required, aiItems) {
  const result = [];
  const seen = new Set();

  for (const item of [...(required || []), ...(aiItems || [])]) {
    const key = String(item?.code || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function investigateRepuveArtifact({
  investigationId,
  artifactId,
  normalizedEvidenceId,
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

  const normalizedEvidence = normalizedEvidenceId
    ? await prisma.evidence.findUnique({
        where: { id: normalizedEvidenceId },
      })
    : await prisma.evidence.findFirst({
        where: {
          investigationId,
          artifactId,
          type: "REPUVE_NORMALIZED",
          extractionStatus: "COMPLETED",
        },
        orderBy: { updatedAt: "desc" },
      });

  if (!normalizedEvidence) {
    throw createHttpError(
      "No existe una evidencia REPUVE_NORMALIZED completada para investigar",
      409,
      "REPUVE_NORMALIZED_EVIDENCE_MISSING"
    );
  }

  if (
    normalizedEvidence.investigationId !== investigationId ||
    normalizedEvidence.artifactId !== artifactId ||
    normalizedEvidence.type !== "REPUVE_NORMALIZED"
  ) {
    throw createHttpError(
      "La evidencia normalizada no corresponde al artifact solicitado",
      409,
      "REPUVE_NORMALIZED_EVIDENCE_MISMATCH"
    );
  }

  const normalized = normalizedEvidence.data || {};
  const check = artifact.investigation.check || {};
  const deterministic = buildDeterministicContext({
    normalized,
    check,
  });

  const aiResult = await generateStructuredAnalysis({
    instructions: buildRepuveInvestigatorInstructions(),
    input: {
      source: "REPUVE",
      normalizedKnowledge: normalized,
      deterministic,
    },
    jsonSchema: repuveInvestigatorJsonSchema,
  });

  const findings = mergeUniqueFindings(
    deterministic.rules,
    aiResult.data.findings
  );
  const recommendations = mergeUniqueRecommendations(
    buildRequiredRecommendations(findings),
    aiResult.data.recommendations
  );
  const risk = maxRisk(
    deterministic.deterministicRisk,
    aiResult.data.risk
  );
  const normalizedConfidence = clamp(
    normalizedEvidence.confidence
  );
  const confidence = Number(
    Math.min(
      clamp(aiResult.data.confidence),
      normalizedConfidence || 1
    ).toFixed(4)
  );

  const preview = {
    source: "REPUVE",
    status:
      risk === "CRITICAL" || risk === "HIGH"
        ? "NEEDS_REVIEW"
        : "COMPLETED",
    title: "Consulta REPUVE",
    summary: aiResult.data.summary,
    coverage: deterministic.coverage,
    risk,
    confidence,
    findings,
    recommendations,
    reasoning: aiResult.data.reasoning,
  };

  const analysisData = {
    source: "REPUVE",
    stage: "ANALYSIS",
    schemaVersion: REPUVE_ANALYSIS_SCHEMA_VERSION,
    sourceNormalizedEvidenceId: normalizedEvidence.id,
    sourceNormalizedSchemaVersion:
      normalized?.schemaVersion || null,
    summary: preview.summary,
    risk,
    confidence,
    coverage: deterministic.coverage,
    findings,
    recommendations,
    reasoning: aiResult.data.reasoning,
    deterministic,
    preview,
    provenance: {
      provider: aiResult.provider,
      model: aiResult.model,
      responseId: aiResult.responseId,
      usage: aiResult.usage,
      investigator: "repuve-investigator-v1",
      analyzedAt: new Date().toISOString(),
    },
  };

  const existingEvidence =
    await prisma.evidence.findFirst({
      where: {
        investigationId,
        artifactId,
        type: "REPUVE_ANALYSIS",
      },
    });

  const evidence = existingEvidence
    ? await prisma.evidence.update({
        where: { id: existingEvidence.id },
        data: {
          source: "CARVANTA_INVESTIGATOR",
          data: analysisData,
          extractionStatus: "COMPLETED",
          confidence,
          extractor: "repuve-investigator-v1",
          extractedAt: new Date(),
          createdById: userId,
        },
      })
    : await prisma.evidence.create({
        data: {
          checkId: artifact.investigation.checkId,
          investigationId,
          artifactId,
          source: "CARVANTA_INVESTIGATOR",
          type: "REPUVE_ANALYSIS",
          data: analysisData,
          extractionStatus: "COMPLETED",
          confidence,
          extractor: "repuve-investigator-v1",
          extractedAt: new Date(),
          createdById: userId,
        },
      });

  await prisma.artifact.update({
    where: { id: artifact.id },
    data: {
      // Cerebro 4 todavía está pendiente.
      processingStatus: "PROCESSING",
      processingError: null,
    },
  });

  return {
    artifactId,
    normalizedEvidenceId: normalizedEvidence.id,
    evidence,
    analysis: analysisData,
  };
}

module.exports = {
  buildDeterministicContext,
  investigateRepuveArtifact,
};
