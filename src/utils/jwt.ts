import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "defaultsecret";

export function generateToken(payload: object) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret);
}
