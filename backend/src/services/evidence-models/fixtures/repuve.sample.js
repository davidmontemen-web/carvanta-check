const { REPUVE_STATUS } = require("../repuve.model");

module.exports = {
  source: "REPUVE",
  schemaVersion: "1.0",

  vehicle: {
    brand: "VOLKSWAGEN",
    model: "TAOS",
    year: "2025",
    class: "SUV",
    type: "AUTOMOVIL",
    vin: "3VV9P6B20SM005012",
    registrationCertificateNumber: "Y79EA3MC",
    plate: "UAN361B",
    doors: "4 PUERTAS",
    countryOfOrigin: "MEXICO",
    version: "TAOS 1.4 LTS TSI AUTOMATICO TRA",
    displacement: "1398 CC",
    cylinders: "4 CILINDROS",
    axles: "DOS EJES",
    assemblyPlant: "AUTOPISTA MEXICO PUEBLA KM 116, PUEBLA",
  },

  registration: {
    registeringInstitution: "VOLKSWAGEN DE MEXICO S.A. DE C.V.",
    registeredAt: "2024-11-14",
    registeredTime: "08:15:33",
    registeringState: "PUEBLA",
    platedAt: "2024-12-10",
    lastUpdatedAt: "2024-12-23",
    registrationFolio: "28611819",
    observations: "200292644",
  },

  query: {
    queriedAt: "2026-07-14T21:38:19-06:00",
  },

  legalStatus: {
    prosecutorOffice: {
      status: REPUVE_STATUS.CLEAR,
      rawText: "NIV Sin reporte Robo",
    },

    ocra: {
      status: REPUVE_STATUS.CLEAR,
      rawText: "NIV sin ROBO.",
    },

    carfaxNorthAmerica: {
      status: REPUVE_STATUS.CLEAR,
      rawText: "NIV sin REPORTE DE ROBO",
    },

    ministerialJudicialNotices: {
      status: REPUVE_STATUS.CLEAR,
      rawText: "El vehículo no cuenta con delito diverso.",
    },
  },

  extraction: {
    confidence: 1,
    warnings: [
      "Datos cargados manualmente desde el PDF de prueba; OCR aún no conectado.",
    ],
  },
};