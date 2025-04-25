import { Request, Response } from "express";
import prisma from '../config/prisma';


// 👉 Para cuando un usuario solicita carga o retiro de fichas
export const solicitarFichas = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { tipo, cantidad } = req.body;

  if (!["carga", "retiro"].includes(tipo)) {
    return res.status(400).json({ error: "Tipo inválido" });
  }

  const request = await prisma.fichaRequest.create({
    data: {
      tipo,
      cantidad,
      userId,
    },
  });

  return res.json({ msg: `Solicitud de ${tipo} creada`, request });
};

// 👉 Para cuando un admin aprueba o rechaza la solicitud
export const aprobarSolicitud = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { accion } = req.body; // puede ser "aprobar" o "rechazar"

  const solicitud = await prisma.fichaRequest.findUnique({
    where: { id: parseInt(id) },
    include: { user: true },
  });

  if (!solicitud || solicitud.estado !== "pendiente") {
    return res.status(404).json({ error: "Solicitud no válida" });
  }

  // Si se aprueba, se modifican las fichas del usuario
  if (accion === "aprobar") {
    const delta = solicitud.tipo === "carga" ? solicitud.cantidad : -solicitud.cantidad;
    await prisma.user.update({
      where: { id: solicitud.userId },
      data: { fichas: { increment: delta } },
    });
  }

  const updated = await prisma.fichaRequest.update({
    where: { id: parseInt(id) },
    data: { estado: accion },
  });

  return res.json({ msg: `Solicitud ${accion}a`, updated });
};
