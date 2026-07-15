const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./lib/prisma");
const authRoutes = require("./routes/auth.routes");
const reportRoutes = require("./routes/report.routes");
const createInvestigationsRouter = require(
  "./routes/investigations.routes"
);
const executiveRoutes = require(
  "./routes/executive.routes"
);
const createChecksRouter = require(
  "./routes/checks.routes"
);
const {
  authMiddleware,
  requireRoles,
} = require("./middleware/auth");
const {
  errorHandler,
} = require("./middleware/errorHandler");

const router = express.Router();





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

router.use(authRoutes);
router.use(reportRoutes);
router.use(executiveRoutes);

router.use(
  createChecksRouter({
    documentUpload,
    removeUploadedFiles,
    checkDetailInclude,
  })
);

router.use(
  createInvestigationsRouter({
    artifactUpload,
    removeFileIfExists,
  })
);




/* -------------------------------------------------------------------------- */
/* Expedientes: creación y consulta                                           */
/* -------------------------------------------------------------------------- */


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

router.use(errorHandler);
/* -------------------------------------------------------------------------- */
/* Exportación                                                                */
/* -------------------------------------------------------------------------- */

module.exports = router;