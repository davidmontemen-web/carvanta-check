const express = require("express");


const { prisma } = require("../lib/prisma");
const {
  decodeVin,
} = require("../services/vinDecoder.service");

const {
  asyncHandler,
  normalizeString,
  requireFields,
} = require("../utils/http");

const {
  findCheckOrFail,
} = require("../utils/entities");

const router = express.Router();


function normalizeVin(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  return normalized || null;
}

function validateVin(value) {
  const vin = normalizeVin(value);

  if (!vin) {
    const error = new Error("El VIN / NIV es obligatorio");
    error.statusCode = 400;
    throw error;
  }

  if (vin.length !== 17) {
    const error = new Error(
      "El VIN / NIV debe contener exactamente 17 caracteres"
    );
    error.statusCode = 400;
    throw error;
  }

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    const error = new Error(
      "El VIN / NIV contiene caracteres inválidos"
    );
    error.statusCode = 400;
    throw error;
  }

  return vin;
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
      const vin = validateVin(req.body.vin);

      const vinInfo = await decodeVin(vin);



      const decodedVehicle = vinInfo.vehicle || {};

const checkData = {
  vin,
  marca:
    normalizeString(req.body.marca) ||
    normalizeString(decodedVehicle.marca),

  modelo:
    normalizeString(req.body.modelo) ||
    normalizeString(decodedVehicle.modelo),

  anio:
  normalizeString(req.body.anio) ||
  (decodedVehicle.anio
    ? String(decodedVehicle.anio)
    : null),

  version: normalizeString(req.body.version),
  placas: normalizeString(req.body.placas),
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
  /* -------------------------------------------------------------------------- */
/* Seguimiento público del expediente                                         */
/* -------------------------------------------------------------------------- */

router.get(
  "/checks/:id/status",
  asyncHandler(async (req, res) => {
    const check = await findCheckOrFail(req.params.id, {
      include: {
        report: true,

        investigation: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    const statusMap = {
      expediente_creado: {
        label: "Expediente creado",
        stage: "RECEIVED",
      },

      registro_completo: {
        label: "Registro completo",
        stage: "RECEIVED",
      },

      pagado: {
        label: "Recibido",
        stage: "RECEIVED",
      },

      PAGADO: {
        label: "Recibido",
        stage: "RECEIVED",
      },

      EN_INVESTIGACION: {
        label: "En investigación",
        stage: "INVESTIGATION",
      },

      INVESTIGACION_COMPLETA: {
        label: "En revisión",
        stage: "REVIEW",
      },

      reporte_generado: {
        label: "Reporte en revisión",
        stage: "REVIEW",
      },

      REPORTE_LISTO: {
        label: "Reporte listo",
        stage: "READY",
      },

      ENTREGADO: {
        label: "Reporte entregado",
        stage: "READY",
      },
    };

    const status =
      statusMap[check.status] || {
        label: "En proceso",
        stage: "PROCESSING",
      };

    const reportReady = [
  "reporte_generado",
  "REPORTE_LISTO",
  "ENTREGADO",
].includes(check.status);

    return res.json({
      id: check.id,
      folio: check.folio,
      vehicle: {
        brand: check.marca,
        model: check.modelo,
        year: check.anio,
        vin: check.vin,
      },

      status: check.status,
      statusLabel: status.label,
      stage: status.stage,

      estimatedDelivery:
        reportReady
          ? "Disponible"
          : "24 a 48 horas",

      reportReady,

      investigation: check.investigation,

      report:
        reportReady && check.report
          ? {
              id: check.report.id,
              quality: check.report.quality,
              riskLevel:
                check.report.riskLevel,
              alerts: check.report.alerts,
              recommendation:
                check.report.recommendation,
              summary:
                check.report.summary,
              createdAt:
                check.report.createdAt,
            }
          : null,
    });
  })
);

  /* -------------------------------------------------------------------------- */
  /* Reporte público sanitizado                                                  */
  /* -------------------------------------------------------------------------- */

  router.get(
    "/checks/:id/report",
    asyncHandler(async (req, res) => {
      const check = await findCheckOrFail(req.params.id, {
        include: {
          report: true,
          investigation: {
            include: {
              evidences: {
                where: {
                  type: "REPUVE_REPORT",
                  extractionStatus: "COMPLETED",
                },
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      const reportReady = [
  "reporte_generado",
  "REPORTE_LISTO",
  "ENTREGADO",
].includes(check.status);

      if (!reportReady || !check.report) {
        const error = new Error(
          "El reporte todavía no está disponible"
        );
        error.statusCode = 409;
        throw error;
      }

      const repuveEvidence =
        check.investigation?.evidences?.[0] || null;
      const repuve = repuveEvidence?.data || null;

      return res.json({
        id: check.id,
        folio: check.folio || check.id,
        status: check.status,
        createdAt: check.createdAt,
        vehicle: {
          brand: check.marca,
          model: check.modelo,
          year: check.anio,
          version: check.version,
          vin: check.vin,
          plate: check.placas,
        },
        report: {
          id: check.report.id,
          quality: check.report.quality,
          riskLevel: check.report.riskLevel,
          alerts: check.report.alerts,
          recommendation: check.report.recommendation,
          summary: check.report.summary,
          createdAt: check.report.createdAt,
        },
        repuve: repuve
          ? {
              verdict: repuve.verdict || null,
              trustIndex: repuve.trustIndex || null,
              executiveSummary:
                repuve.executiveSummary ||
                repuve.preview?.summary ||
                check.report.summary,
              findings: Array.isArray(repuve.findings)
                ? repuve.findings
                : [],
              recommendations: Array.isArray(
                repuve.recommendations
              )
                ? repuve.recommendations
                : [],
              nextSteps: Array.isArray(repuve.nextSteps)
                ? repuve.nextSteps
                : [],
              transparency: repuve.transparency || null,
              disclaimer: repuve.disclaimer || null,
            }
          : null,
      });
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