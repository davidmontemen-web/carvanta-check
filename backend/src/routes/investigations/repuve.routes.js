const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter() {
  const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Resultado estructurado de REPUVE                                           */
/* -------------------------------------------------------------------------- */

router.post(
"/investigations/:id/repuve-result",
authMiddleware,
asyncHandler(async (req, res) => {
  const investigation =
    await findInvestigationOrFail(req.params.id, {
      include: {
        artifacts: true,
        evidences: true,
      },
    });

  validateInvestigationOwnership(
    investigation,
    req.user.id
  );

  if (investigation.status !== "IN_PROGRESS") {
const error = new Error(
  "La investigación ya no acepta resultados de REPUVE"
);

error.statusCode = 409;
throw error;
}

const artifactId =
String(req.body.artifactId || "").trim();

if (!artifactId) {
const error = new Error(
  "El campo artifactId es obligatorio"
);

error.statusCode = 400;
throw error;
}

const repuveArtifact =
await prisma.artifact.findUnique({
  where: {
    id: artifactId,
  },
});

if (!repuveArtifact) {
const error = new Error(
  `No existe un artifact con el ID ${artifactId}`
);

error.statusCode = 404;
throw error;
}

if (
repuveArtifact.investigationId !==
investigation.id
) {
const error = new Error(
  `El artifact pertenece a la investigación ${repuveArtifact.investigationId}, no a ${investigation.id}`
);

error.statusCode = 409;
throw error;
}

if (repuveArtifact.type !== "REPUVE") {
const error = new Error(
  `El artifact indicado es de tipo ${repuveArtifact.type}, no REPUVE`
);

error.statusCode = 409;
throw error;
}

requireFields(req.body, [
"artifactId",
"vin",
"plate",
"brand",
"model",
"year",
"queriedAt",
"prosecutorOfficeStatus",
"ocraStatus",
"carfaxStatus",
"ministerialStatus",
]);

  const allowedStatuses = [
    "CLEAR",
    "ALERT",
    "UNKNOWN",
  ];

  const statusFields = {
    prosecutorOfficeStatus:
      req.body.prosecutorOfficeStatus,
    ocraStatus: req.body.ocraStatus,
    carfaxStatus: req.body.carfaxStatus,
    ministerialStatus:
      req.body.ministerialStatus,
  };

  for (const [field, value] of Object.entries(
    statusFields
  )) {
    if (!allowedStatuses.includes(value)) {
      const error = new Error(
        `${field} debe ser CLEAR, ALERT o UNKNOWN`
      );

      error.statusCode = 400;
      throw error;
    }
  }

  const data = {
    source: "REPUVE",
    schemaVersion: "1.0",

    vehicle: {
      vin: normalizeString(req.body.vin),
      plate: normalizeString(req.body.plate),
      brand: normalizeString(req.body.brand),
      model: normalizeString(req.body.model),
      year: normalizeString(req.body.year),
      version: normalizeString(req.body.version),
      class: normalizeString(req.body.vehicleClass),
      type: normalizeString(req.body.vehicleType),
      registrationCertificateNumber:
        normalizeString(
          req.body.registrationCertificateNumber
        ),
    },

    registration: {
      registeringInstitution:
        normalizeString(
          req.body.registeringInstitution
        ),

      registeringState:
        normalizeString(
          req.body.registeringState
        ),

      registeredAt:
        normalizeString(req.body.registeredAt),

      platedAt:
        normalizeString(req.body.platedAt),

      lastUpdatedAt:
        normalizeString(req.body.lastUpdatedAt),

      registrationFolio:
        normalizeString(
          req.body.registrationFolio
        ),

      observations:
        normalizeString(req.body.observations),
    },

    query: {
      queriedAt:
        normalizeString(req.body.queriedAt),
    },

    legalStatus: {
      prosecutorOffice: {
        status:
          req.body.prosecutorOfficeStatus,

        rawText:
          normalizeString(
            req.body.prosecutorOfficeText
          ),
      },

      ocra: {
        status: req.body.ocraStatus,

        rawText:
          normalizeString(req.body.ocraText),
      },

      carfaxNorthAmerica: {
        status: req.body.carfaxStatus,

        rawText:
          normalizeString(req.body.carfaxText),
      },

      ministerialJudicialNotices: {
        status: req.body.ministerialStatus,

        rawText:
          normalizeString(
            req.body.ministerialText
          ),
      },
    },

    capture: {
      mode: "EXECUTIVE_CONFIRMED",
      capturedBy: req.user.id,
      capturedAt: new Date().toISOString(),
    },
  };

  const existingEvidence =
    investigation.evidences.find(
      (evidence) =>
        evidence.type === "REPUVE_RESULT"
    );

  const evidence = existingEvidence
    ? await prisma.evidence.update({
        where: {
          id: existingEvidence.id,
        },

        data: {
          artifactId: repuveArtifact.id,
          source: "EXECUTIVE_VALIDATION",
          data,
          extractionStatus: "COMPLETED",
          confidence: 1,
          extractor:
            "manual-repuve-validation-v1",
          extractedAt: new Date(),
          createdById: req.user.id,
        },
      })
    : await prisma.evidence.create({
        data: {
          checkId: investigation.checkId,
          investigationId:
            investigation.id,
          artifactId: repuveArtifact.id,

          source: "EXECUTIVE_VALIDATION",
          type: "REPUVE_RESULT",
          data,

          extractionStatus: "COMPLETED",
          confidence: 1,
          extractor:
            "manual-repuve-validation-v1",
          extractedAt: new Date(),
          createdById: req.user.id,
        },
      });

  await prisma.artifact.update({
    where: {
      id: repuveArtifact.id,
    },

    data: {
      processingStatus: "PROCESSED",
      processingError: null,
    },
  });

  return res.json(evidence);
})
);


  return router;
}

module.exports = createRouter;
