const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { prisma } = require("../lib/prisma");
const { JWT_SECRET } = require("../middleware/auth");
const {
  asyncHandler,
  requireFields,
} = require("../utils/http");

const router = express.Router();



router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    requireFields(req.body, ["email", "password"]);

    const email = String(req.body.email)
      .trim()
      .toLowerCase();

    const password = String(req.body.password);

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        error: "El usuario está desactivado",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.json({
      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

module.exports = router;