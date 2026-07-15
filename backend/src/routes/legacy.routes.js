const express = require("express");

const { prisma } = require("../lib/prisma");
const { authMiddleware } = require("../middleware/auth");

const {
  asyncHandler,
  normalizeString,
  requireFields,
} = require("../utils/http");

const {
  findCheckOrFail,
} = require("../utils/entities");

const router = express.Router();

/*
 * RUTAS LEGACY
 *
 * Estas rutas conservan compatibilidad con el flujo anterior:
 * Check -> Review -> Evidence manual -> Report
 *
 * No agregaremos nuevas funcionalidades aquí.
 */

/* -------------------------------------------------------------------------- */
/* Revisión ejecutiva                                                         */
/* -------------------------------------------------------------------------- */

router.post(
  "/checks/:id/review",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await findCheckOrFail(req.params.id);

    const reviewData = {
      repuveStatus: normalizeString(
        req.body.repuveStatus
      ),

      invoiceStatus: normalizeString(
        req.body.invoiceStatus
      ),

      circulationStatus: normalizeString(
        req.body.circulationStatus
      ),

      ownershipNotes: normalizeString(
        req.body.ownershipNotes
      ),

      riskNotes: normalizeString(
        req.body.riskNotes
      ),

      executiveNotes: normalizeString(
        req.body.executiveNotes
      ),
    };

    const result = await prisma.$transaction(
      async (transaction) => {
        const review =
          await transaction.review.upsert({
            where: {
              checkId: req.params.id,
            },

            update: reviewData,

            create: {
              checkId: req.params.id,
              ...reviewData,
            },
          });

        const check =
          await transaction.check.update({
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
/* Evidencia manual anterior                                                  */
/* -------------------------------------------------------------------------- */

router.post(
  "/checks/:id/evidence",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await findCheckOrFail(req.params.id);

    requireFields(req.body, ["type"]);

    const evidence = await prisma.evidence.create({
      data: {
        checkId: req.params.id,

        source:
          normalizeString(req.body.source) ||
          "EXECUTIVE",

        type: normalizeString(req.body.type),

        data:
          req.body.data &&
          typeof req.body.data === "object"
            ? req.body.data
            : {},
      },
    });

    return res.status(201).json(evidence);
  })
);

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

module.exports = router;