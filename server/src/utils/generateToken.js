import jwt from "jsonwebtoken";

import { requireEnv } from "../config/env.js";

const isProduction = process.env.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, requireEnv("JWT_SECRET"), {
    expiresIn: "7d",
  });
};
