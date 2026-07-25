const SEVERITY_PENALTY = {
  CRITICAL: 12,
  HIGH: 6,
  MEDIUM: 2,
  LOW: 0,
};

const CODE_PENALTIES = {
  THEFT_REPORT: 45,
  VIN_MISMATCH: 25,
  VIN_MISSING: 25,
  RECOVERED_VEHICLE: 20,
  DOCUMENT_NOT_RECOGNIZED: 15,
  PLATE_MISMATCH: 10,
  NOT_FOUND: 10,
  UNCLASSIFIED_RESULT: 10,
  OFFICIAL_RESULT_UNKNOWN: 10,
  VIN_LENGTH_INVALID: 10,
  QUERY_DATE_MISSING: 5,
  PLATE_MISSING: 5,
};

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function gradeScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

function calculateCoveragePenalty(coverage) {
  const value = clamp(coverage, 0, 100);
  if (value >= 90) return 0;
  if (value >= 80) return 5;
  if (value >= 60) return 10;
  return 15;
}

function calculateConfidencePenalty(confidence) {
  const value = clamp(confidence, 0, 1);
  if (value >= 0.9) return 0;
  if (value >= 0.75) return 3;
  if (value >= 0.6) return 6;
  return 10;
}

function calculateTrustIndex(analysis = {}) {
  const findings = Array.isArray(analysis.findings)
    ? analysis.findings
    : [];
  const deductions = [];
  const seenCodes = new Set();

  for (const finding of findings) {
    const code = String(finding?.code || "").trim();
    if (!code || seenCodes.has(code)) continue;
    seenCodes.add(code);

    const points = CODE_PENALTIES[code] ??
      SEVERITY_PENALTY[finding?.severity] ?? 0;

    if (points > 0) {
      deductions.push({
        code,
        points,
        reason: finding?.title || code,
      });
    }
  }

  const coveragePenalty = calculateCoveragePenalty(
    analysis.coverage
  );
  if (coveragePenalty > 0) {
    deductions.push({
      code: "INSUFFICIENT_COVERAGE",
      points: coveragePenalty,
      reason: `Cobertura de información: ${clamp(
        analysis.coverage,
        0,
        100
      )}%`,
    });
  }

  const confidencePenalty = calculateConfidencePenalty(
    analysis.confidence
  );
  if (confidencePenalty > 0) {
    deductions.push({
      code: "LIMITED_CONFIDENCE",
      points: confidencePenalty,
      reason: "La confianza del análisis es limitada.",
    });
  }

  const totalDeduction = deductions.reduce(
    (sum, item) => sum + item.points,
    0
  );
  const score = clamp(100 - totalDeduction, 0, 100);

  return {
    score,
    grade: gradeScore(score),
    maximumScore: 100,
    totalDeduction,
    deductions,
    methodology: "carvanta-repuve-trust-index-v1",
  };
}

module.exports = {
  CODE_PENALTIES,
  calculateTrustIndex,
  gradeScore,
};
