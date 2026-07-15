const express = require("express");
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
const {
  documentUpload,
  artifactUpload,
  removeFileIfExists,
  removeUploadedFiles,
} = require("./middleware/uploads");

const router = express.Router();







/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */





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