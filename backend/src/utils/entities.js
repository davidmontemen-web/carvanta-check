const { prisma } = require("../lib/prisma");

async function findCheckOrFail(checkId, options = {}) {
  const check = await prisma.check.findUnique({
    where: {
      id: checkId,
    },
    ...options,
  });

  if (!check) {
    const error = new Error("Expediente no encontrado");
    error.statusCode = 404;
    throw error;
  }

  return check;
}

async function findInvestigationOrFail(
  investigationId,
  options = {}
) {
  const investigation =
    await prisma.investigation.findUnique({
      where: {
        id: investigationId,
      },
      ...options,
    });

  if (!investigation) {
    const error = new Error(
      "Investigación no encontrada"
    );

    error.statusCode = 404;
    throw error;
  }

  return investigation;
}

function validateInvestigationOwnership(
  investigation,
  userId
) {
  if (investigation.executiveId !== userId) {
    const error = new Error(
      "No tienes acceso a esta investigación"
    );

    error.statusCode = 403;
    throw error;
  }
}

module.exports = {
  findCheckOrFail,
  findInvestigationOrFail,
  validateInvestigationOwnership,
};