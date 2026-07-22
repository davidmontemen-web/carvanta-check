const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter() {
  const router = express.Router();

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

  return router;
}

module.exports = createRouter;
