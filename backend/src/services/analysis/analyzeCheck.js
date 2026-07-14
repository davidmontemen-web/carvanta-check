const evaluateDocuments = require("./documentRules");
const evaluateRisk = require("./riskRules");
const buildRecommendation = require("./recommendation");
const buildReport = require("./reportBuilder");

function analyzeCheck(check) {
  const documentEvaluation = evaluateDocuments(check);
  const riskEvaluation = evaluateRisk(check, documentEvaluation);
  const recommendation = buildRecommendation(riskEvaluation);

  return buildReport(check, documentEvaluation, riskEvaluation, recommendation);
}

module.exports = analyzeCheck;