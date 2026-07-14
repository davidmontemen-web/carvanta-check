const express = require("express");

const { prisma } = require("../lib/prisma");

const router = express.Router();

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];

    return (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    );
  });

  if (missing.length > 0) {
    const error = new Error(
      `Campos obligatorios: ${missing.join(", ")}`
    );

    error.statusCode = 400;
    throw error;
  }
}

async function findCheckOrFail(checkId, options = {}) {
  const check = await prisma.check.findUnique({
    where: {
      id: checkId,
    },
    ...options,
  });

  if (!check) {
    const error = new Error("Expediente no encontrado");
    error.statusCode = 404;
    throw error;
  }

  return check;
}

function createChecksRouter({
  documentUpload,
  removeUploadedFiles,
  checkDetailInclude,
}) {
  router.post(
    "/checks",
    documentUpload.fields([
      {
        name: "tarjetaCirculacion",
        maxCount: 1,
      },
      {
        name: "facturaFrente",
        maxCount: 1,
      },
      {
        name: "facturaReverso",
        maxCount: 1,
      },
      {
        name: "documentoAdicional",
        maxCount: 1,
      },
    ]),
    asyncHandler(async (req, res) => {
      const files = req.files || {};

      try {
        requireFields(req.body, ["marca", "modelo", "anio"]);

        if (!files.tarjetaCirculacion?.[0]) {
          const error = new Error(
            "La tarjeta de circulación es obligatoria"
          );

          error.statusCode = 400;
          throw error;
        }

        const checkData = {
          marca: normalizeString(req.body.marca),
          modelo: normalizeString(req.body.modelo),
          anio: normalizeString(req.body.anio),
          version: normalizeString(req.body.version),
          placas: normalizeString(req.body.placas),
          vin: normalizeString(req.body.vin),
          vendedor: normalizeString(req.body.vendedor),
          precio: normalizeString(req.body.precio),
        };

        const documents = [];

        Object.entries(files).forEach(([type, fileArray]) => {
          const file = fileArray?.[0];

          if (!file) {
            return;
          }

          documents.push({
            type,
            fileName: file.originalname,
            filePath: `/uploads/${file.filename}`,
          });
        });

        const createdCheck = await prisma.$transaction(
          async (transaction) => {
            const check = await transaction.check.create({
              data: checkData,
            });

            if (documents.length > 0) {
              await transaction.document.createMany({
                data: documents.map((document) => ({
                  ...document,
                  checkId: check.id,
                })),
              });
            }

            return transaction.check.findUnique({
              where: {
                id: check.id,
              },

              include: {
                documents: {
                  orderBy: {
                    createdAt: "asc",
                  },
                },

                review: true,
                report: true,
              },
            });
          }
        );

        return res.status(201).json(createdCheck);
      } catch (error) {
        removeUploadedFiles(files);
        throw error;
      }
    })
  );

  router.get(
    "/checks/:id",
    asyncHandler(async (req, res) => {
      const check = await findCheckOrFail(req.params.id, {
        include: checkDetailInclude,
      });

      return res.json(check);
    })
  );

  router.patch(
    "/checks/:id/customer",
    asyncHandler(async (req, res) => {
      requireFields(req.body, [
        "nombreCliente",
        "whatsapp",
        "email",
      ]);

      await findCheckOrFail(req.params.id);

      const email = String(req.body.email)
        .trim()
        .toLowerCase();

      const updatedCheck = await prisma.check.update({
        where: {
          id: req.params.id,
        },

        data: {
          nombreCliente: normalizeString(req.body.nombreCliente),
          whatsapp: normalizeString(req.body.whatsapp),
          email,
          status: "registro_completo",
        },

        include: {
          documents: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return res.json(updatedCheck);
    })
  );

  router.patch(
    "/checks/:id/pay",
    asyncHandler(async (req, res) => {
      const existingCheck = await findCheckOrFail(
        req.params.id
      );

      if (existingCheck.status === "pagado") {
        return res.json(existingCheck);
      }

      const updatedCheck = await prisma.check.update({
        where: {
          id: req.params.id,
        },

        data: {
          status: "pagado",
        },

        include: {
          documents: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return res.json(updatedCheck);
    })
  );

  return router;
}

module.exports = createChecksRouter;