import { Request, Response } from "express";
import prisma from "../config/prisma";



// RUTA:
// GET /usuarios/:id

// Ejemplos:

// Si un usuario normal con id = 5 hace GET /usuarios/5 → ✅ OK

// Si ese usuario normal hace GET /usuarios/8 → ❌ Error 403

// Si un admin hace GET /usuarios/5 o GET /usuarios/8 → ✅ OK
export const obtenerPerfilUsuario = async (req: Request, res: Response) => {
    const userIdToken = (req as any).user.id;
    const roleUsuario = (req as any).user.role;
    const idConsultado = parseInt(req.params.id);
  
    if (isNaN(idConsultado)) {
      return res.status(400).json({ error: "ID inválido" });
    }
  
    // Verificamos permisos
    if (roleUsuario !== "ADMIN" && userIdToken !== idConsultado) {
      return res.status(403).json({ error: "No tenés permiso para ver este usuario" });
    }
  
    try {
      // Buscamos los datos básicos del usuario
      const usuario = await prisma.user.findUnique({
        where: { id: idConsultado },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          fichas: true,
          createdAt: true,
        }
      });
  
      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
  
      // Buscamos las estadísticas de duelos
      const duelosGanados = await prisma.versus.count({
        where: { ganadorId: idConsultado }
      });
  
      const duelosPerdidos = await prisma.versus.count({
        where: {
          estado: { not: "pendiente" },
          ganadorId: { not: idConsultado },
          OR: [
            { creadorId: idConsultado },
            { oponenteId: idConsultado }
          ]
        }
      });
  
      const apelaciones = await prisma.versus.count({
        where: {
          resueltoConApelacion: true,
          OR: [
            { creadorId: idConsultado },
            { oponenteId: idConsultado }
          ]
        }
      });
  
      // Devolvemos todo junto
      res.json({
        usuario,
        estadisticas: {
          duelosGanados,
          duelosPerdidos,
          apelaciones
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al obtener el perfil del usuario" });
    }
  };
  


export const actualizarUsername = async (req: Request, res: Response) => {
    const userId = (req as any).user.id; // ID del usuario autenticado
    const nuevoUsername = req.body.username?.trim();
  
    // Validación básica
    if (!nuevoUsername || nuevoUsername.length < 3 || nuevoUsername.length > 20) {
      return res.status(400).json({ error: "El nombre de usuario debe tener entre 3 y 20 caracteres." });
    }
  
    // Verificar si ya existe ese username
    const existente = await prisma.user.findFirst({
      where: { username: nuevoUsername }
    });
    
  
    if (existente && existente.id !== userId) {
      return res.status(400).json({ error: "Ese nombre de usuario ya está en uso." });
    }
  
    try {
      // Actualizar el username
      await prisma.user.update({
        where: { id: userId },
        data: { username: nuevoUsername }
      });
  
      return res.json({ message: "Nombre de usuario actualizado correctamente." });
  
    } catch (error) {
      console.error("Error al actualizar username:", error);
      return res.status(500).json({ error: "Hubo un problema al actualizar el nombre de usuario." });
    }
  };


  export const asignarNicknameLOL = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    let nuevoNickname = req.body.nicknameLOL?.trim();
  
    // Sanitizar el nickname: eliminar caracteres no alfanuméricos (excepto guiones bajos y guiones)
    if (nuevoNickname) {
      nuevoNickname = nuevoNickname.replace(/[^a-zA-Z0-9_-]/g, ''); // Permite solo letras, números, guiones bajos y guiones
    }
  
    // Validación básica
    if (!nuevoNickname || nuevoNickname.length < 3 || nuevoNickname.length > 20) {
      return res.status(400).json({ error: "El nickname debe tener entre 3 y 20 caracteres." });
    }
  
    try {
      // Verificar si el nickname está bloqueado en la tabla NicknameBloqueado
      const nicknameBloqueado = await prisma.nicknameBloqueado.findUnique({
        where: { nickname: nuevoNickname }
      });
  
      if (nicknameBloqueado) {
        return res.status(400).json({ error: "Este nickname está bloqueado y no se puede usar." });
      }
  
      // Verificar si el nickname ya está en uso
      const existente = await prisma.user.findFirst({
        where: { nicknameLOL: nuevoNickname }
      });
  
      if (existente && existente.id !== userId) {
        return res.status(400).json({ error: "Ese nickname de LoL ya está en uso." });
      }
  
      // Verificar si el usuario ya ha editado su nickname
      const usuario = await prisma.user.findUnique({
        where: { id: userId },
      });
  
      if (usuario?.nicknameEditadoLOL) {
        return res.status(400).json({ error: "El nickname de LoL solo puede ser editado una vez." });
      }
  
      // Actualizar el nickname en la base de datos y marcarlo como editado
      await prisma.user.update({
        where: { id: userId },
        data: { 
          nicknameLOL: nuevoNickname,
          nicknameEditadoLOL: true, // Marcamos que el nickname fue editado
        }
      });
  
      return res.json({ message: "Nickname de LoL asignado correctamente." });
    } catch (error) {
      console.error("Error al asignar nicknameLOL:", error);
      return res.status(500).json({ error: "Hubo un problema al asignar el nickname de LoL." });
    }
  };