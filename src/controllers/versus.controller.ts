import { Request, Response } from "express";
import prisma from "../config/prisma";

// Crear un duelo
export const crearDuelo = async (req: Request, res: Response) => {
  const { juego, cantidadFichas } = req.body;
  const userId = (req as any).user.id;

  // Validación básica
  if (!juego || typeof cantidadFichas !== "number" || isNaN(cantidadFichas) || cantidadFichas <= 0) {
    return res.status(400).json({ error: "Datos inválidos. Revisá el juego y la cantidad de fichas." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.fichas < cantidadFichas) {
    return res.status(400).json({ error: "No tenés suficientes fichas" });
  }

  // Verificar si el usuario ya tiene un duelo en estado "en_juego" o "pendiente"
  const dueloExistente = await prisma.versus.findFirst({
    where: {
      OR: [
        { creadorId: userId, estado: { in: ["en_juego", "pendiente"] } },
        { oponenteId: userId, estado: { in: ["en_juego", "pendiente"] } },
      ],
    },
  });

  if (dueloExistente) {
    return res.status(400).json({ error: "Ya tenés un duelo en juego o pendiente." });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { fichas: { decrement: cantidadFichas } },
  });

  const duelo = await prisma.versus.create({
    data: {
      juego,
      cantidadFichas,
      creadorId: userId,
    },
  });

  return res.status(201).json(duelo);
};

// Aceptar un duelo
export const aceptarDuelo = async (req: Request, res: Response) => {
  const { dueloId } = req.body;
  const userId = (req as any).user.id;

  const duelo = await prisma.versus.findUnique({ where: { id: dueloId } });
  if (!duelo || duelo.oponenteId) {
    return res.status(404).json({ error: "Duelo no disponible" });
  }

  // Verificar si el usuario ya tiene un duelo en estado "en_juego" o "pendiente"
  const dueloExistente = await prisma.versus.findFirst({
    where: {
      OR: [
        { creadorId: userId, estado: { in: ["en_juego", "pendiente"] } },
        { oponenteId: userId, estado: { in: ["en_juego", "pendiente"] } },
      ],
    },
  });

  if (dueloExistente) {
    return res.status(400).json({ error: "Ya tenés un duelo en juego o pendiente." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.fichas < duelo.cantidadFichas) {
    return res.status(400).json({ error: "No tenés suficientes fichas" });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { fichas: { decrement: duelo.cantidadFichas } },
  });

  const dueloActualizado = await prisma.versus.update({
    where: { id: dueloId },
    data: {
      oponenteId: userId,
      estado: "en_juego",
    },
  });

  return res.json(dueloActualizado);
};

// Listar duelos pendientes (sin oponente aún)
export const listarPendientes = async (_: Request, res: Response) => {
  const duelos = await prisma.versus.findMany({
    where: { estado: "pendiente" },
    include: {
      creador: { select: { username: true } }
    },
  });

  return res.json(duelos);
};

export const declararResultado = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { dueloId, resultado } = req.body; // "gané", "perdí", "apelación"
  
    const duelo = await prisma.versus.findUnique({ where: { id: dueloId } });
    if (!duelo || duelo.estado !== "en_juego") {
      return res.status(400).json({ error: "Duelo inválido o no en juego" });
    }
  
    let updatedData: any = {};
  
    if (duelo.creadorId === userId) {
      updatedData.resultadoCreador = resultado;
    } else if (duelo.oponenteId === userId) {
      updatedData.resultadoOponente = resultado;
    } else {
      return res.status(403).json({ error: "No pertenecés a este duelo" });
    }
  
    const updated = await prisma.versus.update({
      where: { id: dueloId },
      data: updatedData,
    });
  
    await manejarResultadoAutomatico(updated);
  
    return res.json({ msg: "Resultado cargado", updated });
};
  

async function manejarResultadoAutomatico(duelo: any) {
    const { resultadoCreador, resultadoOponente, creadorId, oponenteId, cantidadFichas, id } = duelo;
  
    // No hacer nada si faltan resultados
    if (!resultadoCreador || !resultadoOponente) return;
  
    if (resultadoCreador === "gané" && resultadoOponente === "perdí") {
      await pagarGanador(creadorId, cantidadFichas * 2, id);
    } else if (resultadoCreador === "perdí" && resultadoOponente === "gané") {
      await pagarGanador(oponenteId, cantidadFichas * 2, id);
    } else if (resultadoCreador === "gané" && resultadoOponente === "gané") {
      await prisma.versus.update({
        where: { id },
        data: { enApelacion: true, estado: "retenido" },
      });
    } else if (resultadoCreador === "apelación" || resultadoOponente === "apelación") {
      await prisma.versus.update({
        where: { id },
        data: { enApelacion: true, estado: "retenido" },
      });
    } else {
      // Caso empate o doble perdedor => repartir
      await prisma.user.updateMany({
        where: { id: { in: [creadorId, oponenteId] } },
        data: { fichas: { increment: cantidadFichas } },
      });
  
      await prisma.versus.update({
        where: { id },
        data: { resultadoConfirmado: true, estado: "finalizado" },
      });
    }
}
  
async function pagarGanador(userId: number, cantidad: number, dueloId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { fichas: { increment: cantidad } },
    });
  
    await prisma.versus.update({
      where: { id: dueloId },
      data: {
        resultadoConfirmado: true,
        estado: "finalizado",
        ganadorId: userId,
      },
    });
}

export const historialUsuario = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
  
    const historial = await prisma.versus.findMany({
      where: {
        estado: { not: "pendiente" },
        OR: [
          { creadorId: userId },
          { oponenteId: userId }
        ]
      },
      orderBy: { creadoEn: "desc" },
      include: {
        creador: { select: { username: true } },
        oponente: { select: { username: true } }
      }
    });
  
    res.json(historial);
  };
  
// Listar duelos en apelación (retenidos)
export const listarDuelosEnApelacion = async (_: Request, res: Response) => {
  const duelosEnApelacion = await prisma.versus.findMany({
    where: { estado: "retenido" },
    include: {
      creador: { select: { username: true } },
      oponente: { select: { username: true } }
    },
  });

  return res.json(duelosEnApelacion);
};


// Decidir el ganador de un duelo en apelación
export const decidirGanador = async (req: Request, res: Response) => {
  const { dueloId, ganadorId } = req.body;  // El administrador debe enviar el ID del duelo y el ID del ganador
  const userId = (req as any).user.id;  // ID del administrador

  // Verificar que el usuario que hace la solicitud es un administrador (si es necesario)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Acceso denegado. Solo los administradores pueden decidir el ganador." });
  }

  // Buscar el duelo en apelación
  const duelo = await prisma.versus.findUnique({ where: { id: dueloId } });
  if (!duelo || duelo.estado !== "retenido") {
    return res.status(400).json({ error: "El duelo no está en apelación o no existe." });
  }

  // Verificar que el ganador proporcionado sea uno de los dos participantes
  if (![duelo.creadorId, duelo.oponenteId].includes(ganadorId)) {
    return res.status(400).json({ error: "El ganador debe ser uno de los participantes del duelo." });
  }

  // Actualizar el duelo con el ganador y finalizarlo
  const updatedDuelo = await prisma.versus.update({
    where: { id: dueloId },
    data: {
      ganadorId,
      estado: "finalizado",  // El duelo ya terminó
      resultadoConfirmado: true,  // Confirmar el resultado
      enApelacion: false,  // Marcar como no en apelación
    },
  });

  // Recompensar al ganador
  const cantidadFichas = duelo.cantidadFichas * 2;  // El ganador recibe el doble de fichas
  await prisma.user.update({
    where: { id: ganadorId },
    data: { fichas: { increment: cantidadFichas } },
  });

  return res.json({ message: "El ganador ha sido decidido y el duelo finalizado.", duelo: updatedDuelo });
};