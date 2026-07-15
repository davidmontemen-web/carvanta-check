async function runCollectionEngine({
  transaction,
  investigationId,
}) {
  const investigation =
    await transaction.investigation.findUnique({
      where: {
        id: investigationId,
      },

      include: {
        check: true,

        artifacts: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  if (!investigation) {
    const error = new Error(
      "Investigación no encontrada"
    );

    error.statusCode = 404;
    throw error;
  }

  if (investigation.artifacts.length === 0) {
    const error = new Error(
      "La investigación no contiene artifacts para procesar"
    );

    error.statusCode = 409;
    throw error;
  }

  return {
    investigation,
    artifacts: investigation.artifacts,
  };
}

module.exports = {
  runCollectionEngine,
};