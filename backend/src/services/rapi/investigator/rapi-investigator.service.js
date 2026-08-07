const {
  prisma,
} = require("../../../lib/prisma");

const {
  generateStructuredAnalysis,
} = require(
  "../../ai/openai-structured.client"
);

const {
  RAPI_ANALYSIS_SCHEMA_VERSION,
  rapiInvestigatorJsonSchema,
} = require(
  "./rapi-investigator.schema"
);

const {
  buildRapiInvestigatorInstructions,
} = require(
  "./rapi-investigator.prompt"
);

const RISK_WEIGHT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

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

function clamp(
  value,
  min = 0,
  max = 1
) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, numeric)
  );
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

function buildDeterministicContext(
  normalized
) {
  const rules = [];

  const queries = Array.isArray(
    normalized?.queries
  )
    ? normalized.queries
    : [];

  const vinQueries = Array.isArray(
    normalized?.vinQueries
  )
    ? normalized.vinQueries
    : [];

  const plateQueries = Array.isArray(
    normalized?.plateQueries
  )
    ? normalized.plateQueries
    : [];

  for (const issue of
    normalized?.validation?.issues || []) {
    rules.push({
      code:
        issue.code ||
        "RAPI_VALIDATION_ISSUE",

      severity: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
      ].includes(issue.severity)
        ? issue.severity
        : "MEDIUM",

      title:
        "Incidencia en la validación RAPI",

      description:
        issue.message ||
        "La validación de RAPI detectó una incidencia.",

      evidence: [
        JSON.stringify(
          issue.data || {}
        ),
      ],
    });
  }

  for (const query of queries) {
    if (
      query?.result
        ?.hasIllicitOriginReport === true ||
      query?.result?.status === "ALERT"
    ) {
      rules.push({
        code:
          query.queryType === "VIN"
            ? "RAPI_ILLICIT_REPORT_VIN"
            : "RAPI_ILLICIT_REPORT_PLATE",

        severity: "CRITICAL",

        title:
          "RAPI reporta procedencia ilícita",

        description:
          "La consulta RAPI aportada presenta una alerta o reporte de procedencia ilícita.",

        evidence: [
          `Tipo de consulta: ${
            query.queryType ||
            "UNKNOWN"
          }`,

          `Valor consultado: ${
            query.queriedValue ||
            "No identificado"
          }`,
        ],
      });
    }

    if (
      query?.result?.status ===
      "UNKNOWN"
    ) {
      rules.push({
        code:
          "RAPI_RESULT_UNKNOWN",

        severity: "HIGH",

        title:
          "Resultado RAPI no concluyente",

        description:
          "Una consulta RAPI no pudo clasificarse de forma confiable.",

        evidence: [
          `Valor consultado: ${
            query.queriedValue ||
            "No identificado"
          }`,
        ],
      });
    }

    if (
      query?.recognizedAsRapi ===
      false
    ) {
      rules.push({
        code:
          "RAPI_DOCUMENT_NOT_RECOGNIZED",

        severity: "HIGH",

        title:
          "Documento no reconocido como RAPI",

        description:
          "Uno de los archivos no fue reconocido claramente como una consulta RAPI.",

        evidence: [
          `Artifact: ${
            query.artifactId ||
            "No identificado"
          }`,
        ],
      });
    }
  }

  const clearQueries =
    queries.filter(
      (query) =>
        query?.result?.status ===
          "CLEAR" &&
        query?.result
          ?.hasIllicitOriginReport ===
          false
    );

  const coverage =
    Number(
      normalized?.coverage
        ?.percentage
    ) || 0;

  const deterministicRisk =
    rules.reduce(
      (risk, rule) =>
        maxRisk(
          risk,
          rule.severity
        ),
      "LOW"
    );

  return {
    rules,
    deterministicRisk,
    coverage,

    totals: {
      queries:
        queries.length,

      vinQueries:
        vinQueries.length,

      plateQueries:
        plateQueries.length,

      clearQueries:
        clearQueries.length,

      alertQueries:
        queries.filter(
          (query) =>
            query?.result
              ?.status ===
              "ALERT" ||
            query?.result
              ?.hasIllicitOriginReport ===
              true
        ).length,

      unknownQueries:
        queries.filter(
          (query) =>
            query?.result
              ?.status ===
            "UNKNOWN"
        ).length,
    },

    identifiersChecked:
      normalized?.coverage
        ?.identifiersChecked || [],

    vehicleReference:
      normalized
        ?.vehicleReference || {},
  };
}

function mergeUniqueFindings(
  deterministic,
  aiFindings
) {
  const result = [];
  const seen = new Set();

  for (const finding of [
    ...(deterministic || []),
    ...(aiFindings || []),
  ]) {
    const code = String(
      finding?.code || ""
    ).trim();

    if (!code || seen.has(code)) {
      continue;
    }

    seen.add(code);
    result.push(finding);
  }

  return result;
}

function buildRequiredRecommendations(
  findings
) {
  const codes = new Set(
    findings.map(
      (finding) =>
        finding.code
    )
  );

  const recommendations = [];

  if (
    codes.has(
      "RAPI_ILLICIT_REPORT_VIN"
    ) ||
    codes.has(
      "RAPI_ILLICIT_REPORT_PLATE"
    )
  ) {
    recommendations.push({
      code:
        "STOP_TRANSACTION",

      priority:
        "CRITICAL",

      title:
        "Detener la operación",

      description:
        "No continuar con la compra, venta, toma o financiamiento hasta aclarar jurídicamente la alerta.",
    });
  }

  if (
    codes.has(
      "RAPI_VIN_MISMATCH"
    )
  ) {
    recommendations.push({
      code:
        "VERIFY_VIN",

      priority:
        "HIGH",

      title:
        "Validar físicamente el VIN",

      description:
        "Comparar el VIN del expediente contra chasis, tablero y documentos antes de repetir la consulta.",
    });
  }

  if (
    codes.has(
      "RAPI_VIN_QUERY_MISSING"
    )
  ) {
    recommendations.push({
      code:
        "QUERY_RAPI_BY_VIN",

      priority:
        "HIGH",

      title:
        "Consultar RAPI por VIN",

      description:
        "Realizar y documentar una consulta RAPI utilizando el VIN principal del vehículo.",
    });
  }

  if (
    codes.has(
      "RAPI_CURRENT_PLATE_QUERY_MISSING"
    )
  ) {
    recommendations.push({
      code:
        "QUERY_RAPI_BY_CURRENT_PLATE",

      priority:
        "MEDIUM",

      title:
        "Consultar RAPI por placa",

      description:
        "Realizar una consulta RAPI para la placa registrada en el expediente.",
    });
  }

  if (
    codes.has(
      "RAPI_RESULT_UNKNOWN"
    ) ||
    codes.has(
      "RAPI_DOCUMENT_NOT_RECOGNIZED"
    )
  ) {
    recommendations.push({
      code:
        "REPEAT_RAPI_QUERY",

      priority:
        "HIGH",

      title:
        "Repetir la consulta RAPI",

      description:
        "Generar una nueva consulta legible y conservar la evidencia completa.",
    });
  }

  return recommendations;
}

function mergeUniqueRecommendations(
  required,
  aiItems
) {
  const result = [];
  const seen = new Set();

  for (const item of [
    ...(required || []),
    ...(aiItems || []),
  ]) {
    const code = String(
      item?.code || ""
    ).trim();

    if (!code || seen.has(code)) {
      continue;
    }

    seen.add(code);
    result.push(item);
  }

  return result;
}

async function investigateRapiInvestigation({
  investigationId,
  normalizedEvidenceId,
  userId,
}) {
  const investigation =
    await prisma.investigation.findUnique({
      where: {
        id: investigationId,
      },

      include: {
        check: true,
      },
    });

  if (!investigation) {
    throw createHttpError(
      "Investigación no encontrada",
      404,
      "INVESTIGATION_NOT_FOUND"
    );
  }

  const normalizedEvidence =
    normalizedEvidenceId
      ? await prisma.evidence.findUnique({
          where: {
            id:
              normalizedEvidenceId,
          },
        })
      : await prisma.evidence.findFirst({
          where: {
            investigationId,
            artifactId: null,
            type:
              "RAPI_NORMALIZED",

            extractionStatus:
              "COMPLETED",
          },

          orderBy: {
            updatedAt: "desc",
          },
        });

  if (!normalizedEvidence) {
    throw createHttpError(
      "No existe una evidencia RAPI_NORMALIZED completada",
      409,
      "RAPI_NORMALIZED_EVIDENCE_MISSING"
    );
  }

  if (
    normalizedEvidence
      .investigationId !==
      investigationId ||
    normalizedEvidence.type !==
      "RAPI_NORMALIZED"
  ) {
    throw createHttpError(
      "La evidencia normalizada no corresponde a la investigación",
      409,
      "RAPI_NORMALIZED_EVIDENCE_MISMATCH"
    );
  }

  const normalized =
    normalizedEvidence.data || {};

  const deterministic =
    buildDeterministicContext(
      normalized
    );

  const aiResult =
    await generateStructuredAnalysis({
      instructions:
        buildRapiInvestigatorInstructions(),

      input: {
        source: "RAPI",

        normalizedKnowledge:
          normalized,

        deterministic,
      },

      jsonSchema:
        rapiInvestigatorJsonSchema,
    });

  const findings =
    mergeUniqueFindings(
      deterministic.rules,
      aiResult.data.findings
    );

  const recommendations =
    mergeUniqueRecommendations(
      buildRequiredRecommendations(
        findings
      ),

      aiResult.data
        .recommendations
    );

  const risk = maxRisk(
    deterministic
      .deterministicRisk,

    aiResult.data.risk
  );

  const normalizedConfidence =
    clamp(
      normalizedEvidence
        .confidence
    );

  const confidence =
    Number(
      Math.min(
        clamp(
          aiResult.data
            .confidence
        ),

        normalizedConfidence ||
          1
      ).toFixed(4)
    );

  const preview = {
    source: "RAPI",

    status:
      risk === "CRITICAL" ||
      risk === "HIGH"
        ? "NEEDS_REVIEW"
        : "COMPLETED",

    title:
      "Análisis RAPI",

    summary:
      aiResult.data.summary,

    coverage:
      deterministic.coverage,

    risk,
    confidence,
    findings,
    recommendations,

    reasoning:
      aiResult.data.reasoning,

    identifiersChecked:
      deterministic
        .identifiersChecked,
  };

  const analysisData = {
    source: "RAPI",
    stage: "ANALYSIS",

    schemaVersion:
      RAPI_ANALYSIS_SCHEMA_VERSION,

    sourceNormalizedEvidenceId:
      normalizedEvidence.id,

    sourceNormalizedSchemaVersion:
      normalized
        ?.schemaVersion || null,

    summary:
      preview.summary,

    risk,
    confidence,

    coverage:
      deterministic.coverage,

    findings,
    recommendations,

    reasoning:
      aiResult.data.reasoning,

    deterministic,

    preview,

    provenance: {
      provider:
        aiResult.provider,

      model:
        aiResult.model,

      responseId:
        aiResult.responseId,

      usage:
        aiResult.usage,

      investigator:
        "rapi-investigator-v1",

      analyzedAt:
        new Date().toISOString(),
    },
  };

  const existingEvidence =
    await prisma.evidence.findFirst({
      where: {
        investigationId,
        artifactId: null,
        type:
          "RAPI_ANALYSIS",
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
              "CARVANTA_INVESTIGATOR",

            data:
              analysisData,

            extractionStatus:
              "COMPLETED",

            confidence,

            extractor:
              "rapi-investigator-v1",

            extractedAt:
              new Date(),

            createdById:
              userId,
          },
        })
      : await prisma.evidence.create({
          data: {
            checkId:
              investigation.checkId,

            investigationId,

            artifactId: null,

            source:
              "CARVANTA_INVESTIGATOR",

            type:
              "RAPI_ANALYSIS",

            data:
              analysisData,

            extractionStatus:
              "COMPLETED",

            confidence,

            extractor:
              "rapi-investigator-v1",

            extractedAt:
              new Date(),

            createdById:
              userId,
          },
        });

  return {
    normalizedEvidenceId:
      normalizedEvidence.id,

    evidence,

    analysis:
      analysisData,
  };
}

module.exports = {
  buildDeterministicContext,
  investigateRapiInvestigation,
};