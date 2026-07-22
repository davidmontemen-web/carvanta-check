const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter() {
  const router = express.Router();

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

          fiscalDocuments: {
            orderBy: {
              sequence: "asc",
            },
          },

          ownershipTransfers: {
            orderBy: {
              sequence: "asc",
            },
          },

          invoiceInvestigatorAnalysis: true,
        },
      });

    validateInvestigationOwnership(
      investigation,
      req.user.id
    );

    return res.json(investigation);
  })
);

  return router;
}

module.exports = createRouter;
