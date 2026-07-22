async function runExtractionEngine({
  transaction,
  investigation,
  artifacts,
}) {
  /*
   * Eliminamos únicamente evidencias antiguas generadas
   * por el simulador.
   */
  await transaction.evidence.deleteMany({
    where: {
      investigationId: investigation.id,
      source: "SIMULATED_EXTRACTION",
    },
  });

  const evidences = [];

  /*
   * Cuando existen varios artifacts de una misma fuente,
   * usamos solamente el más reciente.
   */
  const latestArtifactByType = new Map();

  for (const artifact of artifacts) {
    const current =
      latestArtifactByType.get(artifact.type);

    if (
      !current ||
      new Date(artifact.createdAt) >
        new Date(current.createdAt)
    ) {
      latestArtifactByType.set(
        artifact.type,
        artifact
      );
    }
  }

  const activeArtifacts = Array.from(
    latestArtifactByType.values()
  );

  for (const artifact of activeArtifacts) {
    await transaction.artifact.update({
      where: {
        id: artifact.id,
      },

      data: {
        processingStatus: "PROCESSING",
        processingError: null,
      },
    });

    try {
      if (artifact.type === "REPUVE") {
        const existingRepuveEvidence =
          await transaction.evidence.findFirst({
            where: {
              investigationId:
                investigation.id,

              artifactId: artifact.id,

              type: "REPUVE_RESULT",

              extractionStatus:
                "COMPLETED",
            },

            orderBy: {
              updatedAt: "desc",
            },
          });

        if (!existingRepuveEvidence) {
          const error = new Error(
            `El artifact REPUVE ${artifact.id} aún no tiene un resultado estructurado confirmado por el ejecutivo`
          );

          error.statusCode = 409;
          throw error;
        }

        await transaction.artifact.update({
          where: {
            id: artifact.id,
          },

          data: {
            processingStatus: "PROCESSED",
            processingError: null,
          },
        });

        evidences.push(
          existingRepuveEvidence
        );

        continue;
      }

      /*
       * Las demás fuentes siguen temporalmente
       * con evidencia simulada.
       */
      const evidence =
        await transaction.evidence.create({
          data: {
            checkId:
              investigation.checkId,

            investigationId:
              investigation.id,

            artifactId:
              artifact.id,

            source:
              "SIMULATED_EXTRACTION",

            type:
              `${artifact.type}_DOCUMENT`,

            data: {
              artifactId:
                artifact.id,

              artifactType:
                artifact.type,

              originalName:
                artifact.originalName,

              mimeType:
                artifact.mimeType,

              message:
                "Artifact recibido correctamente. La captura estructurada real de esta fuente todavía no está implementada.",
            },

            extractionStatus:
              "COMPLETED",

            confidence: 1,

            extractor:
              "carvanta-mvp-simulator",

            extractedAt:
              new Date(),
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
    } catch (error) {
      await transaction.artifact.update({
        where: {
          id: artifact.id,
        },

        data: {
          processingStatus: "FAILED",
          processingError: error.message,
        },
      });

      throw error;
    }
  }

  return evidences;
}

module.exports = {
  runExtractionEngine,
};