const express = require("express");

const authRoutes = require("./auth.routes");
const executiveRoutes = require("./executive.routes");

const createChecksRouter = require(
  "./checks.routes"
);

const createInvestigationsRouter = require(
  "./investigations.routes"
);

const {
  documentUpload,
  artifactUpload,
  removeFileIfExists,
  removeUploadedFiles,
} = require("../middleware/uploads");

const {
  errorHandler,
} = require("../middleware/errorHandler");

const router = express.Router();

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
};

/* -------------------------------------------------------------------------- */
/* Rutas públicas y dominios principales                                      */
/* -------------------------------------------------------------------------- */

router.use(authRoutes);

router.use(
  createChecksRouter({
    documentUpload,
    removeUploadedFiles,
    checkDetailInclude,
  })
);

router.use(executiveRoutes);

router.use(
  createInvestigationsRouter({
    artifactUpload,
    removeFileIfExists,
  })
);

/* -------------------------------------------------------------------------- */
/* Manejo centralizado de errores                                             */
/* -------------------------------------------------------------------------- */

router.use(errorHandler);

module.exports = router;