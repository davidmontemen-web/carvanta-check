function getFindingImpact(finding) {
  const impact =
    finding.data?.scoreImpact;

  return Number.isFinite(impact)
    ? impact
    : 0;
}

function calculateScore(findings) {
  const deductions = findings
    .map(getFindingImpact)
    .filter((impact) => impact < 0);

  const score = deductions.reduce(
    (currentScore, deduction) =>
      currentScore + deduction,
    100
  );

  return Math.max(0, Math.min(100, score));
}

function getRiskLevel(score, findings) {
  const hasCriticalAlert = findings.some(
    (finding) =>
      finding.severity === "CRITICAL" &&
      finding.status !== "RESOLVED"
  );

  if (hasCriticalAlert || score < 50) {
    return "CRITICO";
  }

  if (score < 70) {
    return "ALTO";
  }

  if (score < 85) {
    return "MODERADO";
  }

  return "BAJO";
}

function getQuality({
  vehicleBaseEvidence,
  repuveReport,
}) {
  if (
    vehicleBaseEvidence &&
    repuveReport
  ) {
    return "REPUVE_VALIDADO";
  }

  return "INCOMPLETO";
}

async function runReportEngine({
  transaction,
  investigation,
  evidences,
  findings,
}) {
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

  const score = calculateScore(findings);

  const riskLevel = getRiskLevel(
    score,
    findings
  );

  const activeAlerts = findings.filter(
    (finding) =>
      finding.severity !== "INFO" &&
      finding.status !== "RESOLVED"
  );

  const positiveFindings = findings.filter(
    (finding) =>
      finding.severity === "INFO"
  );

  const recommendation =
    riskLevel === "CRITICO"
      ? "No se recomienda continuar con la operación hasta aclarar las alertas críticas detectadas."
      : riskLevel === "ALTO"
        ? "Se recomienda detener la operación y validar las inconsistencias antes de realizar cualquier pago."
        : riskLevel === "MODERADO"
          ? "La operación requiere validaciones adicionales antes de tomar una decisión."
          : "La consulta REPUVE no presenta alertas críticas y los datos principales coinciden. Continúa con las demás validaciones documentales antes de comprar.";

  const reportData = {
    score,

    sources: {
      vehicleBase: Boolean(
        vehicleBaseEvidence
      ),

      repuve: Boolean(repuveReport),
    },

    positiveFindings:
      positiveFindings.map(
        (finding) => ({
          type: finding.type,
          title: finding.title,
          description:
            finding.description,
        })
      ),

    alerts: activeAlerts.map(
      (finding) => ({
        type: finding.type,
        severity: finding.severity,
        title: finding.title,
        description:
          finding.description,
        scoreImpact:
          finding.data?.scoreImpact || 0,
      })
    ),
  };

  const summary =
    `Score preliminar Carvanta: ${score}/100. ` +
    `Nivel de riesgo: ${riskLevel}. ` +
    `REPUVE generó ${positiveFindings.length} coincidencia(s) o resultado(s) favorable(s) y ${activeAlerts.length} alerta(s).`;

  const report =
    await transaction.report.upsert({
      where: {
        checkId: investigation.checkId,
      },

      update: {
        quality: getQuality({
          vehicleBaseEvidence,
          repuveReport,
        }),

        riskLevel,

        alerts: reportData,

        recommendation,
        summary,
      },

      create: {
        checkId: investigation.checkId,

        quality: getQuality({
          vehicleBaseEvidence,
          repuveReport,
        }),

        riskLevel,

        alerts: reportData,

        recommendation,
        summary,
      },
    });

  await transaction.check.update({
    where: {
      id: investigation.checkId,
    },

    data: {
      status: "reporte_generado",
    },
  });

  return report;
}

module.exports = {
  runReportEngine,
};
