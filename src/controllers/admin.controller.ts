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

  if (roleUsuario !== "ADMIN") {
    return res.status(403).json({ error: "No tenés permisos para hacer esto" });
  }

  try {
    const solicitudes = await prisma.fichaRequest.findMany({
      where: {
        tipo: "carga",
        estado: "pendiente",
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // 🔥 Limitar a 100 resultados
    });

    return res.json({
      solicitudes,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener las solicitudes" });
  }
};


export const bloquearNickname = async (req: Request, res: Response) => {
  const { nickname, juego } = req.body;
  const roleUsuario = (req as any).user.role;

  if (roleUsuario !== "ADMIN") {
    return res.status(403).json({ error: "No tenés permisos para hacer esto" });
  }

  if (!nickname || !juego) {
    return res.status(400).json({ error: "Falta el nickname o el juego" });
  }

  try {
    const existe = await prisma.nicknameBloqueado.findUnique({
      where: { nickname }
    });

    if (existe) {
      return res.status(400).json({ error: "Ese nickname ya está bloqueado" });
    }

    const nuevo = await prisma.nicknameBloqueado.create({
      data: {
        nickname,
        juego,
      },
    });

    return res.status(201).json({ message: "Nickname bloqueado correctamente", data: nuevo });
  } catch (error) {
    return res.status(500).json({ error: "Error al bloquear el nickname" });
  }
};

export const bloquearUsuario = async (req: Request, res: Response) => {
  const { userId } = req.body;
  const roleUsuario = (req as any).user.role;

  if (roleUsuario !== "ADMIN") {
    return res.status(403).json({ error: "No tenés permisos para hacer esto" });
  }

  try {
    const usuario = await prisma.user.update({
      where: { id: userId },
      data: { estaBloqueado: true }
    });

    return res.json({ message: "Usuario bloqueado correctamente", user: usuario });
  } catch (error) {
    return res.status(500).json({ error: "Error al bloquear el usuario" });
  }
};
