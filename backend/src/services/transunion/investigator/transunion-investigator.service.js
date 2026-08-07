const {
  prisma,
} = require("../../../lib/prisma");

const {
  generateStructuredAnalysis,
} = require(
  "../../ai/openai-structured.client"
);

const {
  TRANSUNION_ANALYSIS_SCHEMA_VERSION,
  transunionInvestigatorJsonSchema,
} = require(
  "./transunion-investigator.schema"
);

const {
  buildTransUnionInvestigatorInstructions,
} = require(
  "./transunion-investigator.prompt"
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

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
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

function includesAny(value, terms) {
  const normalized =
    normalizeText(value);

  return terms.some((term) =>
    normalized.includes(
      normalizeText(term)
    )
  );
}

function buildRule({
  code,
  severity,
  category,
  title,
  description,
  customerMeaning,
  evidence = [],
}) {
  return {
    code,
    severity,
    category,
    title,
    description,
    customerMeaning,
    evidence,
  };
}

function buildDeterministicContext(
  normalized
) {
  const rules = [];

  for (const issue of
    normalized?.validation?.issues || []) {
    rules.push(
      buildRule({
        code:
          issue.code ||
          "TRANSUNION_VALIDATION_ISSUE",

        severity:
          issue.severity ||
          "HIGH",

        category: "IDENTITY",

        title:
          "Inconsistencia de identidad vehicular",

        description:
          issue.message ||
          "Se detectó una inconsistencia en la identidad del vehículo.",

        customerMeaning:
          "El reporte no puede asociarse de forma confiable con el vehículo investigado hasta aclarar la diferencia.",

        evidence: [
          JSON.stringify(
            issue.data || {}
          ),
        ],
      })
    );
  }

  for (const theftCheck of
    normalized?.theftChecks || []) {
    const status =
      theftCheck.status || "";

    if (
      includesAny(status, [
        "REPORTE DE ROBO",
        "ROBADO",
        "ROBO VIGENTE",
        "CON REPORTE",
      ]) &&
      !includesAny(status, [
        "SIN REPORTE",
        "NO CUENTA",
      ])
    ) {
      rules.push(
        buildRule({
          code:
            "TRANSUNION_THEFT_ALERT",

          severity: "CRITICAL",
          category: "THEFT",

          title:
            "Alerta de robo reportada",

          description:
            "Una de las fuentes incluidas en TransUnion muestra un reporte o alerta de robo.",

          customerMeaning:
            "No debe continuarse con la compra hasta aclarar oficialmente la situación jurídica del vehículo.",

          evidence: [
            `Institución: ${
              theftCheck.institution ||
              "No identificada"
            }`,

            `Estatus: ${status}`,

            `Identificador: ${
              theftCheck.queriedValue ||
              "No identificado"
            }`,
          ],
        })
      );
    }
  }

  for (const financing of
    normalized?.financings || []) {
    const status =
      normalizeText(
        financing.status
      );

    if (
      status &&
      !includesAny(status, [
        "CANCELADO",
        "CERRADO",
        "LIQUIDADO",
        "TERMINADO",
      ])
    ) {
      rules.push(
        buildRule({
          code:
            "TRANSUNION_FINANCING_REVIEW",

          severity: "HIGH",
          category: "FINANCING",

          title:
            "Financiamiento pendiente de aclarar",

          description:
            "El reporte contiene un financiamiento que no aparece claramente cancelado o liquidado.",

          customerMeaning:
            "Antes de comprar debe comprobarse que no exista un crédito, gravamen o derecho pendiente relacionado con el vehículo.",

          evidence: [
            `Tipo: ${
              financing.financingType ||
              "No identificado"
            }`,

            `Estatus: ${
              financing.status ||
              "No identificado"
            }`,
          ],
        })
      );
    }
  }

  for (const claim of
    normalized?.claims || []) {
    rules.push(
      buildRule({
        code:
          "TRANSUNION_CLAIM_HISTORY",

        severity: "MEDIUM",
        category: "CLAIMS",

        title:
          "Antecedente de siniestro",

        description:
          `TransUnion reporta un siniestro${
            claim.description
              ? ` por ${claim.description}`
              : ""
          }.`,

        customerMeaning:
          "Conviene inspeccionar físicamente la unidad y revisar la calidad de las reparaciones antes de comprar.",

        evidence: [
          `Fecha: ${
            claim.occurredDate ||
            "No identificada"
          }`,

          `Indemnización: ${
            claim.indemnificationAmount ??
            "No disponible"
          }`,

          `Reserva: ${
            claim.reserveAmount ??
            "No disponible"
          }`,
        ],
      })
    );
  }

  for (const dealer of
    normalized?.dealerInformation || []) {
    if (
      includesAny(
        dealer.physicalCondition,
        [
          "DAÑO",
          "GOLPE",
          "MECANICO",
          "ESTETICO",
          "REPARACION",
        ]
      )
    ) {
      rules.push(
        buildRule({
          code:
            "TRANSUNION_REPORTED_DAMAGE",

          severity: "MEDIUM",
          category: "CONDITION",

          title:
            "Daño físico reportado",

          description:
            `La distribuidora registró la condición: ${
              dealer.physicalCondition
            }.`,

          customerMeaning:
            "La unidad requiere una inspección mecánica y estética independiente para conocer el alcance real del daño.",

          evidence: [
            `Institución: ${
              dealer.institution ||
              "No identificada"
            }`,

            `Kilometraje: ${
              dealer.mileage ??
              "No disponible"
            }`,
          ],
        })
      );
    }
  }

  const missingSections =
    normalized
      ?.sectionsWithoutInformation ||
    [];

  const criticalSectionTerms = [
    "PERDIDA TOTAL",
    "SALVAMENTO",
    "SINIESTROS DE ROBO",
    "TENENCIAS",
    "CHATARRIZACION",
    "POLIZA",
    "SINIESTROS",
  ];

  const relevantMissing =
    missingSections.filter((section) =>
      criticalSectionTerms.some(
        (term) =>
          normalizeText(section).includes(
            term
          )
      )
    );

  if (relevantMissing.length > 0) {
    rules.push(
      buildRule({
        code:
          "TRANSUNION_INFORMATION_GAPS",

        severity: "LOW",
        category: "COVERAGE",

        title:
          "Secciones sin información disponible",

        description:
          "TransUnion no aportó información para algunas categorías relevantes.",

        customerMeaning:
          "La ausencia de datos no confirma que esos antecedentes nunca hayan existido; deben revisarse en otras fuentes.",

        evidence:
          relevantMissing,
      })
    );
  }

  const plates =
    normalized?.plates?.distinct || [];

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

    platesToInvestigate:
      plates,

    totals: {
      policies:
        normalized?.insurance
          ?.allPolicies?.length || 0,

      activePolicies:
        normalized?.insurance
          ?.activePolicies?.length || 0,

      claims:
        normalized?.claims
          ?.length || 0,

      financings:
        normalized?.financings
          ?.length || 0,

      theftChecks:
        normalized?.theftChecks
          ?.length || 0,

      plates:
        plates.length,
    },

    coverage:
      normalized?.coverage
        ?.percentage || 0,

    vehicle:
      normalized?.vehicle || {},
  };
}

function mergeUniqueItems(
  deterministic,
  aiItems
) {
  const result = [];
  const seen = new Set();

  for (const item of [
    ...(deterministic || []),
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

function buildRequiredRecommendations(
  findings
) {
  const codes = new Set(
    findings.map(
      (finding) => finding.code
    )
  );

  const recommendations = [];

  if (
    codes.has(
      "TRANSUNION_VIN_MISMATCH"
    )
  ) {
    recommendations.push({
      code:
        "VERIFY_TRANSUNION_VIN",

      priority: "HIGH",

      title:
        "Obtener el reporte correcto",

      description:
        "Generar un reporte TransUnion utilizando exactamente el VIN del expediente antes de tomar decisiones.",
    });
  }

  if (
    codes.has(
      "TRANSUNION_THEFT_ALERT"
    )
  ) {
    recommendations.push({
      code:
        "STOP_TRANSACTION",

      priority: "CRITICAL",

      title:
        "Detener la operación",

      description:
        "No continuar con la compra hasta aclarar oficialmente el reporte de robo.",
    });
  }

  if (
    codes.has(
      "TRANSUNION_FINANCING_REVIEW"
    )
  ) {
    recommendations.push({
      code:
        "VERIFY_FINANCING_STATUS",

      priority: "HIGH",

      title:
        "Validar el financiamiento",

      description:
        "Solicitar carta finiquito, liberación o documentación que acredite la terminación del financiamiento.",
    });
  }

  if (
    codes.has(
      "TRANSUNION_CLAIM_HISTORY"
    ) ||
    codes.has(
      "TRANSUNION_REPORTED_DAMAGE"
    )
  ) {
    recommendations.push({
      code:
        "PERFORM_PHYSICAL_INSPECTION",

      priority: "MEDIUM",

      title:
        "Realizar inspección física",

      description:
        "Revisar estructura, carrocería, pintura, componentes mecánicos y calidad de reparaciones antes de comprar.",
    });
  }

  return recommendations;
}

async function investigateTransUnion({
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
              "TRANSUNION_NORMALIZED",

            extractionStatus:
              "COMPLETED",
          },

          orderBy: {
            updatedAt: "desc",
          },
        });

  if (!normalizedEvidence) {
    throw createHttpError(
      "No existe una evidencia TRANSUNION_NORMALIZED completada",
      409,
      "TRANSUNION_NORMALIZED_MISSING"
    );
  }

  if (
    normalizedEvidence
      .investigationId !==
      investigationId ||
    normalizedEvidence.type !==
      "TRANSUNION_NORMALIZED"
  ) {
    throw createHttpError(
      "La evidencia normalizada no corresponde a la investigación",
      409,
      "TRANSUNION_NORMALIZED_MISMATCH"
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
        buildTransUnionInvestigatorInstructions(),

      input: {
        source: "TRANSUNION",

        normalizedKnowledge:
          normalized,

        deterministic,
      },

      jsonSchema:
        transunionInvestigatorJsonSchema,
    });

  const findings =
    mergeUniqueItems(
      deterministic.rules,
      aiResult.data.findings
    );

  const recommendations =
    mergeUniqueItems(
      buildRequiredRecommendations(
        findings
      ),
      aiResult.data.recommendations
    );

  const risk =
    maxRisk(
      deterministic
        .deterministicRisk,
      aiResult.data.risk
    );

  const confidence =
    Number(
      Math.min(
        clamp(
          aiResult.data.confidence
        ),
        clamp(
          normalizedEvidence.confidence
        ) || 1
      ).toFixed(4)
    );

  const preview = {
    source: "TRANSUNION",

    title:
      "Análisis TransUnion",

    status:
      ["HIGH", "CRITICAL"].includes(
        risk
      )
        ? "NEEDS_REVIEW"
        : "COMPLETED",

    risk,
    confidence,

    coverage:
      deterministic.coverage,

    summary:
      aiResult.data.summary,

    vehicle:
      normalized.vehicle,

    platesDetected:
      deterministic
        .platesToInvestigate,

    categoryAssessment:
      aiResult.data
        .categoryAssessment,

    findings,
    recommendations,

    reasoning:
      aiResult.data.reasoning,
  };

  const analysisData = {
    source: "TRANSUNION",
    stage: "ANALYSIS",

    schemaVersion:
      TRANSUNION_ANALYSIS_SCHEMA_VERSION,

    sourceNormalizedEvidenceId:
      normalizedEvidence.id,

    sourceNormalizedSchemaVersion:
      normalized.schemaVersion ||
      null,

    summary:
      preview.summary,

    risk,
    confidence,

    coverage:
      deterministic.coverage,

    vehicle:
      normalized.vehicle,

    prices:
      normalized.prices,

    platesDetected:
      deterministic
        .platesToInvestigate,

    insurance:
      normalized.insurance,

    claims:
      normalized.claims,

    theftChecks:
      normalized.theftChecks,

    financings:
      normalized.financings,

    dealerInformation:
      normalized.dealerInformation,

    sectionsWithoutInformation:
      normalized
        .sectionsWithoutInformation ||
      [],

    categoryAssessment:
      aiResult.data
        .categoryAssessment,

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
        "transunion-investigator-v1",

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
          "TRANSUNION_ANALYSIS",
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
              "transunion-investigator-v1",

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

            createdById:
              userId,

            source:
              "CARVANTA_INVESTIGATOR",

            type:
              "TRANSUNION_ANALYSIS",

            data:
              analysisData,

            extractionStatus:
              "COMPLETED",

            confidence,

            extractor:
              "transunion-investigator-v1",

            extractedAt:
              new Date(),
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
  investigateTransUnion,
};