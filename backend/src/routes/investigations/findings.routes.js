const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter() {
  const router = express.Router();

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

  return router;
}

module.exports = createRouter;
