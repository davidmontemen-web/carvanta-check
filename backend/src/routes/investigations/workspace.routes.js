const express = require("express");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");
const { buildWorkspaceResponse } = require("../../services/workspace/buildWorkspaceResponse");

function createRouter() {
  const router = express.Router();

  router.get(
    "/investigations/:id/workspace",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const investigation = await findInvestigationOrFail(req.params.id, {
        include: {
          executive: { select: { id: true, name: true, email: true, role: true } },
          check: {
            include: {
              documents: { orderBy: { createdAt: "asc" } },
              report: true,
            },
          },
          artifacts: { orderBy: { createdAt: "desc" } },
          evidences: { orderBy: { createdAt: "desc" } },
          findings: { orderBy: { createdAt: "desc" } },
          fiscalDocuments: { orderBy: { sequence: "asc" } },
          ownershipTransfers: { orderBy: { sequence: "asc" } },
          invoiceInvestigatorAnalysis: true,
        },
      });

      validateInvestigationOwnership(investigation, req.user.id);
      return res.json(buildWorkspaceResponse(investigation));
    })
  );

  return router;
}

module.exports = createRouter;
