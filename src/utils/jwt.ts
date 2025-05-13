import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "defaultsecret";
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || "refreshsecret";

export function generateAccessToken(payload: object) {
  return jwt.sign(payload, secret, { expiresIn: "15m" }); // Access corto
}

export function generateRefreshToken(payload: object) {
  return jwt.sign(payload, refreshSecret, { expiresIn: "7d" }); // Refresh largo
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, secret);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret);
}
