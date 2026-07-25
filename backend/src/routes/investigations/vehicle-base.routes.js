const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const {
  asyncHandler,
  normalizeString,
  requireFields,
} = require("../../utils/http");
const {
  findInvestigationOrFail,
  validateInvestigationOwnership,
} = require("../../utils/entities");
const {
  buildCustomerSnapshot,
  compareVehicleIdentity,
  buildVehicleIdentityFindings,
  buildVehicleIdentityPreview,
} = require("../../services/vehicle-base/vehicleBase.service");

function createRouter() {
  const router = express.Router();

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

      if (investigation.status !== "IN_PROGRESS") {
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

      const existingEvidence =
        await prisma.evidence.findFirst({
          where: {
            investigationId: investigation.id,
            type: "VEHICLE_BASE_VALIDATED",
          },
        });

      const previousData =
        existingEvidence?.data &&
        typeof existingEvidence.data === "object"
          ? existingEvidence.data
          : {};

      const customerData =
        previousData.customerData ||
        buildCustomerSnapshot(investigation.check);

      const validatedData = {
        vin: normalizeString(req.body.vin),
        plate: normalizeString(req.body.plate),
        brand: normalizeString(req.body.brand),
        model: normalizeString(req.body.model),
        year: normalizeString(req.body.year),
        version: normalizeString(req.body.version),
        state: normalizeString(req.body.state),
        owner: normalizeString(req.body.owner),
        notes: normalizeString(req.body.notes),
      };

      const comparisons = compareVehicleIdentity(
        customerData,
        validatedData
      );

      const findingPayloads =
        buildVehicleIdentityFindings(comparisons);

      const preview = buildVehicleIdentityPreview({
        customerData,
        validatedData,
        comparisons,
        findings: findingPayloads,
      });

      const evidenceData = {
        ...validatedData,
        customerData,
        comparisons,
        preview,
        validatedAgainst: "TARJETA_CIRCULACION",
        validatedBy: req.user.id,
        validatedAt: new Date().toISOString(),
      };

      const evidence = await prisma.$transaction(
        async (transaction) => {
          const savedEvidence = existingEvidence
            ? await transaction.evidence.update({
                where: {
                  id: existingEvidence.id,
                },
                data: {
                  data: evidenceData,
                  source: "EXECUTIVE_VALIDATION",
                  extractionStatus: "COMPLETED",
                  confidence:
                    preview.data.identityConfidence === "HIGH"
                      ? 1
                      : preview.data.identityConfidence === "MEDIUM"
                        ? 0.75
                        : 0.5,
                  extractor:
                    "manual-executive-validation",
                  extractedAt: new Date(),
                },
              })
            : await transaction.evidence.create({
                data: {
                  checkId: investigation.checkId,
                  investigationId: investigation.id,
                  source: "EXECUTIVE_VALIDATION",
                  type: "VEHICLE_BASE_VALIDATED",
                  data: evidenceData,
                  extractionStatus: "COMPLETED",
                  confidence:
                    preview.data.identityConfidence === "HIGH"
                      ? 1
                      : preview.data.identityConfidence === "MEDIUM"
                        ? 0.75
                        : 0.5,
                  extractor:
                    "manual-executive-validation",
                  extractedAt: new Date(),
                },
              });

          await transaction.finding.deleteMany({
            where: {
              investigationId: investigation.id,
              type: {
                startsWith: "VEHICLE_IDENTITY_",
              },
            },
          });

          if (findingPayloads.length > 0) {
            await transaction.finding.createMany({
              data: findingPayloads.map((finding) => ({
                investigationId: investigation.id,
                ...finding,
              })),
            });
          }

          await transaction.check.update({
            where: {
              id: investigation.checkId,
            },
            data: {
              vin: validatedData.vin,
              placas: validatedData.plate,
              marca: validatedData.brand,
              modelo: validatedData.model,
              anio: validatedData.year,
              version: validatedData.version,
            },
          });

          return savedEvidence;
        }
      );

      return res.json({
        evidence,
        preview,
      });
    })
  );

  return router;
}

module.exports = createRouter;
