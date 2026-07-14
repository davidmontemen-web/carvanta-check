function buildReport(check, documentEvaluation, riskEvaluation, recommendation) {
  const totalAlerts = [
    ...documentEvaluation.documentAlerts,
    ...riskEvaluation.riskAlerts,
  ];

  let quality = "Básico";

  if (riskEvaluation.totalScore >= 6 && totalAlerts.length === 0) {
    quality = "Completo";
  } else if (riskEvaluation.totalScore >= 4) {
    quality = "Parcial";
  }

  const summary = `Se analizó el expediente de un ${check.marca} ${check.modelo} ${check.anio}. El expediente fue clasificado como ${quality} con nivel de riesgo ${riskEvaluation.riskLevel}.`;

  return {
    quality,
    riskLevel: riskEvaluation.riskLevel,
    alerts: totalAlerts,
    recommendation,
    summary,
  };
}

module.exports = buildReport;