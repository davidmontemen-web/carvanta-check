const express = require("express");

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

function normalizeString(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];

    return (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    );
  });

  if (missing.length > 0) {
    const error = new Error(
      `Campos obligatorios: ${missing.join(", ")}`
    );

    error.statusCode = 400;
    throw error;
  }
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

function createInvestigationsRouter({
  artifactUpload,
  removeFileIfExists,
}) {
  /* ------------------------------------------------------------------------ */
  /* Consultar investigación                                                  */
  /* ------------------------------------------------------------------------ */

  router.get(
    "/investigations/:id",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const investigation =
        await findInvestigationOrFail(req.params.id, {
          include: {
            executive: {
              select: publicUserSelect,
            },

            check: {
              include: {
                documents: {
                  orderBy: {
                    createdAt: "asc",
                  },
                },

                review: true,
                report: true,
              },
            },

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
        });

      validateInvestigationOwnership(
        investigation,
        req.user.id
      );

      return res.json(investigation);
    })
  );

  /* ------------------------------------------------------------------------ */
  /* Cargar artifact                                                          */
  /* ------------------------------------------------------------------------ */

  router.post(
    "/investigations/:id/artifacts",
    authMiddleware,
    artifactUpload.single("file"),
    asyncHandler(async (req, res) => {
      try {
        const investigation =
          await findInvestigationOrFail(
            req.params.id,
            {
              include: {
                check: true,
              },
            }
          );

        validateInvestigationOwnership(
          investigation,
          req.user.id
        );

        if (
          investigation.status !== "IN_PROGRESS"
        ) {
          const error = new Error(
            "La investigación ya no acepta nuevos artifacts"
          );

          error.statusCode = 409;
          throw error;
        }

        if (!req.file) {
          const error = new Error(
            "Debes seleccionar un archivo"
          );

          error.statusCode = 400;
          throw error;
        }

        requireFields(req.body, ["type"]);

        const artifact =
          await prisma.artifact.create({
            data: {
              investigationId: investigation.id,

              source:
                normalizeString(req.body.source) ||
                "EXECUTIVE",

              type: normalizeString(req.body.type),

              originalName: req.file.originalname,
              storedName: req.file.filename,

              filePath:
                `/uploads/investigations/${req.file.filename}`,

              mimeType: req.file.mimetype,
              sizeBytes: req.file.size,

              uploadedById: req.user.id,

              processingStatus: "PENDING",
            },
          });

        return res.status(201).json(artifact);
      } catch (error) {
        if (req.file?.path) {
          removeFileIfExists(req.file.path);
        }

        throw error;
      }
    })
  );

  /* ------------------------------------------------------------------------ */
  /* Listar artifacts                                                         */
  /* ------------------------------------------------------------------------ */

  router.get(
    "/investigations/:id/artifacts",
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

      const artifacts =
        await prisma.artifact.findMany({
          where: {
            investigationId: investigation.id,
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json(artifacts);
    })
  );

  /* ------------------------------------------------------------------------ */
  /* Registrar evidencia estructurada                                         */
  /* ------------------------------------------------------------------------ */

  router.post(
    "/investigations/:id/evidences",
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

      if (
        investigation.status !== "IN_PROGRESS"
      ) {
        const error = new Error(
          "La investigación ya no acepta nuevas evidencias"
        );

        error.statusCode = 409;
        throw error;
      }

      requireFields(req.body, ["type"]);

      const evidence =
        await prisma.evidence.create({
          data: {
            investigationId: investigation.id,
            checkId: investigation.checkId,

            source:
              normalizeString(req.body.source) ||
              "EXECUTIVE",

            type: normalizeString(req.body.type),

            data:
              req.body.data &&
              typeof req.body.data === "object"
                ? req.body.data
                : {},

            createdById: req.user.id,
          },
        });

      return res.status(201).json(evidence);
    })
  );

  /* ------------------------------------------------------------------------ */
  /* Listar evidencias                                                        */
  /* ------------------------------------------------------------------------ */

  router.get(
    "/investigations/:id/evidences",
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

      const evidences =
        await prisma.evidence.findMany({
          where: {
            investigationId: investigation.id,
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json(evidences);
    })
  );

  /* ------------------------------------------------------------------------ */
  /* Registrar hallazgo                                                       */
  /* ------------------------------------------------------------------------ */

  router.post(
    "/investigations/:id/findings",
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

      if (
        investigation.status !== "IN_PROGRESS"
      ) {
        const error = new Error(
          "La investigación ya no acepta nuevos hallazgos"
        );

        error.statusCode = 409;
        throw error;
      }

      requireFields(req.body, [
        "type",
        "title",
        "description",
      ]);

      const finding =
        await prisma.finding.create({
          data: {
            investigationId: investigation.id,

            type: normalizeString(req.body.type),

            title: normalizeString(
              req.body.title
            ),

            description: normalizeString(
              req.body.description
            ),

            severity:
              normalizeString(
                req.body.severity
              ) || "INFO",

            status:
              normalizeString(req.body.status) ||
              "OPEN",
          },
        });

      return res.status(201).json(finding);
    })
  );

  /* ------------------------------------------------------------------------ */
  /* Listar hallazgos                                                         */
  /* ------------------------------------------------------------------------ */

  router.get(
    "/investigations/:id/findings",
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

      const findings =
        await prisma.finding.findMany({
          where: {
            investigationId: investigation.id,
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json(findings);
    })
  );

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

  return router;
}

module.exports = createInvestigationsRouter;