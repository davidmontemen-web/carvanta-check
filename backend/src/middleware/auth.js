const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.warn(
    "[WARN] JWT_SECRET no está configurado. Define esta variable antes de producción."
  );
}

const JWT_SECRET =
  process.env.JWT_SECRET || "carvanta_secret_dev";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token requerido",
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Formato de autorización inválido",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    req.user = payload;

    return next();
  } catch {
    return res.status(401).json({
      error: "Token inválido o expirado",
    });
  }
}

function requireRoles(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: "Usuario no autenticado",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción",
      });
    }

    return next();
  };
}

module.exports = {
  JWT_SECRET,
  authMiddleware,
  requireRoles,
};