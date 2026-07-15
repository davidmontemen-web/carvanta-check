function calculatePreliminaryQuality(
  evidenceCount
) {
  if (evidenceCount >= 4) {
    return "Completo";
  }

  if (evidenceCount >= 2) {
    return "Parcial";
  }

  return "Inicial";
}

async function runReportEngine({
  transaction,
  investigation,
  evidences,
  findings,
}) {
  const quality =
    calculatePreliminaryQuality(
      evidences.length
    );

  const reportData = {
    quality,

    riskLevel: "No determinado",

    alerts: [],

    recommendation:
      "El expediente fue procesado correctamente por el pipeline técnico. Aún se requiere conectar extracción documental real y reglas de validación antes de emitir una recomendación vehicular.",

    summary:
      `Carvanta procesó ${evidences.length} evidencia(s) y generó ${findings.length} hallazgo(s) preliminar(es).`,
  };

  const report =
    await transaction.report.upsert({
      where: {
        checkId: investigation.checkId,
      },

      update: reportData,

      create: {
        checkId: investigation.checkId,
        ...reportData,
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