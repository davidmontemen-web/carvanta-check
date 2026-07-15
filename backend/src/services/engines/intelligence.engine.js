async function runIntelligenceEngine({
  transaction,
  investigation,
  evidences,
}) {
  await transaction.finding.deleteMany({
    where: {
      investigationId: investigation.id,

      type: {
        startsWith: "SIMULATED_",
      },
    },
  });

  const findings = [];

  for (const evidence of evidences) {
    const artifactType =
      evidence.data?.artifactType ||
      evidence.type;

    const finding =
      await transaction.finding.create({
        data: {
          investigationId: investigation.id,

          type: "SIMULATED_ARTIFACT_PROCESSED",

          severity: "INFO",
          status: "OPEN",

          title: `${artifactType} recibido`,

          description:
            "El documento fue almacenado y convertido en una evidencia estructurada preliminar.",

          data: {
            evidenceId: evidence.id,
            artifactId: evidence.artifactId,
            artifactType,
          },
        },
      });

    findings.push(finding);
  }

  const summaryFinding =
    await transaction.finding.create({
      data: {
        investigationId: investigation.id,

        type: "SIMULATED_COLLECTION_SUMMARY",

        severity: "INFO",
        status: "OPEN",

        title: "Resumen de evidencia disponible",

        description:
          `La investigación contiene ${evidences.length} evidencia(s) estructurada(s).`,

        data: {
          evidenceCount: evidences.length,

          evidenceTypes: evidences.map(
            (evidence) => evidence.type
          ),
        },
      },
    });

  findings.push(summaryFinding);

  return findings;
}

module.exports = {
  runIntelligenceEngine,
};