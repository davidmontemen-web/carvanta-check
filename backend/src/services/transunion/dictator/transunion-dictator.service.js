const {
  prisma,
} = require("../../../lib/prisma");

const TRANSUNION_REPORT_SCHEMA_VERSION = "1.0";

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

function clamp(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, numeric)
  );
}

function normalizeRisk(value) {
  return [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ].includes(value)
    ? value
    : "LOW";
}

function resolveVerdict(risk) {
  if (risk === "CRITICAL") {
    return {
      code: "CRITICAL_ALERT",
      label: "Alerta crítica",
      status: "NEEDS_REVIEW",
    };
  }

  if (risk === "HIGH") {
    return {
      code: "REVIEW_REQUIRED",
      label: "Revisión obligatoria",
      status: "NEEDS_REVIEW",
    };
  }

  if (risk === "MEDIUM") {
    return {
      code: "REVIEW_RECOMMENDED",
      label: "Revisión recomendada",
      status: "NEEDS_REVIEW",
    };
  }

  return {
    code: "NO_RELEVANT_ALERTS",
    label: "Sin alertas relevantes detectadas",
    status: "COMPLETED",
  };
}

function buildFindingRecords({
  investigationId,
  findings,
}) {
  return (
    Array.isArray(findings)
      ? findings
      : []
  ).map((finding) => ({
    investigationId,

    type:
      finding.code ||
      "TRANSUNION_FINDING",

    severity:
      normalizeRisk(
        finding.severity
      ),

    status: "OPEN",

    title:
      finding.title ||
      "Hallazgo TransUnion",

    description:
      finding.description ||
      "Se detectó un hallazgo en el análisis TransUnion.",

    data: {
      source: "TRANSUNION",

      code:
        finding.code ||
        "TRANSUNION_FINDING",

      category:
        finding.category ||
        null,

      customerMeaning:
        finding.customerMeaning ||
        null,

      evidence:
        Array.isArray(
          finding.evidence
        )
          ? finding.evidence
          : [],
    },
  }));
}

function buildNextSteps(
  recommendations
) {
  return (
    Array.isArray(recommendations)
      ? recommendations
      : []
  ).map((item) => ({
    code:
      item.code ||
      "TRANSUNION_ACTION",

    priority:
      normalizeRisk(
        item.priority
      ),

    action:
      item.description ||
      item.title ||
      "Revisar el resultado TransUnion.",
  }));
}

async function dictateTransUnion({
  investigationId,
  analysisEvidenceId,
  userId,
}) {
  const investigation =
    await prisma.investigation.findUnique({
      where: {
        id: investigationId,
      },

      include: {
        check: true,

        artifacts: {
          where: {
            type: "TRANSUNION",
          },
        },
      },
    });

  if (!investigation) {
    throw createHttpError(
      "Investigación no encontrada",
      404,
      "INVESTIGATION_NOT_FOUND"
    );
  }

  const analysisEvidence =
    analysisEvidenceId
      ? await prisma.evidence.findUnique({
          where: {
            id:
              analysisEvidenceId,
          },
        })
      : await prisma.evidence.findFirst({
          where: {
            investigationId,

            artifactId: null,

            type:
              "TRANSUNION_ANALYSIS",

            extractionStatus:
              "COMPLETED",
          },

          orderBy: {
            updatedAt: "desc",
          },
        });

  if (!analysisEvidence) {
    throw createHttpError(
      "No existe una evidencia TRANSUNION_ANALYSIS completada",
      409,
      "TRANSUNION_ANALYSIS_MISSING"
    );
  }

  if (
    analysisEvidence.investigationId !==
      investigationId ||
    analysisEvidence.type !==
      "TRANSUNION_ANALYSIS"
  ) {
    throw createHttpError(
      "La evidencia de análisis no corresponde a la investigación",
      409,
      "TRANSUNION_ANALYSIS_MISMATCH"
    );
  }

  const analysis =
    analysisEvidence.data || {};

  const risk =
    normalizeRisk(
      analysis.risk
    );

  const confidence =
    clamp(
      analysis.confidence
    );

  const findings =
    Array.isArray(
      analysis.findings
    )
      ? analysis.findings
      : [];

  const recommendations =
    Array.isArray(
      analysis.recommendations
    )
      ? analysis.recommendations
      : [];

  const verdict =
    resolveVerdict(risk);

  const nextSteps =
    buildNextSteps(
      recommendations
    );

  const reportData = {
    source: "TRANSUNION",
    stage: "REPORT",

    schemaVersion:
      TRANSUNION_REPORT_SCHEMA_VERSION,

    sourceAnalysisEvidenceId:
      analysisEvidence.id,

    sourceAnalysisSchemaVersion:
      analysis.schemaVersion ||
      null,

    verdict,

    risk,
    confidence,

    coverage:
      Number(
        analysis.coverage
      ) || 0,

    executiveSummary:
      analysis.summary ||
      "El análisis TransUnion fue completado.",

    vehicle:
      analysis.vehicle || null,

    prices:
      analysis.prices || null,

    platesDetected:
      Array.isArray(
        analysis.platesDetected
      )
        ? analysis.platesDetected
        : [],

    categoryAssessment:
      analysis.categoryAssessment ||
      null,

    insurance:
      analysis.insurance || {
        allPolicies: [],
        activePolicies: [],
        expiredPolicies: [],
      },

    claims:
      Array.isArray(
        analysis.claims
      )
        ? analysis.claims
        : [],

    theftChecks:
      Array.isArray(
        analysis.theftChecks
      )
        ? analysis.theftChecks
        : [],

    financings:
      Array.isArray(
        analysis.financings
      )
        ? analysis.financings
        : [],

    dealerInformation:
      Array.isArray(
        analysis.dealerInformation
      )
        ? analysis.dealerInformation
        : [],

    sectionsWithoutInformation:
      Array.isArray(
        analysis.sectionsWithoutInformation
      )
        ? analysis.sectionsWithoutInformation
        : [],

    findings,
    recommendations,
    nextSteps,

    transparency: {
      confidence,

      coverage:
        Number(
          analysis.coverage
        ) || 0,

      evidenceChain: [
        "TRANSUNION_RAW",
        "TRANSUNION_NORMALIZED",
        "TRANSUNION_ANALYSIS",
        "TRANSUNION_REPORT",
      ],

      statement:
        "Resultado generado a partir del reporte TransUnion aportado, reglas auditables de Carvanta y análisis estructurado.",
    },

    disclaimer:
      "La información de TransUnion proviene de diversas fuentes y debe interpretarse como evidencia complementaria. No sustituye la inspección física, la revisión documental ni las consultas oficiales vigentes.",

    preview: {
      source: "TRANSUNION",

      title:
        "Dictamen TransUnion",

      status:
        verdict.status,

      risk,
      confidence,

      coverage:
        Number(
          analysis.coverage
        ) || 0,

      summary:
        analysis.summary ||
        "El análisis TransUnion fue completado.",

      verdict,

      vehicle:
        analysis.vehicle ||
        null,

      platesDetected:
        Array.isArray(
          analysis.platesDetected
        )
          ? analysis.platesDetected
          : [],

      categoryAssessment:
        analysis.categoryAssessment ||
        null,

      findings,
      recommendations,
      nextSteps,
    },

    provenance: {
      dictator:
        "transunion-dictator-v1",

      dictatedAt:
        new Date().toISOString(),
    },
  };

  const findingRecords =
    buildFindingRecords({
      investigationId,
      findings,
    });

  const result =
    await prisma.$transaction(
      async (transaction) => {
        const existingEvidence =
          await transaction.evidence.findFirst({
            where: {
              investigationId,

              artifactId: null,

              type:
                "TRANSUNION_REPORT",
            },
          });

        const evidence =
          existingEvidence
            ? await transaction.evidence.update({
                where: {
                  id:
                    existingEvidence.id,
                },

                data: {
                  source:
                    "CARVANTA_DICTATOR",

                  data:
                    reportData,

                  extractionStatus:
                    "COMPLETED",

                  confidence,

                  extractor:
                    "transunion-dictator-v1",

                  extractedAt:
                    new Date(),

                  createdById:
                    userId,
                },
              })
            : await transaction.evidence.create({
                data: {
                  checkId:
                    investigation.checkId,

                  investigationId,

                  artifactId: null,

                  createdById:
                    userId,

                  source:
                    "CARVANTA_DICTATOR",

                  type:
                    "TRANSUNION_REPORT",

                  data:
                    reportData,

                  extractionStatus:
                    "COMPLETED",

                  confidence,

                  extractor:
                    "transunion-dictator-v1",

                  extractedAt:
                    new Date(),
                },
              });

        await transaction.finding.deleteMany({
          where: {
            investigationId,

            data: {
              path: ["source"],
              equals: "TRANSUNION",
            },
          },
        });

        if (
          findingRecords.length > 0
        ) {
          await transaction.finding.createMany({
            data:
              findingRecords,
          });
        }

        await transaction.artifact.updateMany({
          where: {
            investigationId,
            type: "TRANSUNION",
          },

          data: {
            processingStatus:
              "PROCESSED",

            processingError: null,
          },
        });

        return {
          evidence,
        };
      }
    );

  return {
    analysisEvidenceId:
      analysisEvidence.id,

    evidence:
      result.evidence,

    report:
      reportData,

    persistedFindings:
      findingRecords.length,

    processedArtifacts:
      investigation.artifacts.length,
  };
}

module.exports = {
  dictateTransUnion,
};