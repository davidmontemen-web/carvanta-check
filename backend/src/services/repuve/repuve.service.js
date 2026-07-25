const {
  REPUVE_RESULTS,
  REPUVE_RESULT_LABELS,
  REPUVE_RISK_LEVELS,
  REPUVE_CONFIDENCE_LEVELS,
  REPUVE_TASK_STATUS,
  REPUVE_FINDING_TYPES,
  REPUVE_RECOMMENDATION_TYPES,
} = require("./repuve.constants");

function normalizeComparable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeRepuveResult(value) {
  const normalized = normalizeComparable(value);
  const aliases = {
    SINREPORTEDEROBO: REPUVE_RESULTS.NO_THEFT_REPORT,
    NOREPORT: REPUVE_RESULTS.NO_THEFT_REPORT,
    NOTHEFTREPORT: REPUVE_RESULTS.NO_THEFT_REPORT,
    CONREPORTEDEROBO: REPUVE_RESULTS.THEFT_REPORT,
    REPORTEDEROBOVIGENTE: REPUVE_RESULTS.THEFT_REPORT,
    THEFTREPORT: REPUVE_RESULTS.THEFT_REPORT,
    RECUPERADO: REPUVE_RESULTS.RECOVERED,
    VEHICULORECUPERADO: REPUVE_RESULTS.RECOVERED,
    RECOVERED: REPUVE_RESULTS.RECOVERED,
    NOENCONTRADO: REPUVE_RESULTS.NOT_FOUND,
    SINREGISTRO: REPUVE_RESULTS.NOT_FOUND,
    NOTFOUND: REPUVE_RESULTS.NOT_FOUND,
    OTRO: REPUVE_RESULTS.OTHER,
    OTHER: REPUVE_RESULTS.OTHER,
  };

  if (Object.values(REPUVE_RESULTS).includes(value)) return value;
  return aliases[normalized] || REPUVE_RESULTS.OTHER;
}

function buildRepuveSnapshot(check = {}) {
  return {
    vin: normalizeText(check.vin),
    plate: normalizeText(check.placas ?? check.plate),
  };
}

function normalizeRepuveEvidence(evidence = {}) {
  return {
    queryDate: evidence.queryDate || evidence.fechaConsulta || "",
    queriedVin: normalizeText(evidence.queriedVin ?? evidence.vinConsultado ?? evidence.vin),
    queriedPlate: normalizeText(evidence.queriedPlate ?? evidence.placasConsultadas ?? evidence.plate ?? evidence.placas),
    result: normalizeRepuveResult(evidence.result ?? evidence.resultado ?? evidence.resultadoOficial),
    officialFolio: normalizeText(evidence.officialFolio ?? evidence.folio ?? evidence.folioConsulta),
    observations: normalizeText(evidence.observations ?? evidence.observaciones),
    evidenceReviewed: Boolean(evidence.evidenceReviewed ?? evidence.evidenciaRevisada ?? evidence.confirmed),
  };
}

function compareRepuveIdentity(customerData = {}, evidence = {}) {
  const vinCustomer = normalizeComparable(customerData.vin);
  const vinQueried = normalizeComparable(evidence.queriedVin);
  const plateCustomer = normalizeComparable(customerData.plate ?? customerData.placas);
  const plateQueried = normalizeComparable(evidence.queriedPlate);

  return {
    vin: {
      field: "vin",
      label: "VIN",
      customerValue: customerData.vin || "",
      consultedValue: evidence.queriedVin || "",
      status: !vinQueried ? "MISSING" : !vinCustomer ? "ADDED" : vinCustomer === vinQueried ? "MATCH" : "MISMATCH",
      severity: "HIGH",
    },
    plate: {
      field: "plate",
      label: "placas",
      customerValue: customerData.plate ?? customerData.placas ?? "",
      consultedValue: evidence.queriedPlate || "",
      status: !plateQueried ? "MISSING" : !plateCustomer ? "ADDED" : plateCustomer === plateQueried ? "MATCH" : "MISMATCH",
      severity: "MEDIUM",
    },
  };
}

function buildFinding({ type, severity, title, description, data = {} }) {
  return { type, severity, title, description, data: { source: "REPUVE", ...data } };
}

function buildRepuveFindings({ customerData = {}, evidence = {}, comparisons } = {}) {
  const normalizedEvidence = normalizeRepuveEvidence(evidence);
  const identityComparisons = comparisons || compareRepuveIdentity(customerData, normalizedEvidence);
  const findings = [];

  if (identityComparisons.vin.status === "MISMATCH") {
    findings.push(buildFinding({
      type: REPUVE_FINDING_TYPES.VIN_MISMATCH,
      severity: "HIGH",
      title: "El VIN consultado no coincide",
      description: "El VIN utilizado en la consulta REPUVE no coincide con el VIN registrado en el expediente.",
      data: identityComparisons.vin,
    }));
  } else if (identityComparisons.vin.status === "MISSING") {
    findings.push(buildFinding({
      type: REPUVE_FINDING_TYPES.INCOMPLETE_QUERY,
      severity: "HIGH",
      title: "Consulta REPUVE sin VIN",
      description: "No se registró el VIN utilizado en la consulta REPUVE.",
      data: identityComparisons.vin,
    }));
  }

  if (identityComparisons.plate.status === "MISMATCH") {
    findings.push(buildFinding({
      type: REPUVE_FINDING_TYPES.PLATE_MISMATCH,
      severity: "MEDIUM",
      title: "Las placas consultadas no coinciden",
      description: "Las placas utilizadas en la consulta REPUVE no coinciden con las registradas en el expediente.",
      data: identityComparisons.plate,
    }));
  }

  switch (normalizedEvidence.result) {
    case REPUVE_RESULTS.THEFT_REPORT:
      findings.push(buildFinding({ type: REPUVE_FINDING_TYPES.THEFT_REPORT, severity: "CRITICAL", title: "Reporte de robo vigente", description: "La consulta REPUVE indica un reporte de robo. La operación debe detenerse hasta validar la situación jurídica del vehículo.", data: { result: normalizedEvidence.result } }));
      break;
    case REPUVE_RESULTS.RECOVERED:
      findings.push(buildFinding({ type: REPUVE_FINDING_TYPES.RECOVERED_VEHICLE, severity: "HIGH", title: "Vehículo con antecedente de recuperación", description: "La consulta REPUVE indica que el vehículo fue recuperado. Debe revisarse la documentación de liberación y recuperación.", data: { result: normalizedEvidence.result } }));
      break;
    case REPUVE_RESULTS.NOT_FOUND:
      findings.push(buildFinding({ type: REPUVE_FINDING_TYPES.NOT_FOUND, severity: "MEDIUM", title: "Vehículo no encontrado en REPUVE", description: "La consulta no devolvió un registro concluyente. Se requiere repetir la consulta y validar manualmente los datos.", data: { result: normalizedEvidence.result } }));
      break;
    case REPUVE_RESULTS.OTHER:
      findings.push(buildFinding({ type: REPUVE_FINDING_TYPES.OTHER_RESULT, severity: "MEDIUM", title: "Resultado REPUVE no estandarizado", description: "El resultado capturado no corresponde a una clasificación estándar y requiere revisión manual.", data: { result: normalizedEvidence.result, observations: normalizedEvidence.observations } }));
      break;
    default:
      break;
  }

  if (!normalizedEvidence.evidenceReviewed) {
    findings.push(buildFinding({ type: REPUVE_FINDING_TYPES.INCOMPLETE_QUERY, severity: "MEDIUM", title: "Evidencia oficial pendiente de confirmación", description: "El investigador no confirmó que revisó la evidencia oficial de la consulta REPUVE.", data: { evidenceReviewed: false } }));
  }

  return findings;
}

function buildRepuveRecommendations(findings = []) {
  const types = new Set(findings.map((finding) => finding.type));
  const recommendations = [];

  if (types.has(REPUVE_FINDING_TYPES.THEFT_REPORT)) recommendations.push({ type: REPUVE_RECOMMENDATION_TYPES.STOP_TRANSACTION, priority: "CRITICAL", title: "Detener la operación", description: "No continuar con compra, venta, toma o financiamiento hasta aclarar legalmente el reporte de robo." });
  if (types.has(REPUVE_FINDING_TYPES.VIN_MISMATCH) || types.has(REPUVE_FINDING_TYPES.INCOMPLETE_QUERY)) recommendations.push({ type: REPUVE_RECOMMENDATION_TYPES.VERIFY_VIN, priority: "HIGH", title: "Validar físicamente el VIN", description: "Comparar el VIN del expediente contra chasis, tablero y documentación antes de repetir la consulta." });
  if (types.has(REPUVE_FINDING_TYPES.PLATE_MISMATCH)) recommendations.push({ type: REPUVE_RECOMMENDATION_TYPES.VERIFY_PLATE, priority: "MEDIUM", title: "Confirmar placas", description: "Validar las placas actuales del vehículo y repetir la consulta con el dato correcto." });
  if (types.has(REPUVE_FINDING_TYPES.RECOVERED_VEHICLE)) recommendations.push({ type: REPUVE_RECOMMENDATION_TYPES.REVIEW_RECOVERY_DOCUMENTS, priority: "HIGH", title: "Revisar documentos de recuperación", description: "Solicitar constancia de recuperación, liberación ministerial y documentación que acredite la situación jurídica actual." });
  if (types.has(REPUVE_FINDING_TYPES.NOT_FOUND) || types.has(REPUVE_FINDING_TYPES.OTHER_RESULT)) recommendations.push({ type: REPUVE_RECOMMENDATION_TYPES.MANUAL_REVIEW, priority: "MEDIUM", title: "Realizar revisión manual", description: "Repetir la consulta oficial y documentar el resultado con folio, fecha y evidencia legible." });
  if (recommendations.length === 0) recommendations.push({ type: REPUVE_RECOMMENDATION_TYPES.REQUEST_OFFICIAL_EVIDENCE, priority: "LOW", title: "Conservar evidencia oficial", description: "Guardar folio, fecha y evidencia de la consulta REPUVE dentro del expediente." });

  return recommendations;
}

function calculateRepuveRisk(findings = []) {
  if (findings.some((finding) => finding.severity === "CRITICAL")) return REPUVE_RISK_LEVELS.CRITICAL;
  if (findings.some((finding) => finding.severity === "HIGH")) return REPUVE_RISK_LEVELS.HIGH;
  if (findings.some((finding) => finding.severity === "MEDIUM")) return REPUVE_RISK_LEVELS.MEDIUM;
  return REPUVE_RISK_LEVELS.LOW;
}

function calculateRepuveConfidence({ evidence = {}, comparisons } = {}) {
  const normalizedEvidence = normalizeRepuveEvidence(evidence);
  const identityComparisons = comparisons || {};
  const hasQueryReference = Boolean(normalizedEvidence.queryDate) || Boolean(normalizedEvidence.officialFolio);
  const identityComplete = identityComparisons.vin?.status !== "MISSING" && Boolean(identityComparisons.vin?.consultedValue);
  if (normalizedEvidence.evidenceReviewed && hasQueryReference && identityComplete) return REPUVE_CONFIDENCE_LEVELS.HIGH;
  if (normalizedEvidence.evidenceReviewed && identityComplete) return REPUVE_CONFIDENCE_LEVELS.MEDIUM;
  return REPUVE_CONFIDENCE_LEVELS.LOW;
}

function calculateCoverage(evidence = {}) {
  const normalizedEvidence = normalizeRepuveEvidence(evidence);
  const checks = [Boolean(normalizedEvidence.queryDate), Boolean(normalizedEvidence.queriedVin), Boolean(normalizedEvidence.result), normalizedEvidence.evidenceReviewed];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function resolveTaskStatus({ findings = [], evidence = {} } = {}) {
  const normalizedEvidence = normalizeRepuveEvidence(evidence);
  const hasAnyData = Boolean(normalizedEvidence.queryDate || normalizedEvidence.queriedVin || normalizedEvidence.queriedPlate || normalizedEvidence.officialFolio || normalizedEvidence.observations);
  if (!hasAnyData) return REPUVE_TASK_STATUS.PENDING;
  if (!normalizedEvidence.queryDate || !normalizedEvidence.queriedVin || !normalizedEvidence.evidenceReviewed) return REPUVE_TASK_STATUS.IN_PROGRESS;
  if (findings.length > 0) return REPUVE_TASK_STATUS.NEEDS_REVIEW;
  return REPUVE_TASK_STATUS.COMPLETED;
}

function buildRepuvePreview({ customerData = {}, evidence = {} } = {}) {
  const normalizedEvidence = normalizeRepuveEvidence(evidence);
  const comparisons = compareRepuveIdentity(customerData, normalizedEvidence);
  const findings = buildRepuveFindings({ customerData, evidence: normalizedEvidence, comparisons });
  const recommendations = buildRepuveRecommendations(findings);
  const risk = calculateRepuveRisk(findings);
  const confidence = calculateRepuveConfidence({ evidence: normalizedEvidence, comparisons });
  const status = resolveTaskStatus({ findings, evidence: normalizedEvidence });
  const resultLabel = REPUVE_RESULT_LABELS[normalizedEvidence.result] || REPUVE_RESULT_LABELS[REPUVE_RESULTS.OTHER];

  let summary = `La consulta REPUVE fue registrada con resultado: ${resultLabel}.`;
  if (risk === REPUVE_RISK_LEVELS.CRITICAL) summary = "La consulta REPUVE presenta un riesgo crítico que requiere detener la operación y realizar validación jurídica.";
  else if (findings.length > 0) summary = `La consulta REPUVE presenta ${findings.length} hallazgo(s) que requieren revisión.`;
  else if (status === REPUVE_TASK_STATUS.COMPLETED) summary = "La consulta REPUVE fue completada sin hallazgos de riesgo en la información capturada.";

  return {
    source: "REPUVE",
    status,
    title: "Consulta REPUVE",
    summary,
    coverage: calculateCoverage(normalizedEvidence),
    risk,
    confidence,
    findings,
    recommendations,
    data: { customerData, evidence: normalizedEvidence, comparisons, resultLabel },
  };
}

module.exports = {
  normalizeComparable,
  normalizeRepuveResult,
  buildRepuveSnapshot,
  normalizeRepuveEvidence,
  compareRepuveIdentity,
  buildRepuveFindings,
  buildRepuveRecommendations,
  calculateRepuveRisk,
  calculateRepuveConfidence,
  calculateCoverage,
  resolveTaskStatus,
  buildRepuvePreview,
};
