const { buildTasks } = require("./buildTasks");
const {
  buildCustomerSnapshot,
  compareVehicleIdentity,
  buildVehicleIdentityFindings,
  buildVehicleIdentityPreview,
} = require("../vehicle-base/vehicleBase.service");
const {
  buildRepuveSnapshot,
  buildRepuvePreview,
} = require("../repuve/repuve.service");

function getEvidenceData(evidence) {
  return evidence?.data &&
    typeof evidence.data === "object"
    ? evidence.data
    : null;
}

function buildLegacyRepuveEvidence(data = {}) {
  return {
    queryDate:
      data.query?.queriedAt || "",
    queriedVin:
      data.vehicle?.vin || "",
    queriedPlate:
      data.vehicle?.plate || "",
    result:
      data.analysis?.result ||
      data.result ||
      "OTHER",
    officialFolio:
      data.registration?.registrationFolio || "",
    observations:
      data.registration?.observations || "",
    evidenceReviewed: Boolean(
      data.capture?.capturedAt ||
      data.capture?.capturedBy
    ),
  };
}

function buildRepuveWorkspaceBlock({
  investigation,
  repuveEvidence,
  repuveArtifacts,
  repuveTask,
}) {
  const evidenceData =
    getEvidenceData(repuveEvidence);

  const storedPreview =
    evidenceData?.report?.preview ||
    evidenceData?.analysis?.preview ||
    evidenceData?.preview ||
    null;

  let preview = storedPreview;

  if (!preview && evidenceData) {
    const customerData =
      evidenceData?.analysis?.customerData ||
      buildRepuveSnapshot(investigation.check);

    const normalizedEvidence =
      evidenceData?.analysis?.evidence ||
      buildLegacyRepuveEvidence(evidenceData);

    preview = buildRepuvePreview({
      customerData,
      evidence: normalizedEvidence,
    });
  }

  const matchingArtifact =
    repuveEvidence?.artifactId
      ? repuveArtifacts.find(
          (artifact) =>
            artifact.id === repuveEvidence.artifactId
        ) || null
      : repuveArtifacts[0] || null;

  return {
    status:
      preview?.status ||
      repuveTask?.status ||
      "PENDING",
    evidence: repuveEvidence,
    preview,
    risk: preview?.risk || null,
    confidence: preview?.confidence || null,
    findings: Array.isArray(preview?.findings)
      ? preview.findings
      : [],
    recommendations: Array.isArray(
      preview?.recommendations
    )
      ? preview.recommendations
      : [],
    report:
      evidenceData?.stage === "REPORT"
        ? evidenceData
        : null,
    verdict:
      evidenceData?.verdict ||
      preview?.verdict ||
      null,
    trustIndex:
      evidenceData?.trustIndex ||
      preview?.trustIndex ||
      null,
    executiveSummary:
      evidenceData?.executiveSummary ||
      preview?.summary ||
      null,
    nextSteps: Array.isArray(
      evidenceData?.nextSteps || preview?.nextSteps
    )
      ? evidenceData?.nextSteps || preview?.nextSteps
      : [],
    artifact: matchingArtifact,
  };
}

function buildRapiWorkspaceBlock({
  rapiEvidence,
  rapiArtifacts,
  rapiTask,
}) {
  const evidenceData =
    getEvidenceData(rapiEvidence);

  const preview =
    evidenceData?.preview || null;

  const vinArtifacts =
    rapiArtifacts.filter(
      (artifact) =>
        artifact.type === "RAPI_VIN"
    );

  const plateArtifacts =
    rapiArtifacts.filter(
      (artifact) =>
        artifact.type === "RAPI_PLACA"
    );

  return {
    status:
      preview?.status ||
      rapiTask?.status ||
      "PENDING",

    evidence:
      rapiEvidence,

    preview,

    risk:
      preview?.risk ||
      evidenceData?.risk ||
      null,

    confidence:
      preview?.confidence ??
      evidenceData?.confidence ??
      null,

    coverage:
      preview?.coverage ??
      evidenceData?.coverage ??
      0,

    findings:
      Array.isArray(
        preview?.findings
      )
        ? preview.findings
        : [],

    recommendations:
      Array.isArray(
        preview?.recommendations
      )
        ? preview.recommendations
        : [],

    nextSteps:
      Array.isArray(
        preview?.nextSteps ||
        evidenceData?.nextSteps
      )
        ? preview?.nextSteps ||
          evidenceData?.nextSteps
        : [],

    verdict:
      preview?.verdict ||
      evidenceData?.verdict ||
      null,

    executiveSummary:
      preview?.summary ||
      evidenceData?.executiveSummary ||
      null,

    identifiersChecked:
      Array.isArray(
        preview?.identifiersChecked ||
        evidenceData?.identifiersChecked
      )
        ? preview?.identifiersChecked ||
          evidenceData?.identifiersChecked
        : [],

    report:
      evidenceData?.stage === "REPORT"
        ? evidenceData
        : null,

    artifacts: {
      vin: vinArtifacts,
      plates: plateArtifacts,
      all: rapiArtifacts,
    },
  };
}

function buildWorkspaceResponse(investigation) {
  const safeArtifacts = Array.isArray(
    investigation.artifacts
  )
    ? investigation.artifacts
    : [];

  const safeEvidences = Array.isArray(
    investigation.evidences
  )
    ? investigation.evidences
    : [];

  const safeFindings = Array.isArray(
    investigation.findings
  )
    ? investigation.findings
    : [];

  const safeFiscalDocuments = Array.isArray(
    investigation.fiscalDocuments
  )
    ? investigation.fiscalDocuments
    : [];

  const safeOwnershipTransfers = Array.isArray(
    investigation.ownershipTransfers
  )
    ? investigation.ownershipTransfers
    : [];

  const {
    tasks,
    vehicleBaseEvidence,
    repuveEvidence,
    artifactsByType,
  } = buildTasks({
    investigation,
    safeArtifacts,
    safeEvidences,
    safeFiscalDocuments,
  });

  const evidenceData =
    getEvidenceData(vehicleBaseEvidence);

  const customerData =
    evidenceData?.customerData ||
    buildCustomerSnapshot(investigation.check);

  const validatedData = evidenceData
    ? {
        vin: evidenceData.vin || "",
        plate: evidenceData.plate || "",
        brand: evidenceData.brand || "",
        model: evidenceData.model || "",
        year: evidenceData.year || "",
        version: evidenceData.version || "",
        state: evidenceData.state || "",
        owner: evidenceData.owner || "",
        notes: evidenceData.notes || "",
      }
    : null;

  let vehicleIdentityPreview =
    evidenceData?.preview || null;

  if (
    !vehicleIdentityPreview &&
    validatedData
  ) {
    const comparisons = compareVehicleIdentity(
      customerData,
      validatedData
    );

    const findings =
      buildVehicleIdentityFindings(comparisons);

    vehicleIdentityPreview =
      buildVehicleIdentityPreview({
        customerData,
        validatedData,
        comparisons,
        findings,
      });
  }

  const repuveTask =
    tasks.find((task) => task.key === "REPUVE") ||
    null;

  /*
   * Prioridad del Workspace:
   * Cerebro 4 > Cerebro 3 > evidencia legacy.
   */

  const rapiTask =
  tasks.find(
    (task) => task.key === "RAPI"
  ) || null;


  const repuveReportEvidence =
    safeEvidences.find(
      (evidence) =>
        evidence.type === "REPUVE_REPORT" &&
        evidence.extractionStatus === "COMPLETED"
    ) || null;

  const repuveAnalysisEvidence =
    safeEvidences.find(
      (evidence) =>
        evidence.type === "REPUVE_ANALYSIS" &&
        evidence.extractionStatus === "COMPLETED"
    ) || null;

  const workspaceRepuveEvidence =
    repuveReportEvidence ||
    repuveAnalysisEvidence ||
    repuveEvidence;

  const repuve =
    buildRepuveWorkspaceBlock({
      investigation,
      repuveEvidence: workspaceRepuveEvidence,
      repuveArtifacts:
        artifactsByType.REPUVE || [],
      repuveTask,
    });

  /*
 * Prioridad RAPI:
 * Cerebro 4 > Cerebro 3 > Cerebro 2.
 */
const rapiReportEvidence =
  safeEvidences.find(
    (evidence) =>
      evidence.type === "RAPI_REPORT" &&
      evidence.extractionStatus ===
        "COMPLETED"
  ) || null;

const rapiAnalysisEvidence =
  safeEvidences.find(
    (evidence) =>
      evidence.type === "RAPI_ANALYSIS" &&
      evidence.extractionStatus ===
        "COMPLETED"
  ) || null;

const rapiNormalizedEvidence =
  safeEvidences.find(
    (evidence) =>
      evidence.type ===
        "RAPI_NORMALIZED" &&
      evidence.extractionStatus ===
        "COMPLETED"
  ) || null;

const workspaceRapiEvidence =
  rapiReportEvidence ||
  rapiAnalysisEvidence ||
  rapiNormalizedEvidence;

const rapiArtifacts = [
  ...(artifactsByType.RAPI_VIN || []),
  ...(artifactsByType.RAPI_PLACA || []),
];

const rapi =
  buildRapiWorkspaceBlock({
    rapiEvidence:
      workspaceRapiEvidence,

    rapiArtifacts,
    rapiTask,
  });  

  const completedTasks = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  const progress = Math.round(
    (completedTasks / tasks.length) * 100
  );

  return {
    investigation: {
      id: investigation.id,
      status: investigation.status,
      startedAt: investigation.startedAt,
      completedAt: investigation.completedAt,
      executive: investigation.executive,
    },
    check: investigation.check,
    vehicleBase: validatedData,
    vehicleIdentityPreview,
    repuve,
    rapi,
    tasks,
    progress,
    summary: {
      artifactCount: safeArtifacts.length,
      evidenceCount: safeEvidences.length,
      findingCount: safeFindings.length,
      completedTasks,
      totalTasks: tasks.length,
      reportReady: Boolean(
        investigation.check.report
      ),
    },
    artifacts: safeArtifacts,
    evidences: safeEvidences,
    findings: safeFindings,
    fiscalDocuments: safeFiscalDocuments,
    ownershipTransfers: safeOwnershipTransfers,
    invoiceAnalysis:
      investigation.invoiceInvestigatorAnalysis,
    report: investigation.check.report,
  };
}

module.exports = {
  buildWorkspaceResponse,
  buildRepuveWorkspaceBlock,
  buildRapiWorkspaceBlock,
};