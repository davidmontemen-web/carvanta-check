const express = require("express");
const { prisma } = require("../../lib/prisma");
const { authMiddleware } = require("../../middleware/auth");
const { asyncHandler, normalizeString, requireFields } = require("../../utils/http");
const { findInvestigationOrFail, validateInvestigationOwnership } = require("../../utils/entities");

function createRouter({ artifactUpload, removeFileIfExists }) {
  const router = express.Router();

/* ------------------------------------------------------------------------ */
/* Cargar artifact                                                          */
/* ------------------------------------------------------------------------ */

router.post(
  "/investigations/:id/artifacts",
  authMiddleware,
  artifactUpload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      const investigation =
        await findInvestigationOrFail(
          req.params.id,
          {
            include: {
              check: true,
            },
          }
        );

      validateInvestigationOwnership(
        investigation,
        req.user.id
      );

      if (
        investigation.status !== "IN_PROGRESS"
      ) {
        const error = new Error(
          "La investigación ya no acepta nuevos artifacts"
        );

        error.statusCode = 409;
        throw error;
      }

      if (!req.file) {
        const error = new Error(
          "Debes seleccionar un archivo"
        );

        error.statusCode = 400;
        throw error;
      }

      requireFields(req.body, ["type"]);

      const artifact =
        await prisma.artifact.create({
          data: {
            investigationId: investigation.id,

            source:
              normalizeString(req.body.source) ||
              "EXECUTIVE",

            type: normalizeString(req.body.type),

            originalName: req.file.originalname,
            storedName: req.file.filename,

            filePath:
              `/uploads/investigations/${req.file.filename}`,

            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,

            uploadedById: req.user.id,

            processingStatus: "PENDING",
          },
        });

      return res.status(201).json(artifact);
    } catch (error) {
      if (req.file?.path) {
        removeFileIfExists(req.file.path);
      }

      throw error;
    }
  })
);

/* ------------------------------------------------------------------------ */
/* Listar artifacts                                                         */
/* ------------------------------------------------------------------------ */

router.get(
  "/investigations/:id/artifacts",
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

    const artifacts =
      await prisma.artifact.findMany({
        where: {
          investigationId: investigation.id,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json(artifacts);
  })
);

  return router;
}

module.exports = createRouter;
