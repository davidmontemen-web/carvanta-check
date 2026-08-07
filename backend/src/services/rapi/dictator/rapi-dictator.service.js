const {
  prisma,
} = require("../../../lib/prisma");

const RAPI_REPORT_SCHEMA_VERSION = "1.0";

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

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, numeric)
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
      code: "INCOMPLETE_OR_REVIEW",
      label: "Revisión recomendada",
      status: "NEEDS_REVIEW",
    };
  }

  return {
    code: "NO_ALERTS_FOUND",
    label: "Sin alertas en las consultas aportadas",
    status: "COMPLETED",
  };
}

function buildExecutiveSummary({
  analysis,
  verdict,
}) {
  const summary = String(
    analysis.summary || ""
  ).trim();

  if (summary) {
    return summary;
  }

  if (
    verdict.code ===
    "NO_ALERTS_FOUND"
  ) {
    return (
      "Las consultas RAPI aportadas no muestran reportes " +
      "de procedencia ilícita para los identificadores revisados."
    );
  }

  return (
    "El análisis RAPI requiere revisión debido a incidencias " +
    "detectadas en las consultas o en los identificadores."
  );
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
      "RAPI_ACTION",

    priority:
      normalizeRisk(
        item.priority
      ),

    action:
      item.description ||
      item.title ||
      "Revisar el análisis RAPI.",
  }));
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
      "RAPI_FINDING",

    severity:
      normalizeRisk(
        finding.severity
      ),

    status: "OPEN",

    title:
      finding.title ||
      "Hallazgo RAPI",

    description:
      finding.description ||
      "Se detectó un hallazgo durante el análisis RAPI.",

    data: {
      source: "RAPI",
      code:
        finding.code ||
        "RAPI_FINDING",

      evidence:
        Array.isArray(
          finding.evidence
        )
          ? finding.evidence
          : [],
    },
  }));
}

async function dictateRapiInvestigation({
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
            type: {
              in: [
                "RAPI_VIN",
                "RAPI_PLACA",
              ],
            },
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
              "RAPI_ANALYSIS",

            extractionStatus:
              "COMPLETED",
          },

          orderBy: {
            updatedAt: "desc",
          },
        });

  if (!analysisEvidence) {
    throw createHttpError(
      "No existe una evidencia RAPI_ANALYSIS completada",
      409,
      "RAPI_ANALYSIS_EVIDENCE_MISSING"
    );
  }

  if (
    analysisEvidence.investigationId !==
      investigationId ||
    analysisEvidence.type !==
      "RAPI_ANALYSIS"
  ) {
    throw createHttpError(
      "La evidencia de análisis no corresponde a la investigación",
      409,
      "RAPI_ANALYSIS_EVIDENCE_MISMATCH"
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

  const executiveSummary =
    buildExecutiveSummary({
      analysis,
      verdict,
    });

  const nextSteps =
    buildNextSteps(
      recommendations
    );

  const reportData = {
    source: "RAPI",
    stage: "REPORT",

    schemaVersion:
      RAPI_REPORT_SCHEMA_VERSION,

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

    executiveSummary,

    findings,
    recommendations,
    nextSteps,

    identifiersChecked:
      analysis.deterministic
        ?.identifiersChecked ||
      analysis.preview
        ?.identifiersChecked ||
      [],

    transparency: {
      confidence,
      coverage:
        Number(
          analysis.coverage
        ) || 0,

      evidenceChain: [
        "RAPI_RAW",
        "RAPI_NORMALIZED",
        "RAPI_ANALYSIS",
        "RAPI_REPORT",
      ],

      statement:
        "Resultado generado a partir de las consultas RAPI aportadas y de reglas auditables de Carvanta.",
    },

    disclaimer:
      "La información de RAPI es de carácter informativo, no tiene efectos legales y no sustituye otras validaciones documentales, registrales o físicas.",

    preview: {
      source: "RAPI",

      status:
        verdict.status,

      title:
        "Dictamen RAPI",

      summary:
        executiveSummary,

      coverage:
        Number(
          analysis.coverage
        ) || 0,

      risk,
      confidence,

      findings,
      recommendations,
      verdict,
      nextSteps,

      identifiersChecked:
        analysis.deterministic
          ?.identifiersChecked ||
        analysis.preview
          ?.identifiersChecked ||
        [],
    },

    provenance: {
      dictator:
        "rapi-dictator-v1",

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
                "RAPI_REPORT",
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
                    "rapi-dictator-v1",

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

                  source:
                    "CARVANTA_DICTATOR",

                  type:
                    "RAPI_REPORT",

                  data:
                    reportData,

                  extractionStatus:
                    "COMPLETED",

                  confidence,

                  extractor:
                    "rapi-dictator-v1",

                  extractedAt:
                    new Date(),

                  createdById:
                    userId,
                },
              });

        await transaction.finding.deleteMany({
          where: {
            investigationId,

            data: {
              path: ["source"],
              equals: "RAPI",
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

            type: {
              in: [
                "RAPI_VIN",
                "RAPI_PLACA",
              ],
            },
          },

          data: {
            processingStatus:
              "PROCESSED",

            processingError:
              null,
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
  dictateRapiInvestigation,
};