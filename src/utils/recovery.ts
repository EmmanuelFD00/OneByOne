import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "defaultsecret";

export function generatePasswordResetToken(userId: string) {
  return jwt.sign({ id: userId }, secret, { expiresIn: "15m" });
}

export function verifyPasswordResetToken(token: string) {
  return jwt.verify(token, secret) as { id: string };
}
