const VERDICTS = {
  APPROVED: {
    code: "APPROVED",
    label: "Apto para continuar",
    color: "GREEN",
  },
  REVIEW_REQUIRED: {
    code: "REVIEW_REQUIRED",
    label: "Requiere validación adicional",
    color: "ORANGE",
  },
  NOT_RECOMMENDED: {
    code: "NOT_RECOMMENDED",
    label: "No recomendado",
    color: "RED",
  },
};

function resolveVerdict({ analysis = {}, trustIndex = {} }) {
  const findings = Array.isArray(analysis.findings)
    ? analysis.findings
    : [];
  const codes = new Set(
    findings.map((finding) => finding?.code).filter(Boolean)
  );
  const reasons = [];

  if (codes.has("THEFT_REPORT")) {
    reasons.push("Se detectó un reporte de robo.");
  }

  if (analysis.risk === "CRITICAL") {
    reasons.push("El análisis contiene riesgo crítico.");
  }

  if (
    codes.has("THEFT_REPORT") ||
    analysis.risk === "CRITICAL" ||
    Number(trustIndex.score) < 60
  ) {
    return {
      ...VERDICTS.NOT_RECOMMENDED,
      reasons: reasons.length
        ? reasons
        : ["El Índice Carvanta es insuficiente para recomendar la operación."],
      engine: "repuve-verdict-engine-v1",
    };
  }

  if (codes.has("RECOVERED_VEHICLE")) {
    reasons.push(
      "Existe un antecedente de recuperación que requiere revisión documental."
    );
  }
  if (codes.has("VIN_MISMATCH") || codes.has("VIN_MISSING")) {
    reasons.push("La identidad VIN requiere validación física.");
  }
  if (analysis.risk === "HIGH") {
    reasons.push("El análisis contiene hallazgos de riesgo alto.");
  }
  if (Number(analysis.coverage) < 80) {
    reasons.push("La cobertura de la evidencia es insuficiente.");
  }
  if (Number(trustIndex.score) < 85) {
    reasons.push("El Índice Carvanta requiere validaciones adicionales.");
  }

  if (reasons.length > 0) {
    return {
      ...VERDICTS.REVIEW_REQUIRED,
      reasons,
      engine: "repuve-verdict-engine-v1",
    };
  }

  return {
    ...VERDICTS.APPROVED,
    reasons: [
      "No se detectaron riesgos jurídicos críticos en la evidencia analizada.",
      "El nivel de cobertura e Índice Carvanta permiten continuar con la investigación.",
    ],
    engine: "repuve-verdict-engine-v1",
  };
}

module.exports = {
  VERDICTS,
  resolveVerdict,
};
