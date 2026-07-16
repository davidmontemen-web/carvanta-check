const express = require("express");

const { prisma } = require("../lib/prisma");
const {
  authMiddleware,
} = require("../middleware/auth");

const {
  asyncHandler,
  normalizeString,
  requireFields,
} = require("../utils/http");

const {
  findInvestigationOrFail,
  validateInvestigationOwnership,
} = require("../utils/entities");

const {
  runInvestigationPipeline,
} = require("../services/engines/pipeline");

const router = express.Router();

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

function getTaskStatus({
  artifacts,
  evidences,
  evidenceType,
}) {
  const hasEvidence = evidences.some(
    (evidence) =>
      evidence.type === evidenceType
  );

  if (hasEvidence) {
    return "COMPLETED";
  }

  const hasFailedArtifact = artifacts.some(
    (artifact) =>
      artifact.processingStatus === "FAILED"
  );

  if (hasFailedArtifact) {
    return "NEEDS_REVIEW";
  }

  const hasProcessingArtifact = artifacts.some(
    (artifact) =>
      artifact.processingStatus ===
        "PROCESSING" ||
      artifact.processingStatus ===
        "PENDING"
  );

  if (hasProcessingArtifact) {
    return "IN_PROGRESS";
  }

  return "PENDING";
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

/* -------------------------------------------------------------------------- */
/* Validar identidad base del vehículo                                        */
/* -------------------------------------------------------------------------- */

router.post(
  "/investigations/:id/vehicle-base",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation =
      await findInvestigationOrFail(req.params.id, {
        include: {
          check: true,
        },
      });

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    if (
      investigation.status !== "IN_PROGRESS"
    ) {
      const error = new Error(
        "La investigación ya no acepta validaciones"
      );

      error.statusCode = 409;
      throw error;
    }

    requireFields(req.body, [
      "vin",
      "plate",
      "brand",
      "model",
      "year",
    ]);

    const data = {
      vin: normalizeString(req.body.vin),
      plate: normalizeString(req.body.plate),
      brand: normalizeString(req.body.brand),
      model: normalizeString(req.body.model),
      year: normalizeString(req.body.year),
      version: normalizeString(req.body.version),
      state: normalizeString(req.body.state),
      owner: normalizeString(req.body.owner),
      notes: normalizeString(req.body.notes),

      validatedAgainst: "TARJETA_CIRCULACION",
      validatedBy: req.user.id,
      validatedAt: new Date().toISOString(),
    };

    const existingEvidence =
      await prisma.evidence.findFirst({
        where: {
          investigationId: investigation.id,
          type: "VEHICLE_BASE_VALIDATED",
        },
      });

    const evidence = existingEvidence
      ? await prisma.evidence.update({
          where: {
            id: existingEvidence.id,
          },

          data: {
            data,
            source: "EXECUTIVE_VALIDATION",
            extractionStatus: "COMPLETED",
            confidence: 1,
            extractor: "manual-executive-validation",
            extractedAt: new Date(),
            createdById: req.user.id,
          },
        })
      : await prisma.evidence.create({
          data: {
            checkId: investigation.checkId,
            investigationId: investigation.id,

            source: "EXECUTIVE_VALIDATION",
            type: "VEHICLE_BASE_VALIDATED",
            data,

            extractionStatus: "COMPLETED",
            confidence: 1,
            extractor: "manual-executive-validation",
            extractedAt: new Date(),
            createdById: req.user.id,
          },
        });

    await prisma.check.update({
      where: {
        id: investigation.checkId,
      },

      data: {
        vin: data.vin,
        placas: data.plate,
        marca: data.brand,
        modelo: data.model,
        anio: data.year,
        version: data.version,
      },
    });

    return res.json(evidence);
  })
);

/* -------------------------------------------------------------------------- */
/* Workspace completo de investigación                                        */
/* -------------------------------------------------------------------------- */

router.get(
  "/investigations/:id/workspace",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation =
      await findInvestigationOrFail(req.params.id, {
        include: {
          executive: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },

          check: {
            include: {
              documents: {
                orderBy: {
                  createdAt: "asc",
                },
              },

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

    const vehicleBaseEvidence =
      investigation.evidences.find(
        (evidence) =>
          evidence.type ===
          "VEHICLE_BASE_VALIDATED"
      ) || null;

    const artifactsByType =
      investigation.artifacts.reduce(
        (result, artifact) => {
          if (!result[artifact.type]) {
            result[artifact.type] = [];
          }

          result[artifact.type].push(artifact);

          return result;
        },
        {}
      );

    const tasks = [
      {
        key: "VEHICLE_VALIDATION",
        label: "Validar identidad",
        status: vehicleBaseEvidence
          ? "COMPLETED"
          : "PENDING",
      },

      {
        key: "REPUVE",
        label: "Consultar REPUVE",
        status: getTaskStatus({
          artifacts:
            artifactsByType.REPUVE || [],
          evidences:
            investigation.evidences,
          evidenceType: "REPUVE_RESULT",
        }),
      },

      {
        key: "SAT_FACTURA",
        label: "Validar factura SAT",
        status: getTaskStatus({
          artifacts:
            artifactsByType.SAT_FACTURA || [],
          evidences:
            investigation.evidences,
          evidenceType: "SAT_FACTURA_RESULT",
        }),
      },

      {
        key: "ADEUDOS",
        label: "Consultar adeudos",
        status: getTaskStatus({
          artifacts:
            artifactsByType.ADEUDOS || [],
          evidences:
            investigation.evidences,
          evidenceType: "ADEUDOS_RESULT",
        }),
      },

      {
        key: "MULTAS",
        label: "Consultar multas",
        status: getTaskStatus({
          artifacts:
            artifactsByType.MULTAS || [],
          evidences:
            investigation.evidences,
          evidenceType: "MULTAS_RESULT",
        }),
      },

      {
        key: "RAPI",
        label: "Consultar RAPI",
        status: getTaskStatus({
          artifacts:
            artifactsByType.RAPI || [],
          evidences:
            investigation.evidences,
          evidenceType: "RAPI_RESULT",
        }),
      },

      {
        key: "TRANSUNION",
        label: "Consultar TransUnion",
        status: getTaskStatus({
          artifacts:
            artifactsByType.TRANSUNION || [],
          evidences:
            investigation.evidences,
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

    const completedTasks = tasks.filter(
      (task) => task.status === "COMPLETED"
    ).length;

    const progress = Math.round(
      (completedTasks / tasks.length) * 100
    );

    return res.json({
      investigation: {
        id: investigation.id,
        status: investigation.status,
        startedAt: investigation.startedAt,
        completedAt:
          investigation.completedAt,
        executive:
          investigation.executive,
      },

      check: investigation.check,

      vehicleBase:
        vehicleBaseEvidence?.data || null,

      tasks,

      progress,

      summary: {
        artifactCount:
          investigation.artifacts.length,

        evidenceCount:
          investigation.evidences.length,

        findingCount:
          investigation.findings.length,

        completedTasks,

        totalTasks: tasks.length,

        reportReady:
          Boolean(investigation.check.report),
      },

      artifacts: investigation.artifacts,
      evidences: investigation.evidences,
      findings: investigation.findings,
      report: investigation.check.report,
    });
  })
);

  return router;
}

module.exports = createInvestigationsRouter;