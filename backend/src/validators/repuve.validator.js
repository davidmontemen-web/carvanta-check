const {
  REPUVE_RESULTS,
} = require("../services/repuve/repuve.constants");

const ALLOWED_STATUS_VALUES = [
  "CLEAR",
  "ALERT",
  "UNKNOWN",
];

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateAllowedStatus(field, value) {
  if (!ALLOWED_STATUS_VALUES.includes(value)) {
    throw createHttpError(
      `${field} debe ser CLEAR, ALERT o UNKNOWN`
    );
  }
}

function resolveRepuveResult(body = {}) {
  const statuses = [
    body.prosecutorOfficeStatus,
    body.ocraStatus,
    body.carfaxStatus,
    body.ministerialStatus,
  ];

  if (statuses.includes("ALERT")) {
    return REPUVE_RESULTS.THEFT_REPORT;
  }

  if (statuses.every((status) => status === "CLEAR")) {
    return REPUVE_RESULTS.NO_THEFT_REPORT;
  }

  if (statuses.every((status) => status === "UNKNOWN")) {
    return REPUVE_RESULTS.NOT_FOUND;
  }

  return REPUVE_RESULTS.OTHER;
}

function validateRepuvePayload(body = {}) {
  const requiredFields = [
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
  ];

  for (const field of requiredFields) {
    const value = body[field];

    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      throw createHttpError(
        `El campo ${field} es obligatorio`
      );
    }
  }

  validateAllowedStatus(
    "prosecutorOfficeStatus",
    body.prosecutorOfficeStatus
  );
  validateAllowedStatus(
    "ocraStatus",
    body.ocraStatus
  );
  validateAllowedStatus(
    "carfaxStatus",
    body.carfaxStatus
  );
  validateAllowedStatus(
    "ministerialStatus",
    body.ministerialStatus
  );

  const queriedAt = new Date(body.queriedAt);

  if (Number.isNaN(queriedAt.getTime())) {
    throw createHttpError(
      "queriedAt debe contener una fecha válida"
    );
  }

  return {
    result: resolveRepuveResult(body),
  };
}

module.exports = {
  ALLOWED_STATUS_VALUES,
  resolveRepuveResult,
  validateRepuvePayload,
};
