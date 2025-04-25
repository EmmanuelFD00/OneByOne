import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultsecret");
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token requerido" });
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultsecret") as any;
      if (decoded.role !== 'ADMIN') {
        return res.status(403).json({ error: "Acceso solo para administradores" });
      }
  
      (req as any).user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }
  }
