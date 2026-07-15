const multer = require("multer");
const jwt = require("jsonwebtoken");
const { Prisma } = require("@prisma/client");

function errorHandler(error, req, res, next) {
  console.error("[API ERROR]", {
    message: error.message,
    stack: error.stack,
    method: req.method,
    path: req.originalUrl,
  });

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "El archivo supera el límite máximo de 15 MB",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Se excedió la cantidad permitida de archivos",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error:
          error.message ||
          "Archivo o campo de archivo no permitido",
      });
    }

    return res.status(400).json({
      error:
        error.message ||
        "Error al cargar el archivo",
    });
  }

  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  ) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Ya existe un registro con esos datos",
        fields: error.meta?.target || [],
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Registro no encontrado",
      });
    }

    if (error.code === "P2003") {
      return res.status(409).json({
        error:
          "La operación viola una relación existente en la base de datos",
      });
    }

    return res.status(400).json({
      error: "Error de base de datos",
      code: error.code,
    });
  }

  if (
    error instanceof
    Prisma.PrismaClientValidationError
  ) {
    return res.status(400).json({
      error:
        "Los datos enviados no coinciden con el esquema de Prisma",
    });
  }

  if (error instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      error: "El token ha expirado",
    });
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }

  const statusCode = Number.isInteger(
    error.statusCode
  )
    ? error.statusCode
    : 500;

  return res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Ocurrió un error interno en el servidor"
        : error.message,
  });
}

module.exports = {
  errorHandler,
};