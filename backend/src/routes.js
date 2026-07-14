const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./lib/prisma");
const analyzeCheck = require("./services/analysis/analyzeCheck");
const authRoutes = require("./routes/auth.routes");
const reportRoutes = require("./routes/report.routes");
const {
  authMiddleware,
  requireRoles,
} = require("./middleware/auth");

const router = express.Router();

router.use(authRoutes);
router.use(reportRoutes);




const uploadsRootPath = path.join(__dirname, "../uploads");
const documentsUploadsPath = uploadsRootPath;
const investigationUploadsPath = path.join(
  uploadsRootPath,
  "investigations"
);

fs.mkdirSync(documentsUploadsPath, {
  recursive: true,
});

fs.mkdirSync(investigationUploadsPath, {
  recursive: true,
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function sanitizeFileName(originalName) {
  const extension = path.extname(originalName).toLowerCase();

  const baseName = path
    .basename(originalName, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);

  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${
    baseName || "archivo"
  }${extension}`;
}

function fileFilter(req, file, callback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return callback(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Solo se permiten archivos PDF, JPG, PNG o WEBP"
      )
    );
  }

  callback(null, true);
}

function removeFileIfExists(filePath) {
  if (!filePath) {
    return;
  }

  fs.unlink(filePath, () => {});
}

function removeUploadedFiles(files) {
  if (!files) {
    return;
  }

  if (Array.isArray(files)) {
    files.forEach((file) => {
      removeFileIfExists(file.path);
    });

    return;
  }

  Object.values(files)
    .flat()
    .forEach((file) => {
      removeFileIfExists(file.path);
    });
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function parseOptionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    const error = new Error(`${fieldName} debe ser un número entero`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function parseOptionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    const error = new Error(`${fieldName} debe ser un número válido`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
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

/* -------------------------------------------------------------------------- */
/* Middlewares                                                                */
/* -------------------------------------------------------------------------- */

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}





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

async function findInvestigationOrFail(investigationId, options = {}) {
  const investigation = await prisma.investigation.findUnique({
    where: {
      id: investigationId,
    },
    ...options,
  });

  if (!investigation) {
    const error = new Error("Investigación no encontrada");
    error.statusCode = 404;
    throw error;
  }

  return investigation;
}

function validateInvestigationOwnership(investigation, userId) {
  if (investigation.executiveId !== userId) {
    const error = new Error(
      "No tienes acceso a esta investigación"
    );

    error.statusCode = 403;
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Configuración de Multer para documentos iniciales                          */
/* -------------------------------------------------------------------------- */

const documentStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, documentsUploadsPath);
  },

  filename: (req, file, callback) => {
    try {
      const storedName = sanitizeFileName(file.originalname);
      callback(null, storedName);
    } catch (error) {
      callback(error);
    }
  },
});

const documentUpload = multer({
  storage: documentStorage,

  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 4,
  },

  fileFilter,
});

/* -------------------------------------------------------------------------- */
/* Configuración de Multer para evidencias de investigación                   */
/* -------------------------------------------------------------------------- */

const artifactStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, investigationUploadsPath);
  },

  filename: (req, file, callback) => {
    try {
      const storedName = sanitizeFileName(file.originalname);
      callback(null, storedName);
    } catch (error) {
      callback(error);
    }
  },
});

const artifactUpload = multer({
  storage: artifactStorage,

  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },

  fileFilter,
});

/* -------------------------------------------------------------------------- */
/* Selectores reutilizables                                                   */
/* -------------------------------------------------------------------------- */

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

const checkDetailInclude = {
  documents: {
    orderBy: {
      createdAt: "asc",
    },
  },

  review: true,
  report: true,

  evidences: {
    orderBy: {
      createdAt: "desc",
    },
  },

  assignedTo: {
    select: publicUserSelect,
  },

  investigation: {
    include: {
      executive: {
        select: publicUserSelect,
      },

      artifacts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  },
};


/* -------------------------------------------------------------------------- */
/* Expedientes: creación y consulta                                           */
/* -------------------------------------------------------------------------- */

router.post(
  "/checks",
  documentUpload.fields([
    {
      name: "tarjetaCirculacion",
      maxCount: 1,
    },
    {
      name: "facturaFrente",
      maxCount: 1,
    },
    {
      name: "facturaReverso",
      maxCount: 1,
    },
    {
      name: "documentoAdicional",
      maxCount: 1,
    },
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files || {};

    try {
      requireFields(req.body, ["marca", "modelo", "anio"]);

      if (!files.tarjetaCirculacion?.[0]) {
        const error = new Error(
          "La tarjeta de circulación es obligatoria"
        );

        error.statusCode = 400;
        throw error;
      }

      const anio = normalizeString(req.body.anio);
      const precio = normalizeString(req.body.precio);

      const checkData = {
        marca: normalizeString(req.body.marca),
        modelo: normalizeString(req.body.modelo),
        anio,
        version: normalizeString(req.body.version),
        placas: normalizeString(req.body.placas),
        vin: normalizeString(req.body.vin),
        vendedor: normalizeString(req.body.vendedor),
        precio,
      };

      const docsToCreate = [];

      Object.entries(files).forEach(([type, fileArray]) => {
        const file = fileArray?.[0];

        if (!file) {
          return;
        }

        docsToCreate.push({
          type,
          fileName: file.originalname,
          filePath: `/uploads/${file.filename}`,
        });
      });

      const createdCheck = await prisma.$transaction(
        async (transaction) => {
          const check = await transaction.check.create({
            data: checkData,
          });

          if (docsToCreate.length > 0) {
            await transaction.document.createMany({
              data: docsToCreate.map((document) => ({
                ...document,
                checkId: check.id,
              })),
            });
          }

          return transaction.check.findUnique({
            where: {
              id: check.id,
            },

            include: {
              documents: {
                orderBy: {
                  createdAt: "asc",
                },
              },

              review: true,
              report: true,
            },
          });
        }
      );

      return res.status(201).json(createdCheck);
    } catch (error) {
      removeUploadedFiles(files);
      throw error;
    }
  })
);

router.get(
  "/checks/:id",
  asyncHandler(async (req, res) => {
    const check = await findCheckOrFail(req.params.id, {
      include: checkDetailInclude,
    });

    return res.json(check);
  })
);

/* -------------------------------------------------------------------------- */
/* Expedientes: información del cliente                                       */
/* -------------------------------------------------------------------------- */

router.patch(
  "/checks/:id/customer",
  asyncHandler(async (req, res) => {
    requireFields(req.body, [
      "nombreCliente",
      "whatsapp",
      "email",
    ]);

    await findCheckOrFail(req.params.id);

    const email = String(req.body.email)
      .trim()
      .toLowerCase();

    const updatedCheck = await prisma.check.update({
      where: {
        id: req.params.id,
      },

      data: {
        nombreCliente: normalizeString(req.body.nombreCliente),
        whatsapp: normalizeString(req.body.whatsapp),
        email,
        status: "registro_completo",
      },

      include: {
        documents: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return res.json(updatedCheck);
  })
);

/* -------------------------------------------------------------------------- */
/* Expedientes: pago                                                          */
/* -------------------------------------------------------------------------- */

router.patch(
  "/checks/:id/pay",
  asyncHandler(async (req, res) => {
    const existingCheck = await findCheckOrFail(req.params.id);

    if (existingCheck.status === "pagado") {
      return res.json(existingCheck);
    }

    const updatedCheck = await prisma.check.update({
      where: {
        id: req.params.id,
      },

      data: {
        status: "pagado",
      },

      include: {
        documents: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return res.json(updatedCheck);
  })
);

/* -------------------------------------------------------------------------- */
/* Revisión ejecutiva                                                         */
/* -------------------------------------------------------------------------- */

router.post(
  "/checks/:id/review",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await findCheckOrFail(req.params.id);

    const reviewData = {
      repuveStatus: normalizeString(req.body.repuveStatus),
      invoiceStatus: normalizeString(req.body.invoiceStatus),
      circulationStatus: normalizeString(
        req.body.circulationStatus
      ),
      ownershipNotes: normalizeString(req.body.ownershipNotes),
      riskNotes: normalizeString(req.body.riskNotes),
      executiveNotes: normalizeString(
        req.body.executiveNotes
      ),
    };

    const result = await prisma.$transaction(
      async (transaction) => {
        const review = await transaction.review.upsert({
          where: {
            checkId: req.params.id,
          },

          update: reviewData,

          create: {
            checkId: req.params.id,
            ...reviewData,
          },
        });

        const check = await transaction.check.update({
          where: {
            id: req.params.id,
          },

          data: {
            status: "review_completo",
          },
        });

        return {
          review,
          check,
        };
      }
    );

    return res.json(result);
  })
);



/* -------------------------------------------------------------------------- */
/* Evidencias                                                                 */
/* -------------------------------------------------------------------------- */

router.post(
  "/checks/:id/evidence",
  authMiddleware,
  asyncHandler(async (req, res) => {

    await findCheckOrFail(req.params.id);

    requireFields(req.body, [
      "type",
    ]);

    const evidence = await prisma.evidence.create({

      data: {

        checkId: req.params.id,

        source:
          normalizeString(req.body.source) ||
          "EXECUTIVE",

        type: normalizeString(req.body.type),

        data: req.body.data || {},

      },

    });

    return res.status(201).json(evidence);

  })
);

/* -------------------------------------------------------------------------- */
/* Listado Evidencias                                                         */
/* -------------------------------------------------------------------------- */

router.get(
  "/checks/:id/evidence",
  authMiddleware,
  asyncHandler(async (req, res) => {

    await findCheckOrFail(req.params.id);

    const evidences =
      await prisma.evidence.findMany({

        where: {
          checkId: req.params.id,
        },

        orderBy: {
          createdAt: "desc",
        },

      });

    return res.json(evidences);

  })
);

/* -------------------------------------------------------------------------- */
/* Dashboard Ejecutivo                                                        */
/* -------------------------------------------------------------------------- */

router.get(
  "/executive/checks",
  authMiddleware,
  asyncHandler(async (req, res) => {

    const checks =
      await prisma.check.findMany({

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
        const existingCheck = await transaction.check.findUnique({
          where: {
            id: checkId,
          },

          include: {
            investigation: true,
          },
        });

        if (!existingCheck) {
          const error = new Error("Expediente no encontrado");
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

        if (existingCheck.assignedToId === executiveId) {
          return {
            check: existingCheck,
            investigation: existingCheck.investigation,
            alreadyAssigned: true,
          };
        }

        const updatedCount = await transaction.check.updateMany({
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

        const updatedCheck = await transaction.check.findUnique({
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

        let investigation = updatedCheck.investigation;

        if (!investigation) {
          investigation = await transaction.investigation.create({
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
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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

    const investigation = await prisma.$transaction(
      async (transaction) => {
        const check = await transaction.check.findUnique({
          where: {
            id: checkId,
          },

          include: {
            investigation: true,
          },
        });

        if (!check) {
          const error = new Error("Expediente no encontrado");
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

        if (check.assignedToId !== executiveId) {
          const error = new Error(
            "Este expediente está asignado a otro ejecutivo"
          );

          error.statusCode = 403;
          throw error;
        }

        if (check.investigation) {
          if (
            check.investigation.executiveId !== executiveId
          ) {
            const error = new Error(
              "La investigación pertenece a otro ejecutivo"
            );

            error.statusCode = 403;
            throw error;
          }

          if (check.investigation.status === "IN_PROGRESS") {
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

    return res.status(201).json(investigation);
  })
);

/* -------------------------------------------------------------------------- */
/* Investigación: consultar detalle                                           */
/* -------------------------------------------------------------------------- */

router.get(
  "/investigations/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation = await findInvestigationOrFail(
      req.params.id,
      {
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
      }
    );

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    return res.json(investigation);
  })
);

/* -------------------------------------------------------------------------- */
/* Investigación: carga de artifacts                                          */
/* -------------------------------------------------------------------------- */

router.post(
  "/investigations/:id/artifacts",
  authMiddleware,
  artifactUpload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      const investigation = await findInvestigationOrFail(
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

      if (investigation.status !== "IN_PROGRESS") {
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

      const artifact = await prisma.artifact.create({
        data: {
          investigationId: investigation.id,

          source:
            normalizeString(req.body.source) ||
            "EXECUTIVE",

          type: normalizeString(req.body.type),

          originalName: req.file.originalname,
          storedName: req.file.filename,

          filePath: `/uploads/investigations/${req.file.filename}`,

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

/* -------------------------------------------------------------------------- */
/* Investigación: listado de artifacts                                        */
/* -------------------------------------------------------------------------- */

router.get(
  "/investigations/:id/artifacts",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation = await findInvestigationOrFail(
      req.params.id
    );

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    const artifacts = await prisma.artifact.findMany({
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

/* -------------------------------------------------------------------------- */
/* Investigación: registrar evidencia estructurada                           */
/* -------------------------------------------------------------------------- */

router.post(
  "/investigations/:id/evidences",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation = await findInvestigationOrFail(
      req.params.id
    );

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    if (investigation.status !== "IN_PROGRESS") {
      const error = new Error(
        "La investigación ya no acepta nuevas evidencias"
      );

      error.statusCode = 409;
      throw error;
    }

    requireFields(req.body, ["type"]);

    const evidence = await prisma.evidence.create({
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

/* -------------------------------------------------------------------------- */
/* Investigación: listado de evidencias                                       */
/* -------------------------------------------------------------------------- */

router.get(
  "/investigations/:id/evidences",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation = await findInvestigationOrFail(
      req.params.id
    );

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    const evidences = await prisma.evidence.findMany({
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

/* -------------------------------------------------------------------------- */
/* Investigación: registrar hallazgo                                          */
/* -------------------------------------------------------------------------- */

router.post(
  "/investigations/:id/findings",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation = await findInvestigationOrFail(
      req.params.id
    );

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    if (investigation.status !== "IN_PROGRESS") {
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

    const finding = await prisma.finding.create({
      data: {
        investigationId: investigation.id,

        type: normalizeString(req.body.type),
        title: normalizeString(req.body.title),
        description: normalizeString(
          req.body.description
        ),

        severity:
          normalizeString(req.body.severity) ||
          "INFO",

        status:
          normalizeString(req.body.status) ||
          "OPEN",
      },
    });

    return res.status(201).json(finding);
  })
);

/* -------------------------------------------------------------------------- */
/* Investigación: listado de hallazgos                                        */
/* -------------------------------------------------------------------------- */

router.get(
  "/investigations/:id/findings",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigation = await findInvestigationOrFail(
      req.params.id
    );

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    const findings = await prisma.finding.findMany({
      where: {
        investigationId: investigation.id,
      },

      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    });

    return res.json(findings);
  })
);

/* -------------------------------------------------------------------------- */
/* Investigación: completar                                                   */
/* -------------------------------------------------------------------------- */

router.patch(
  "/investigations/:id/complete",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const investigationId = req.params.id;
    const executiveId = req.user.id;

    const result = await prisma.$transaction(
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
          investigation.executiveId !== executiveId
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
              status: "INVESTIGACION_COMPLETA",
            },
          });

        return {
          investigation: updatedInvestigation,
          check: updatedCheck,
          alreadyCompleted: false,
        };
      }
    );

    return res.json(result);
  })
);

/* -------------------------------------------------------------------------- */
/* Ejecutivo: consultar únicamente sus expedientes                           */
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
/* Ejecutivo: expedientes disponibles                                        */
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

/* -------------------------------------------------------------------------- */
/* Manejo centralizado de errores                                             */
/* -------------------------------------------------------------------------- */

router.use((error, req, res, next) => {
  console.error("[ROUTES ERROR]", {
    message: error.message,
    stack: error.stack,
    method: req.method,
    path: req.originalUrl,
  });

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "El archivo supera el límite máximo de 15 MB",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Se excedió la cantidad permitida de archivos",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error:
          error.message ||
          "Archivo o campo de archivo no permitido",
      });
    }

    return res.status(400).json({
      error: error.message || "Error al cargar el archivo",
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Ya existe un registro con esos datos",
        fields: error.meta?.target || [],
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Registro no encontrado",
      });
    }

    if (error.code === "P2003") {
      return res.status(409).json({
        error:
          "La operación viola una relación existente en la base de datos",
      });
    }

    return res.status(400).json({
      error: "Error de base de datos",
      code: error.code,
    });
  }

  if (
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return res.status(400).json({
      error:
        "Los datos enviados no coinciden con el esquema de Prisma",
    });
  }

  if (error instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      error: "El token ha expirado",
    });
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }

  const statusCode =
    Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Ocurrió un error interno en el servidor"
        : error.message,
  });
});

/* -------------------------------------------------------------------------- */
/* Exportación                                                                */
/* -------------------------------------------------------------------------- */

module.exports = router;