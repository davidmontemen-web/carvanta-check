function evaluateRisk(check, documentEvaluation) {
  const review = check.review;
  const alerts = [];

  if (review?.repuveStatus === "alerta") {
    alerts.push("El ejecutivo marcó una alerta en REPUVE.");
  }

  if (review?.invoiceStatus === "observacion") {
    alerts.push("El ejecutivo registró observaciones en la factura.");
  }

  if (review?.circulationStatus === "observacion") {
    alerts.push("El ejecutivo registró observaciones en la tarjeta de circulación.");
  }

  const positiveSignals = [
    review?.repuveStatus === "sin_alerta",
    review?.invoiceStatus === "sin_observaciones",
    review?.circulationStatus === "sin_observaciones",
  ].filter(Boolean).length;

  const totalScore = documentEvaluation.documentScore + positiveSignals;
  const totalAlerts = documentEvaluation.documentAlerts.length + alerts.length;

  let riskLevel = "Medio";

  if (totalScore >= 6 && totalAlerts === 0) {
    riskLevel = "Bajo";
  } else if (totalAlerts >= 3 || totalScore <= 2) {
    riskLevel = "Alto";
  }

  return {
    riskLevel,
    riskAlerts: alerts,
    positiveSignals,
    totalScore,
    totalAlerts,
  };
}

module.exports = evaluateRisk;