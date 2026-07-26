function normalizeFindingSeverity(value) {
  const severity =
    String(value || "").toUpperCase();

  if (
    [
      "INFO",
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
      "WARNING",
    ].includes(severity)
  ) {
    return severity;
  }

  return "INFO";
}

function buildRepuveFindings(
  repuveReport
) {
  const reportData =
    repuveReport?.data || {};

  const sourceFindings =
    Array.isArray(reportData.findings)
      ? reportData.findings
      : [];

  if (sourceFindings.length > 0) {
    return sourceFindings.map(
      (item, index) => {
        const rawImpact =
          item.scoreImpact ??
          item.data?.scoreImpact ??
          0;

        const scoreImpact =
          Number(rawImpact);

        return {
          type:
            item.type ||
            item.code ||
            `REPUVE_FINDING_${index + 1}`,

          severity:
            normalizeFindingSeverity(
              item.severity ||
                item.priority
            ),

          status:
            item.status || "OPEN",

          title:
            item.title ||
            "Resultado REPUVE",

          description:
            item.description ||
            item.message ||
            "REPUVE produjo un hallazgo durante el análisis.",

          data: {
            ...item,
            scoreImpact:
              Number.isFinite(scoreImpact)
                ? scoreImpact
                : 0,

            sourceEvidenceId:
              repuveReport.id,

            sourceType:
              "REPUVE_REPORT",
          },
        };
      }
    );
  }

  const approved =
    reportData.verdict?.code ===
    "APPROVED";

  return [
    {
      type: approved
        ? "REPUVE_VALIDATED"
        : "REPUVE_REVIEW_REQUIRED",

      severity: approved
        ? "INFO"
        : "WARNING",

      status: "OPEN",

      title: approved
        ? "Consulta REPUVE procesada"
        : "REPUVE requiere revisión",

      description:
        reportData.executiveSummary ||
        reportData.preview?.summary ||
        "El dictamen REPUVE fue procesado correctamente.",

      data: {
        scoreImpact: 0,
        sourceEvidenceId:
          repuveReport.id,
        sourceType:
          "REPUVE_REPORT",
        verdict:
          reportData.verdict || null,
        trustIndex:
          reportData.trustIndex || null,
      },
    },
  ];
}

async function runIntelligenceEngine({
  transaction,
  investigation,
  evidences,
}) {
  /*
   * Eliminamos únicamente:
   *
   * 1. Los hallazgos REPUVE generados en una ejecución anterior.
   * 2. Los hallazgos simulados del pipeline anterior.
   *
   * No eliminamos hallazgos manuales ni los de futuras fuentes.
   */
  await transaction.finding.deleteMany({
    where: {
      investigationId: investigation.id,

      OR: [
        {
          type: {
            startsWith: "REPUVE_",
          },
        },

        {
          type: {
            startsWith: "SIMULATED_",
          },
        },
      ],
    },
  });

  /*
   * La identidad base puede venir en la colección de evidencias
   * recibida por el pipeline o consultarse directamente en BD.
   */
  const vehicleBaseEvidence =
    evidences.find(
      (evidence) =>
        evidence.type ===
          "VEHICLE_BASE_VALIDATED" &&
        evidence.extractionStatus ===
          "COMPLETED"
    ) ||
    (await transaction.evidence.findFirst({
      where: {
        investigationId:
          investigation.id,

        type:
          "VEHICLE_BASE_VALIDATED",

        extractionStatus:
          "COMPLETED",
      },

      orderBy: {
        updatedAt: "desc",
      },
    }));

  if (!vehicleBaseEvidence) {
    const error = new Error(
      "Primero debes validar la identidad base del vehículo"
    );

    error.statusCode = 409;
    error.code =
      "VEHICLE_BASE_REQUIRED";

    throw error;
  }

  /*
   * El dictamen moderno REPUVE_REPORT
   * ya contiene los hallazgos de la fuente.
   *
   * El motor general los convierte en Finding
   * para incorporarlos al reporte Carvanta.
   */
  const repuveReport =
    evidences.find(
      (evidence) =>
        evidence.type ===
          "REPUVE_REPORT" &&
        evidence.extractionStatus ===
          "COMPLETED"
    ) ||
    (await transaction.evidence.findFirst({
      where: {
        investigationId:
          investigation.id,

        type: "REPUVE_REPORT",

        extractionStatus:
          "COMPLETED",
      },

      orderBy: {
        updatedAt: "desc",
      },
    }));

  if (!repuveReport) {
    const error = new Error(
      "Debes procesar REPUVE antes de generar el reporte final"
    );

    error.statusCode = 409;
    error.code =
      "REPUVE_ASSESSMENT_REQUIRED";

    throw error;
  }

  const evaluatedFindings =
    buildRepuveFindings(
      repuveReport
    );

  const findings = [];

  /*
   * Persistimos cada resultado producido por el dictamen REPUVE.
   */
  for (const findingData of evaluatedFindings) {
    const finding =
      await transaction.finding.create({
        data: {
          investigationId: investigation.id,

          type: findingData.type,

          severity:
            findingData.severity || "INFO",

          status:
            findingData.status || "OPEN",

          title: findingData.title,

          description:
            findingData.description,

          data: findingData.data || null,
        },
      });

    findings.push(finding);
  }

  return findings;
}

module.exports = {
  runIntelligenceEngine,
};
