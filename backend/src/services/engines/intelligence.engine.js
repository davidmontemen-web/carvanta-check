const {
  evaluateRepuve,
} = require("../rules/repuve/evaluateRepuve");

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
        "VEHICLE_BASE_VALIDATED"
    ) ||
    (await transaction.evidence.findFirst({
      where: {
        investigationId: investigation.id,
        type: "VEHICLE_BASE_VALIDATED",
        extractionStatus: "COMPLETED",
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
    throw error;
  }

  /*
   * El resultado REPUVE debe haber sido confirmado por el ejecutivo.
   * No utilizamos fixtures ni una extracción simulada.
   */
  const repuveEvidence =
    evidences.find(
      (evidence) =>
        evidence.type === "REPUVE_RESULT"
    ) ||
    (await transaction.evidence.findFirst({
      where: {
        investigationId: investigation.id,
        type: "REPUVE_RESULT",
        extractionStatus: "COMPLETED",
      },

      orderBy: {
        updatedAt: "desc",
      },
    }));

  if (!repuveEvidence) {
    const error = new Error(
      "La investigación no contiene un resultado REPUVE validado"
    );

    error.statusCode = 409;
    throw error;
  }

  /*
   * El evaluador compara:
   *
   * VEHICLE_BASE_VALIDATED
   * contra
   * REPUVE_RESULT
   *
   * y devuelve hallazgos reales basados en reglas.
   */
  const evaluatedFindings = evaluateRepuve({
    vehicleBase: vehicleBaseEvidence.data,
    repuve: repuveEvidence.data,
  });

  if (
    !Array.isArray(evaluatedFindings) ||
    evaluatedFindings.length === 0
  ) {
    const error = new Error(
      "El evaluador REPUVE no produjo hallazgos"
    );

    error.statusCode = 500;
    throw error;
  }

  const findings = [];

  /*
   * Persistimos cada resultado producido por el evaluador.
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