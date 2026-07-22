const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter() {
  const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Validar identidad base del vehículo                                        */
/* -------------------------------------------------------------------------- */

router.post(
"/investigations/:id/vehicle-base",
authMiddleware,
asyncHandler(async (req, res) => {
  const investigation =
    await findInvestigationOrFail(req.params.id, {
      include: {
        check: true,
      },
    });

  validateInvestigationOwnership(
    investigation,
    req.user.id
  );

  if (
    investigation.status !== "IN_PROGRESS"
  ) {
    const error = new Error(
      "La investigación ya no acepta validaciones"
    );

    error.statusCode = 409;
    throw error;
  }

  requireFields(req.body, [
    "vin",
    "plate",
    "brand",
    "model",
    "year",
  ]);

  const data = {
    vin: normalizeString(req.body.vin),
    plate: normalizeString(req.body.plate),
    brand: normalizeString(req.body.brand),
    model: normalizeString(req.body.model),
    year: normalizeString(req.body.year),
    version: normalizeString(req.body.version),
    state: normalizeString(req.body.state),
    owner: normalizeString(req.body.owner),
    notes: normalizeString(req.body.notes),

    validatedAgainst: "TARJETA_CIRCULACION",
    validatedBy: req.user.id,
    validatedAt: new Date().toISOString(),
  };

  const existingEvidence =
    await prisma.evidence.findFirst({
      where: {
        investigationId: investigation.id,
        type: "VEHICLE_BASE_VALIDATED",
      },
    });

  const evidence = existingEvidence
    ? await prisma.evidence.update({
        where: {
          id: existingEvidence.id,
        },

        data: {
          data,
          source: "EXECUTIVE_VALIDATION",
          extractionStatus: "COMPLETED",
          confidence: 1,
          extractor: "manual-executive-validation",
          extractedAt: new Date(),
          createdById: req.user.id,
        },
      })
    : await prisma.evidence.create({
        data: {
          checkId: investigation.checkId,
          investigationId: investigation.id,

          source: "EXECUTIVE_VALIDATION",
          type: "VEHICLE_BASE_VALIDATED",
          data,

          extractionStatus: "COMPLETED",
          confidence: 1,
          extractor: "manual-executive-validation",
          extractedAt: new Date(),
          createdById: req.user.id,
        },
      });

  await prisma.check.update({
    where: {
      id: investigation.checkId,
    },

    data: {
      vin: data.vin,
      placas: data.plate,
      marca: data.brand,
      modelo: data.model,
      anio: data.year,
      version: data.version,
    },
  });

  return res.json(evidence);
})
);

  return router;
}

module.exports = createRouter;
