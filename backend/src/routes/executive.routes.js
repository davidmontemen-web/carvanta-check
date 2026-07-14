const express = require("express");
const { Prisma } = require("@prisma/client");

const { prisma } = require("../lib/prisma");
const {
  authMiddleware,
} = require("../middleware/auth");

const router = express.Router();

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard ejecutivo                                                        */
/* -------------------------------------------------------------------------- */

router.get(
  "/executive/checks",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const checks = await prisma.check.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        documents: true,

        assignedTo: {
          select: publicUserSelect,
        },

        report: true,
        investigation: true,
      },
    });

    return res.json(checks);
  })
);

/* -------------------------------------------------------------------------- */
/* Ejecutivo: tomar expediente                                                */
/* -------------------------------------------------------------------------- */

router.patch(
  "/executive/checks/:id/assign",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const checkId = req.params.id;
    const executiveId = req.user.id;

    const result = await prisma.$transaction(
      async (transaction) => {
        const existingCheck =
          await transaction.check.findUnique({
            where: {
              id: checkId,
            },

            include: {
              investigation: true,
            },
          });

        if (!existingCheck) {
          const error = new Error(
            "Expediente no encontrado"
          );

          error.statusCode = 404;
          throw error;
        }

        if (
          existingCheck.assignedToId &&
          existingCheck.assignedToId !== executiveId
        ) {
          const error = new Error(
            "El expediente ya está asignado a otro ejecutivo"
          );

          error.statusCode = 409;
          throw error;
        }

        if (
          existingCheck.assignedToId === executiveId
        ) {
          return {
            check: existingCheck,
            investigation:
              existingCheck.investigation,
            alreadyAssigned: true,
          };
        }

        const updatedCount =
          await transaction.check.updateMany({
            where: {
              id: checkId,
              assignedToId: null,
            },

            data: {
              assignedToId: executiveId,
              status: "EN_INVESTIGACION",
            },
          });

        if (updatedCount.count === 0) {
          const error = new Error(
            "El expediente fue tomado por otro ejecutivo"
          );

          error.statusCode = 409;
          throw error;
        }

        const updatedCheck =
          await transaction.check.findUnique({
            where: {
              id: checkId,
            },

            include: {
              documents: true,

              assignedTo: {
                select: publicUserSelect,
              },

              investigation: true,
            },
          });

        let investigation =
          updatedCheck.investigation;

        if (!investigation) {
          investigation =
            await transaction.investigation.create({
              data: {
                checkId,
                executiveId,
                status: "IN_PROGRESS",
              },
            });
        }

        return {
          check: updatedCheck,
          investigation,
          alreadyAssigned: false,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,
      }
    );

    return res.json(result);
  })
);

/* -------------------------------------------------------------------------- */
/* Ejecutivo: iniciar investigación                                           */
/* -------------------------------------------------------------------------- */

router.post(
  "/executive/checks/:id/investigation/start",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const checkId = req.params.id;
    const executiveId = req.user.id;

    const investigation =
      await prisma.$transaction(
        async (transaction) => {
          const check =
            await transaction.check.findUnique({
              where: {
                id: checkId,
              },

              include: {
                investigation: true,
              },
            });

          if (!check) {
            const error = new Error(
              "Expediente no encontrado"
            );

            error.statusCode = 404;
            throw error;
          }

          if (!check.assignedToId) {
            const error = new Error(
              "Primero debes tomar el expediente"
            );

            error.statusCode = 409;
            throw error;
          }

          if (
            check.assignedToId !== executiveId
          ) {
            const error = new Error(
              "Este expediente está asignado a otro ejecutivo"
            );

            error.statusCode = 403;
            throw error;
          }

          if (check.investigation) {
            if (
              check.investigation.executiveId !==
              executiveId
            ) {
              const error = new Error(
                "La investigación pertenece a otro ejecutivo"
              );

              error.statusCode = 403;
              throw error;
            }

            if (
              check.investigation.status ===
              "IN_PROGRESS"
            ) {
              return check.investigation;
            }

            return transaction.investigation.update({
              where: {
                id: check.investigation.id,
              },

              data: {
                status: "IN_PROGRESS",
              },
            });
          }

          const createdInvestigation =
            await transaction.investigation.create({
              data: {
                checkId,
                executiveId,
                status: "IN_PROGRESS",
              },
            });

          await transaction.check.update({
            where: {
              id: checkId,
            },

            data: {
              status: "EN_INVESTIGACION",
            },
          });

          return createdInvestigation;
        }
      );

    return res
      .status(201)
      .json(investigation);
  })
);

/* -------------------------------------------------------------------------- */
/* Ejecutivo: consultar únicamente sus expedientes                            */
/* -------------------------------------------------------------------------- */

router.get(
  "/executive/my-checks",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const checks = await prisma.check.findMany({
      where: {
        assignedToId: req.user.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        documents: {
          orderBy: {
            createdAt: "asc",
          },
        },

        assignedTo: {
          select: publicUserSelect,
        },

        investigation: {
          include: {
            artifacts: {
              orderBy: {
                createdAt: "desc",
              },
            },

            evidences: {
              orderBy: {
                createdAt: "desc",
              },
            },

            findings: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },

        report: true,
      },
    });

    return res.json(checks);
  })
);

/* -------------------------------------------------------------------------- */
/* Ejecutivo: expedientes disponibles                                         */
/* -------------------------------------------------------------------------- */

router.get(
  "/executive/available-checks",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const checks = await prisma.check.findMany({
      where: {
        assignedToId: null,

        status: {
          in: [
            "pagado",
            "PAGADO",
            "registro_completo",
          ],
        },
      },

      orderBy: {
        createdAt: "asc",
      },

      include: {
        documents: {
          orderBy: {
            createdAt: "asc",
          },
        },

        report: true,
        investigation: true,
      },
    });

    return res.json(checks);
  })
);

module.exports = router;