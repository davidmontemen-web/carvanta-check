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
  extractTransUnionArtifact,
} = require(
  "../../services/transunion/extractor/transunion-extractor.service"
);

const {
  normalizeTransUnionInvestigation,
} = require(
  "../../services/transunion/normalizer/transunion-normalizer.service"
);

const {
  investigateTransUnion,
} = require(
  "../../services/transunion/investigator/transunion-investigator.service"
);

const {
  dictateTransUnion,
} = require(
  "../../services/transunion/dictator/transunion-dictator.service"
);


function createRouter() {
  const router = express.Router();

  router.post(
    "/investigations/:id/transunion-extract",
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
            "La investigación ya no acepta procesamiento de TransUnion"
          );

          error.statusCode = 409;
          throw error;
        }

        const artifactId = String(
          req.body?.artifactId || ""
        ).trim();

        if (!artifactId) {
          const error = new Error(
            "El campo artifactId es obligatorio"
          );

          error.statusCode = 400;
          throw error;
        }

        const result =
          await extractTransUnionArtifact({
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
  "/investigations/:id/transunion-normalize",
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
          "La investigación ya no acepta procesamiento de TransUnion"
        );

        error.statusCode = 409;
        throw error;
      }

      const rawEvidenceId =
        String(
          req.body
            ?.rawEvidenceId ||
            ""
        ).trim() || null;

      const result =
        await normalizeTransUnionInvestigation({
          investigationId:
            investigation.id,

          rawEvidenceId,

          userId:
            req.user.id,
        });

      return res.json(result);
    }
  )
);

router.post(
  "/investigations/:id/transunion-investigate",
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
          "La investigación ya no acepta procesamiento de TransUnion"
        );

        error.statusCode = 409;
        throw error;
      }

      const normalizedEvidenceId =
        String(
          req.body
            ?.normalizedEvidenceId ||
            ""
        ).trim() || null;

      const result =
        await investigateTransUnion({
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
  "/investigations/:id/transunion-dictate",
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
          "La investigación ya no acepta procesamiento de TransUnion"
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
        await dictateTransUnion({
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