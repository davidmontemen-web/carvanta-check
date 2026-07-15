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

module.exports = {
  asyncHandler,
  normalizeString,
  requireFields,
};