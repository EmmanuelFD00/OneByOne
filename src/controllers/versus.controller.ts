import { Request, Response } from "express";
import prisma from "../config/prisma";

// Crear un duelo
export const crearDuelo = async (req: Request, res: Response) => {
  const { juego, cantidadFichas } = req.body;
  const userId = (req as any).user.id;

  if (userId?.bloqueado) {
  return res.status(403).json({ error: "Tu cuenta está bloqueada." });
  }

  if (userId?.nicknameLOL && await prisma.nicknameBloqueado.findUnique({ where: { nickname: userId.nicknameLOL } })) {
    return res.status(403).json({ error: "Tu nickname está bloqueado. No podés participar en duelos." });
  }


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

  if (userId?.bloqueado) {
  return res.status(403).json({ error: "Tu cuenta está bloqueada." });
  }

  if (userId?.nicknameLOL && await prisma.nicknameBloqueado.findUnique({ where: { nickname: userId.nicknameLOL } })) {
    return res.status(403).json({ error: "Tu nickname está bloqueado. No podés participar en duelos." });
  }

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
// URL que consulta el usuario | Resultado
// /duelos/pendientes?page=1 | Los primeros 15 duelos más viejos
// /duelos/pendientes?page=2 | Los siguientes 15 duelos
// /duelos/pendientes?page=3 | Los siguientes 15 duelos
// (etc.) | 

// Lo que devueve:
// {
//   "page": 1,
//   "pageSize": 15,
//   "totalDuelos": 125,
//   "totalPages": 9,
//   "duelos": [
//     // los 15 duelos de la página 1
//   ]
// }
export const listarPendientes = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 15;

    // Primero contar cuántos duelos hay en total
    const totalDuelos = await prisma.versus.count({
      where: { estado: "pendiente" }
    });

    // Después traer la página que nos pidieron
    const duelos = await prisma.versus.findMany({
      where: { estado: "pendiente" },
      include: {
        creador: { select: { username: true } }
      },
      orderBy: {
        creadoEn: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      page,
      pageSize,
      totalDuelos,
      totalPages: Math.ceil(totalDuelos / pageSize),
      duelos,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error al listar los duelos pendientes" });
  }
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

// URL	Qué devuelve
// /historial?page=1	Todas las partidas del usuario
// /historial?page=2&filter=ganadas	Solo las partidas ganadas, página 2
// /historial?page=1&filter=perdidas	Solo las partidas perdidas, página 1
// /historial?page=1&filter=otras	Ignora el filtro (devuelve todas)
export const historialUsuario = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  let page = parseInt(req.query.page as string);
  const filter = (req.query.filter as string)?.toLowerCase(); // 'ganadas', 'perdidas' o undefined
  const pageSize = 15;

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Armamos el filtro dinámicamente
  const whereClause: any = {
    estado: { not: "pendiente" },
    OR: [
      { creadorId: userId },
      { oponenteId: userId }
    ]
  };

  if (filter === "ganadas") {
    whereClause.ganadorId = userId;
  } else if (filter === "perdidas") {
    whereClause.AND = [
      {
        ganadorId: { not: userId }, // El ganador NO fue el usuario
      },
      {
        OR: [
          { creadorId: userId },
          { oponenteId: userId }
        ]
      }
    ];
  }

  try {
    const total = await prisma.versus.count({ where: whereClause });

    const historial = await prisma.versus.findMany({
      where: whereClause,
      orderBy: { creadoEn: "desc" },
      include: {
        creador: { select: { username: true } },
        oponente: { select: { username: true } }
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      historial,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el historial" });
  }
};



  
// Listar duelos en apelación (retenidos)
export const listarDuelosEnApelacion = async (_: Request, res: Response) => {
  try {
    const duelosEnApelacion = await prisma.versus.findMany({
      where: { estado: "retenido" },
      include: {
        creador: { select: { username: true } },
        oponente: { select: { username: true } }
      },
      orderBy: {
        creadoEn: "desc",
      },
      take: 100, // 🔥 limitar a 100 duelos
    });

    return res.json(duelosEnApelacion);
  } catch (error) {
    return res.status(500).json({ error: "Error al listar los duelos en apelación" });
  }
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
      resueltoConApelacion: true 
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


export const apelarDuelo = async (req: Request, res: Response) => {
  const dueloId = parseInt(req.params.id);
  const userId = (req as any).user.id;

  if (isNaN(dueloId)) {
    return res.status(400).json({ error: "ID de duelo inválido." });
  }

  const duelo = await prisma.versus.findUnique({ where: { id: dueloId } });

  if (!duelo) {
    return res.status(404).json({ error: "Duelo no encontrado." });
  }

  if (!duelo.oponenteId) {
    return res.status(400).json({ error: "El duelo aún no tiene oponente asignado." });
  }

  if (duelo.estado !== "pendiente") {
    return res.status(400).json({ error: "El duelo ya no está en estado pendiente." });
  }

  if (![duelo.creadorId, duelo.oponenteId].includes(userId)) {
    return res.status(403).json({ error: "No tenés permiso para apelar este duelo." });
  }

  const esCreador = userId === duelo.creadorId;
  const dataUpdate: any = {
    enApelacion: true,
    estado: "retenido",
    ...(esCreador ? { resultadoCreador: "apelación" } : { resultadoOponente: "apelación" }),
  };

  const dueloActualizado = await prisma.versus.update({
    where: { id: dueloId },
    data: dataUpdate,
  });

  return res.json({ msg: "El duelo fue puesto en apelación", duelo: dueloActualizado });
};


