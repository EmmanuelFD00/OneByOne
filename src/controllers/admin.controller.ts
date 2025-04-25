import { Request, Response } from "express";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";

export const crearUsuarioAdmin = async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  const roleUsuario = (req as any).user.role;

  if (roleUsuario !== "ADMIN") {
    return res.status(403).json({ error: "No tenés permisos para hacer esto" });
  }

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) {
    return res.status(400).json({ error: "Ya existe un usuario con ese email" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const nuevoAdmin = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      role: "ADMIN",
      fichas: 0,
    },
  });

  return res.status(201).json({
    msg: "Usuario admin creado",
    id: nuevoAdmin.id,
    email: nuevoAdmin.email,
    role: nuevoAdmin.role,
  });
};


// Ver las solicitudes de carga de fichas
export const verSolicitudesDeCarga = async (req: Request, res: Response) => {
    const roleUsuario = (req as any).user.role;
  
    // Verificamos si el usuario tiene permisos de admin
    if (roleUsuario !== "ADMIN") {
      return res.status(403).json({ error: "No tenés permisos para hacer esto" });
    }
  
    try {
      // Obtener todas las solicitudes de tipo "carga" que estén pendientes
      const solicitudes = await prisma.fichaRequest.findMany({
        where: {
          tipo: "carga", // Filtramos solo las solicitudes de tipo "carga"
          estado: "pendiente", // Solo las solicitudes de carga que están pendientes
        },
        include: {
          user: true, // Incluir la información del usuario que hizo la solicitud
        },
        orderBy: {
          createdAt: "desc", // Ordenamos las solicitudes por la fecha de creación
        },
      });
  
      return res.json({
        solicitudes,
      });
    } catch (error) {
      return res.status(500).json({ error: "Error al obtener las solicitudes" });
    }
  };