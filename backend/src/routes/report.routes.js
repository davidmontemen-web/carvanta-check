const express = require("express");

const { prisma } = require("../lib/prisma");
const { authMiddleware } = require("../middleware/auth");
const analyzeCheck = require("../services/analysis/analyzeCheck");
const {
  asyncHandler,
} = require("../utils/http");

const {
  findCheckOrFail,
} = require("../utils/entities");

const router = express.Router();



/* -------------------------------------------------------------------------- */
/* Generar análisis y reporte                                                 */
/* -------------------------------------------------------------------------- */

router.post(
  "/checks/:id/analyze",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const check = await findCheckOrFail(req.params.id, {
      include: {
        documents: true,
        review: true,
        report: true,
        evidences: true,
      },
    });

    const analysis = await Promise.resolve(
      analyzeCheck(check)
    );

    const report = await prisma.$transaction(
      async (transaction) => {
        const savedReport =
          await transaction.report.upsert({
            where: {
              checkId: check.id,
            },

            update: analysis,

            create: {
              checkId: check.id,
              ...analysis,
            },
          });

        await transaction.check.update({
          where: {
            id: check.id,
          },

          data: {
            status: "reporte_generado",
          },
        });

        return savedReport;
      }
    );

    return res.json(report);
  })
);

/* -------------------------------------------------------------------------- */
/* Consultar reporte                                                          */
/* -------------------------------------------------------------------------- */

router.get(
  "/checks/:id/report",
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({
      where: {
        checkId: req.params.id,
      },
    });

    if (!report) {
      return res.status(404).json({
        error: "Reporte no encontrado",
      });
    }

    return res.json(report);
  })
);

module.exports = router;