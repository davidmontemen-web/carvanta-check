const { buildTasks } = require("./buildTasks");

function buildWorkspaceResponse(investigation) {
  const safeArtifacts = Array.isArray(investigation.artifacts) ? investigation.artifacts : [];
  const safeEvidences = Array.isArray(investigation.evidences) ? investigation.evidences : [];
  const safeFindings = Array.isArray(investigation.findings) ? investigation.findings : [];
  const safeFiscalDocuments = Array.isArray(investigation.fiscalDocuments) ? investigation.fiscalDocuments : [];
  const safeOwnershipTransfers = Array.isArray(investigation.ownershipTransfers) ? investigation.ownershipTransfers : [];

  const { tasks, vehicleBaseEvidence } = buildTasks({
    investigation,
    safeArtifacts,
    safeEvidences,
    safeFiscalDocuments,
  });

  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  return {
    investigation: {
      id: investigation.id,
      status: investigation.status,
      startedAt: investigation.startedAt,
      completedAt: investigation.completedAt,
      executive: investigation.executive,
    },
    check: investigation.check,
    vehicleBase: vehicleBaseEvidence?.data || null,
    tasks,
    progress,
    summary: {
      artifactCount: safeArtifacts.length,
      evidenceCount: safeEvidences.length,
      findingCount: safeFindings.length,
      completedTasks,
      totalTasks: tasks.length,
      reportReady: Boolean(investigation.check.report),
    },
    artifacts: safeArtifacts,
    evidences: safeEvidences,
    findings: safeFindings,
    fiscalDocuments: safeFiscalDocuments,
    ownershipTransfers: safeOwnershipTransfers,
    invoiceAnalysis: investigation.invoiceInvestigatorAnalysis,
    report: investigation.check.report,
  };
}

module.exports = { buildWorkspaceResponse };
