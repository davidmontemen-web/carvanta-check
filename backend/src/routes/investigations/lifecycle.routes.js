const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");
const { runInvestigationPipeline } = require("../../services/engines/pipeline");

function createRouter() {
  const router = express.Router();

/* ------------------------------------------------------------------------ */
/* Completar investigación                                                  */
/* ------------------------------------------------------------------------ */

router.patch(
  "/investigations/:id/complete",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigationId = req.params.id;
    const executiveId = req.user.id;

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const investigation =
            await transaction.investigation.findUnique({
              where: {
                id: investigationId,
              },

              include: {
                artifacts: true,
                evidences: true,
                findings: true,
                check: true,
              },
            });

          if (!investigation) {
            const error = new Error(
              "Investigación no encontrada"
            );

            error.statusCode = 404;
            throw error;
          }

          if (
            investigation.executiveId !==
            executiveId
          ) {
            const error = new Error(
              "No tienes acceso a esta investigación"
            );

            error.statusCode = 403;
            throw error;
          }

          if (
            investigation.status === "COMPLETED"
          ) {
            return {
              investigation,
              check: investigation.check,
              alreadyCompleted: true,
            };
          }

          if (
            investigation.artifacts.length === 0
          ) {
            const error = new Error(
              "Debes cargar al menos un artifact antes de completar la investigación"
            );

            error.statusCode = 409;
            throw error;
          }

          const updatedInvestigation =
            await transaction.investigation.update({
              where: {
                id: investigation.id,
              },

              data: {
                status: "COMPLETED",
                completedAt: new Date(),
              },
            });

          const updatedCheck =
            await transaction.check.update({
              where: {
                id: investigation.checkId,
              },

              data: {
                status:
                  "INVESTIGACION_COMPLETA",
              },
            });

          return {
            investigation:
              updatedInvestigation,

            check: updatedCheck,

            alreadyCompleted: false,
          };
        }
      );

    return res.json(result);
  })
);

/* -------------------------------------------------------------------------- */
/* Ejecutar pipeline de investigación                                         */
/* -------------------------------------------------------------------------- */

router.post(
"/investigations/:id/process",
authMiddleware,
asyncHandler(async (req, res) => {
  const investigation =
    await findInvestigationOrFail(
      req.params.id
    );

  validateInvestigationOwnership(
    investigation,
    req.user.id
  );

  const result =
    await runInvestigationPipeline(
      investigation.id
    );

  return res.json(result);
})
);

  return router;
}

module.exports = createRouter;
