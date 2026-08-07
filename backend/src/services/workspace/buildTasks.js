function getTaskStatus({
  artifacts = [],
  evidences = [],
  evidenceType,
}) {
  const safeArtifacts = Array.isArray(artifacts)
    ? artifacts
    : [];
  const safeEvidences = Array.isArray(evidences)
    ? evidences
    : [];

  if (
    safeEvidences.some(
      (evidence) => evidence.type === evidenceType
    )
  ) {
    return "COMPLETED";
  }

  if (
    safeArtifacts.some(
      (artifact) =>
        artifact.processingStatus === "FAILED"
    )
  ) {
    return "NEEDS_REVIEW";
  }

  if (
    safeArtifacts.some((artifact) =>
      ["PROCESSING", "PENDING"].includes(
        artifact.processingStatus
      )
    )
  ) {
    return "IN_PROGRESS";
  }

  return "PENDING";
}

function getRepuveTaskStatus({
  artifacts = [],
  evidence = null,
}) {
  const preview =
    evidence?.data?.analysis?.preview ||
    evidence?.data?.preview ||
    null;

  if (
    preview?.status &&
    [
      "PENDING",
      "IN_PROGRESS",
      "NEEDS_REVIEW",
      "COMPLETED",
    ].includes(preview.status)
  ) {
    return preview.status;
  }

  if (evidence) {
    return "COMPLETED";
  }

  return getTaskStatus({
    artifacts,
    evidences: [],
    evidenceType: "REPUVE_REPORT",
  });
}

function getRapiTaskStatus({
  artifacts = [],
  evidence = null,
}) {
  const safeArtifacts = Array.isArray(artifacts)
    ? artifacts
    : [];

  if (
    safeArtifacts.some(
      (artifact) =>
        artifact.processingStatus === "FAILED"
    )
  ) {
    return "NEEDS_REVIEW";
  }

  if (
    safeArtifacts.some((artifact) =>
      ["PENDING", "PROCESSING"].includes(
        artifact.processingStatus
      )
    )
  ) {
    return "IN_PROGRESS";
  }

  const preview =
    evidence?.data?.preview || null;

  if (
    preview?.status &&
    [
      "PENDING",
      "IN_PROGRESS",
      "NEEDS_REVIEW",
      "COMPLETED",
    ].includes(preview.status)
  ) {
    return preview.status;
  }

  return evidence
    ? "COMPLETED"
    : "PENDING";
}

function buildTasks({
  investigation,
  safeArtifacts,
  safeEvidences,
  safeFiscalDocuments,
}) {
  const vehicleBaseEvidence =
    safeEvidences.find(
      (evidence) =>
        evidence.type === "VEHICLE_BASE_VALIDATED"
    ) || null;

    const repuveEvidence =
    safeEvidences.find(
      (evidence) =>
        evidence.type ===
          "REPUVE_REPORT" &&
        evidence.extractionStatus ===
          "COMPLETED"
    ) ||
    safeEvidences.find(
      (evidence) =>
        evidence.type ===
          "REPUVE_ANALYSIS" &&
        evidence.extractionStatus ===
          "COMPLETED"
    ) ||
    null;

    const rapiEvidence =
  safeEvidences.find(
    (evidence) =>
      evidence.type ===
        "RAPI_REPORT" &&
      evidence.extractionStatus ===
        "COMPLETED"
  ) ||
  safeEvidences.find(
    (evidence) =>
      evidence.type ===
        "RAPI_ANALYSIS" &&
      evidence.extractionStatus ===
        "COMPLETED"
  ) ||
  null;

  const vehiclePreview =
    vehicleBaseEvidence?.data?.preview || null;

  const artifactsByType = safeArtifacts.reduce(
    (result, artifact) => {
      if (!result[artifact.type]) {
        result[artifact.type] = [];
      }

      result[artifact.type].push(artifact);
      return result;
    },
    {}
  );

  const repuveArtifacts =
    artifactsByType.REPUVE || [];

    const rapiVinArtifacts =
  artifactsByType.RAPI_VIN || [];

const rapiPlateArtifacts =
  artifactsByType.RAPI_PLACA || [];

const rapiArtifacts = [
  ...rapiVinArtifacts,
  ...rapiPlateArtifacts,
];

  const tasks = [
    {
      key: "VEHICLE_VALIDATION",
      label: "Validar identidad",
      status: vehicleBaseEvidence
        ? vehiclePreview?.status || "COMPLETED"
        : "PENDING",
    },
    {
      key: "REPUVE",
      label: "Consultar REPUVE",
      status: getRepuveTaskStatus({
        artifacts: repuveArtifacts,
        evidence: repuveEvidence,
      }),
    },
    {
      key: "SAT_FACTURA",
      label: "Factura y cadena documental",
      status:
        investigation.invoiceInvestigatorAnalysis &&
        safeFiscalDocuments.length > 0
          ? "COMPLETED"
          : safeFiscalDocuments.length > 0 ||
              (artifactsByType.SAT_FACTURA || [])
                .length > 0
            ? "IN_PROGRESS"
            : "PENDING",
    },
    {
      key: "ADEUDOS",
      label: "Consultar adeudos",
      status: getTaskStatus({
        artifacts: artifactsByType.ADEUDOS || [],
        evidences: safeEvidences,
        evidenceType: "ADEUDOS_RESULT",
      }),
    },
    {
      key: "MULTAS",
      label: "Consultar multas",
      status: getTaskStatus({
        artifacts: artifactsByType.MULTAS || [],
        evidences: safeEvidences,
        evidenceType: "MULTAS_RESULT",
      }),
    },
    {
  key: "RAPI",
  label: "Consultar RAPI",
  status: getRapiTaskStatus({
  artifacts: rapiArtifacts,
  evidence: rapiEvidence,
}),
  artifactTypes: {
    vin: "RAPI_VIN",
    plate: "RAPI_PLACA",
  },
  artifactCounts: {
    vin: rapiVinArtifacts.length,
    plate: rapiPlateArtifacts.length,
  },
},
    {
      key: "TRANSUNION",
      label: "Consultar TransUnion",
      status: getTaskStatus({
        artifacts:
          artifactsByType.TRANSUNION || [],
        evidences: safeEvidences,
        evidenceType: "TRANSUNION_RESULT",
      }),
    },
    {
      key: "REPORT",
      label: "Generar reporte",
      status: investigation.check.report
        ? "COMPLETED"
        : "PENDING",
    },
  ];

  return {
    tasks,
    vehicleBaseEvidence,
    repuveEvidence,
    artifactsByType,
  };
}

module.exports = {
  buildTasks,
  getTaskStatus,
  getRepuveTaskStatus,
  getRapiTaskStatus,
};
