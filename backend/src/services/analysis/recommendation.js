function buildRecommendation(riskEvaluation) {
  if (riskEvaluation.riskLevel === "Bajo") {
    return "El expediente cuenta con elementos suficientes para avanzar a una revisión documental más completa.";
  }

  if (riskEvaluation.riskLevel === "Medio") {
    return "El expediente puede revisarse de forma inicial, pero recomendamos validar la documentación faltante u observada antes de continuar.";
  }

  return "No recomendamos avanzar con la compra hasta aclarar las alertas y completar la documentación del expediente.";
}

module.exports = buildRecommendation;