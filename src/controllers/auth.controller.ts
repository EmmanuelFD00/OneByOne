import { Request, Response } from "express";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt";

export const register = async (req: Request, res: Response): Promise<Response> => {
  const { email, password, username } = req.body;

  try {
    // Verificamos si ya existe un usuario con el mismo email o username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },     // Verifica si el email ya existe
          { username },  // Verifica si el username ya existe
        ],
      },
    });

    if (existingUser) {
      // Si ya existe, devolvemos un error indicando cuál de los dos ya está en uso
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Ya existe un usuario con ese email" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Ya existe un usuario con ese username" });
      }
    }

    // Si no existe ningún usuario con ese email o username, creamos el nuevo usuario
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
      },
    });

    return res.status(201).json({
      message: "Usuario creado",
      user: { email: user.email, username: user.username },
    });

  } catch (err) {
    return res.status(500).json({ error: "Error al crear el usuario" });
  }
};


export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = generateToken({ id: user.id, role: user.role });
  return res.json({ token, user: { email: user.email, username: user.username, role: user.role } });
};
