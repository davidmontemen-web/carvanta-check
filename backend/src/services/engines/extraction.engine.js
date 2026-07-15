async function runExtractionEngine({
  transaction,
  investigation,
  artifacts,
}) {
  await transaction.evidence.deleteMany({
    where: {
      investigationId: investigation.id,
      source: "SIMULATED_EXTRACTION",
    },
  });

  const evidences = [];

  for (const artifact of artifacts) {
    await transaction.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        processingStatus: "PROCESSING",
        processingError: null,
      },
    });

    const evidence =
      await transaction.evidence.create({
        data: {
          checkId: investigation.checkId,
          investigationId: investigation.id,
          artifactId: artifact.id,

          source: "SIMULATED_EXTRACTION",

          type: `${artifact.type}_DOCUMENT`,

          data: {
            artifactId: artifact.id,
            artifactType: artifact.type,
            originalName: artifact.originalName,
            mimeType: artifact.mimeType,

            message:
              "Artifact recibido correctamente. La extracción real todavía no está conectada.",
          },

          extractionStatus: "COMPLETED",
          confidence: 1,
          extractor: "carvanta-mvp-simulator",
          extractedAt: new Date(),
        },
      });

    await transaction.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        processingStatus: "PROCESSED",
        processingError: null,
      },
    });

    evidences.push(evidence);
  }

  return evidences;
}

module.exports = {
  runExtractionEngine,
};