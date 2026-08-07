const express = require("express");

const {
  authMiddleware,
} = require("../../middleware/auth");

const {
  asyncHandler,
} = require("../../utils/http");

const {
  findInvestigationOrFail,
  validateInvestigationOwnership,
} = require("../../utils/entities");

const {
  extractRapiArtifact,
} = require(
  "../../services/rapi/extractor/rapi-extractor.service"
);

const {
  normalizeRapiInvestigation,
} = require(
  "../../services/rapi/normalizer/rapi-normalizer.service"
);

const {
  investigateRapiInvestigation,
} = require(
  "../../services/rapi/investigator/rapi-investigator.service"
);

const {
  dictateRapiInvestigation,
} = require(
  "../../services/rapi/dictator/rapi-dictator.service"
);

function createRouter() {
  const router = express.Router();

  router.post(
    "/investigations/:id/rapi-extract",
    authMiddleware,

    asyncHandler(
      async (req, res) => {
        const investigation =
          await findInvestigationOrFail(
            req.params.id
          );

        validateInvestigationOwnership(
          investigation,
          req.user.id
        );

        if (
          investigation.status !==
          "IN_PROGRESS"
        ) {
          const error = new Error(
            "La investigación ya no acepta procesamiento de RAPI"
          );

          error.statusCode = 409;
          throw error;
        }

        const artifactId = String(
          req.body.artifactId || ""
        ).trim();

        if (!artifactId) {
          const error = new Error(
            "El campo artifactId es obligatorio"
          );

          error.statusCode = 400;
          throw error;
        }

        const result =
          await extractRapiArtifact({
            investigationId:
              investigation.id,

            artifactId,

            userId:
              req.user.id,
          });

        return res.json(result);
      }
    )
  );

  router.post(
  "/investigations/:id/rapi-normalize",
  authMiddleware,

  asyncHandler(
    async (req, res) => {
      const investigation =
        await findInvestigationOrFail(
          req.params.id
        );

      validateInvestigationOwnership(
        investigation,
        req.user.id
      );

      if (
        investigation.status !==
        "IN_PROGRESS"
      ) {
        const error = new Error(
          "La investigación ya no acepta procesamiento de RAPI"
        );

        error.statusCode = 409;
        throw error;
      }

      const result =
        await normalizeRapiInvestigation({
          investigationId:
            investigation.id,

          userId:
            req.user.id,
        });

      return res.json(result);
    }
  )
);

router.post(
  "/investigations/:id/rapi-investigate",
  authMiddleware,

  asyncHandler(
    async (req, res) => {
      const investigation =
        await findInvestigationOrFail(
          req.params.id
        );

      validateInvestigationOwnership(
        investigation,
        req.user.id
      );

      if (
        investigation.status !==
        "IN_PROGRESS"
      ) {
        const error = new Error(
          "La investigación ya no acepta procesamiento de RAPI"
        );

        error.statusCode = 409;
        throw error;
      }

      const normalizedEvidenceId =
        String(
          req.body
            .normalizedEvidenceId ||
            ""
        ).trim() || null;

      const result =
        await investigateRapiInvestigation({
          investigationId:
            investigation.id,

          normalizedEvidenceId,

          userId:
            req.user.id,
        });

      return res.json(result);
    }
  )
);

router.post(
  "/investigations/:id/rapi-dictate",
  authMiddleware,

  asyncHandler(
    async (req, res) => {
      const investigation =
        await findInvestigationOrFail(
          req.params.id
        );

      validateInvestigationOwnership(
        investigation,
        req.user.id
      );

      if (
        investigation.status !==
        "IN_PROGRESS"
      ) {
        const error = new Error(
          "La investigación ya no acepta procesamiento de RAPI"
        );

        error.statusCode = 409;
        throw error;
      }

      const analysisEvidenceId =
        String(
          req.body
            ?.analysisEvidenceId ||
            ""
        ).trim() || null;

      const result =
        await dictateRapiInvestigation({
          investigationId:
            investigation.id,

          analysisEvidenceId,

          userId:
            req.user.id,
        });

      return res.json(result);
    }
  )
);

  return router;
}

module.exports = createRouter;