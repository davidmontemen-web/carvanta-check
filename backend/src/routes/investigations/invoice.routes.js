const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter() {
  const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Módulo de factura y cadena documental                                      */
/* -------------------------------------------------------------------------- */

router.post(
"/investigations/:id/fiscal-documents",
authMiddleware,
asyncHandler(async (req, res) => {
  const investigation =
    await findInvestigationOrFail(req.params.id);

  validateInvestigationOwnership(
    investigation,
    req.user.id
  );

  requireFields(req.body, ["sequence", "type"]);

  const sequence = Number(req.body.sequence);

  if (!Number.isInteger(sequence) || sequence < 1) {
    const error = new Error(
      "sequence debe ser un entero mayor a cero"
    );
    error.statusCode = 400;
    throw error;
  }

  const document =
    await prisma.fiscalDocument.create({
      data: {
        investigationId: investigation.id,
        sequence,
        type: normalizeString(req.body.type),
        status:
          normalizeString(req.body.status) ||
          "DRAFT",
        label: normalizeString(req.body.label),
        uuid: normalizeString(req.body.uuid),
        series: normalizeString(req.body.series),
        folio: normalizeString(req.body.folio),
        issuerRfc:
          normalizeString(req.body.issuerRfc),
        issuerName:
          normalizeString(req.body.issuerName),
        receiverRfc:
          normalizeString(req.body.receiverRfc),
        receiverName:
          normalizeString(req.body.receiverName),
        issuedAt: req.body.issuedAt
          ? new Date(req.body.issuedAt)
          : null,
        totalAmount:
          String(req.body.totalAmount || "").trim()
            ? String(req.body.totalAmount)
            : null,
        currency:
          normalizeString(req.body.currency),
        satStatus:
          normalizeString(req.body.satStatus),
        cancellationStatus:
          normalizeString(
            req.body.cancellationStatus
          ),
        satValidatedAt: req.body.satValidatedAt
          ? new Date(req.body.satValidatedAt)
          : null,
        vin: normalizeString(req.body.vin),
        engineNumber:
          normalizeString(req.body.engineNumber),
        brand: normalizeString(req.body.brand),
        model: normalizeString(req.body.model),
        year: normalizeString(req.body.year),
        version: normalizeString(req.body.version),
        documentQuality:
          normalizeString(
            req.body.documentQuality
          ),
        notes: normalizeString(req.body.notes),
      },
    });

  return res.status(201).json(document);
})
);

router.post(
"/investigations/:id/ownership-transfers",
authMiddleware,
asyncHandler(async (req, res) => {
  const investigation =
    await findInvestigationOrFail(req.params.id);

  validateInvestigationOwnership(
    investigation,
    req.user.id
  );

  requireFields(req.body, ["sequence", "type"]);

  const sequence = Number(req.body.sequence);

  if (!Number.isInteger(sequence) || sequence < 1) {
    const error = new Error(
      "sequence debe ser un entero mayor a cero"
    );
    error.statusCode = 400;
    throw error;
  }

  const transfer =
    await prisma.ownershipTransfer.create({
      data: {
        investigationId: investigation.id,
        sequence,
        type: normalizeString(req.body.type),
        status:
          normalizeString(req.body.status) ||
          "ACTIVE",
        fromName:
          normalizeString(req.body.fromName),
        fromRfc:
          normalizeString(req.body.fromRfc),
        toName:
          normalizeString(req.body.toName),
        toRfc:
          normalizeString(req.body.toRfc),
        transferDate: req.body.transferDate
          ? new Date(req.body.transferDate)
          : null,
        notes: normalizeString(req.body.notes),
      },
    });

  return res.status(201).json(transfer);
})
);

router.put(
"/investigations/:id/invoice-analysis",
authMiddleware,
asyncHandler(async (req, res) => {
  const investigation =
    await findInvestigationOrFail(req.params.id);

  validateInvestigationOwnership(
    investigation,
    req.user.id
  );

  const booleanOrNull = (value) =>
    typeof value === "boolean" ? value : null;

  const data = {
    researcherId: req.user.id,
    documentQuality:
      normalizeString(req.body.documentQuality),
    documentsLegibility:
      normalizeString(
        req.body.documentsLegibility
      ),
    hasIncompleteDocs:
      booleanOrNull(req.body.hasIncompleteDocs),
    allCfdiValidated:
      normalizeString(
        req.body.allCfdiValidated
      ),
    hasSatInconsistency:
      booleanOrNull(
        req.body.hasSatInconsistency
      ),
    satNotes:
      normalizeString(req.body.satNotes),
    chainStatus:
      normalizeString(req.body.chainStatus),
    chronologyStatus:
      normalizeString(
        req.body.chronologyStatus
      ),
    currentOwnerIdentified:
      booleanOrNull(
        req.body.currentOwnerIdentified
      ),
    hasEndorsements:
      booleanOrNull(req.body.hasEndorsements),
    endorsementsLegibility:
      normalizeString(
        req.body.endorsementsLegibility
      ),
    signaturesPresent:
      normalizeString(
        req.body.signaturesPresent
      ),
    datesPresent:
      normalizeString(req.body.datesPresent),
    hasCancelledEndorsements:
      booleanOrNull(
        req.body.hasCancelledEndorsements
      ),
    refacturaCount:
      Number(req.body.refacturaCount) || 0,
    refacturaRelation:
      normalizeString(
        req.body.refacturaRelation
      ),
    technicalObservations:
      normalizeString(
        req.body.technicalObservations
      ),
    conclusion:
      normalizeString(req.body.conclusion),
    researcherConfidence:
      normalizeString(
        req.body.researcherConfidence
      ),
    reviewedAt: new Date(),
  };

  const analysis =
    await prisma.invoiceInvestigatorAnalysis.upsert({
      where: {
        investigationId: investigation.id,
      },
      create: {
        investigationId: investigation.id,
        ...data,
      },
      update: data,
    });

  return res.json(analysis);
})
);

  return router;
}

module.exports = createRouter;
