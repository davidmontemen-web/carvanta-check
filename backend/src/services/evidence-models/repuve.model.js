const REPUVE_SCHEMA_VERSION = "1.0";

const REPUVE_STATUS = Object.freeze({
  CLEAR: "CLEAR",
  ALERT: "ALERT",
  UNKNOWN: "UNKNOWN",
});

function createEmptyLegalResult() {
  return {
    status: REPUVE_STATUS.UNKNOWN,
    rawText: null,
  };
}

function createEmptyRepuveEvidence() {
  return {
    source: "REPUVE",
    schemaVersion: REPUVE_SCHEMA_VERSION,

    vehicle: {
      brand: null,
      model: null,
      year: null,
      class: null,
      type: null,
      vin: null,
      registrationCertificateNumber: null,
      plate: null,
      doors: null,
      countryOfOrigin: null,
      version: null,
      displacement: null,
      cylinders: null,
      axles: null,
      assemblyPlant: null,
    },

    registration: {
      registeringInstitution: null,
      registeredAt: null,
      registeredTime: null,
      registeringState: null,
      platedAt: null,
      lastUpdatedAt: null,
      registrationFolio: null,
      observations: null,
    },

    query: {
      queriedAt: null,
    },

    legalStatus: {
      prosecutorOffice: createEmptyLegalResult(),
      ocra: createEmptyLegalResult(),
      carfaxNorthAmerica: createEmptyLegalResult(),
      ministerialJudicialNotices: createEmptyLegalResult(),
    },

    extraction: {
      confidence: null,
      warnings: [],
    },
  };
}

function validateRepuveEvidence(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["La evidencia REPUVE debe ser un objeto"],
    };
  }

  if (data.source !== "REPUVE") {
    errors.push("La fuente debe ser REPUVE");
  }

  if (!data.vehicle?.vin) {
    errors.push("No se encontró el NIV");
  }

  if (!data.query?.queriedAt) {
    errors.push("No se encontró la fecha de consulta");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  REPUVE_SCHEMA_VERSION,
  REPUVE_STATUS,
  createEmptyRepuveEvidence,
  validateRepuveEvidence,
};