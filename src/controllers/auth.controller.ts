import { Request, Response } from "express";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { generatePasswordResetToken, verifyPasswordResetToken } from "../utils/recovery";
import { transporter } from "../utils/mailer";
import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET || "default_secret";
const dominio = process.env.DOMINIO;
const mail_validaciones = process.env.MAIL_VALIDACIONES_WEB



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
    
    const emailToken = jwt.sign({ id: user.id }, secret, { expiresIn: "1d" });
    const link = `${dominio}/verify-email?token=${emailToken}`;

    await transporter.sendMail({
      from: mail_validaciones,
      to: user.email,
      subject: "Verificá tu cuenta",
      html: `<p>Click <a href="${link}">aquí</a> para verificar tu email.</p>`,
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

  if (user.estaBloqueado) {
    return res.status(403).json({ error: "Tu cuenta está bloqueada" });
  }

  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  // Opcional: guardar refresh token en DB si querés invalidarlo después
  // await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true, // en producción
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  });

  return res.json({ accessToken, user: { email: user.email, username: user.username, role: user.role } });
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.sendStatus(401);

  try {
    const payload = verifyRefreshToken(token) as any;

    const newAccessToken = generateAccessToken({ id: payload.id });

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.sendStatus(403); // token inválido o expirado
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Sesión cerrada correctamente" });
};

export const cambiarPassword = async (req: Request, res: Response) => {
  const { passwordActual, nuevaPassword } = req.body;
  const userId = (req as any).user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const match = await bcrypt.compare(passwordActual, user.password);
    if (!match) return res.status(401).json({ error: "La contraseña actual es incorrecta" });

    const nuevaHash = await bcrypt.hash(nuevaPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: nuevaHash } });

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    return res.status(500).json({ error: "Error al cambiar la contraseña" });
  }
};

export const solicitarRecuperarPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(200).json({ message: "Si existe el email, se envió el link" }); // evita revelar emails

  const token = generatePasswordResetToken(user.id.toString());
  const link = `${dominio}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: mail_validaciones,
    to: email,
    subject: "Recuperá tu contraseña",
    html: `<p>Click <a href="${link}">aquí</a> para crear una nueva contraseña. El link expira en 15 minutos.</p>`,
  });

  return res.json({ message: "Correo enviado si el email existe" });
};

export const resetearPassword = async (req: Request, res: Response) => {
  const { token, nuevaPassword } = req.body;

  try {
    const payload = verifyPasswordResetToken(token);
    const nuevaHash = await bcrypt.hash(nuevaPassword, 10);
    const userId = parseInt(payload.id);  // Convertir id a número

    await prisma.user.update({ where: { id: userId }, data: { password: nuevaHash } });

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }
};

export const verificarEmail = async (req: Request, res: Response) => {
  const { token } = req.query;

  try {
    const payload = jwt.verify(token as string, secret) as { id: string };
    const userId = parseInt(payload.id);  // Convertir id a número

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    return res.send("Email verificado correctamente. Ya podés iniciar sesión.");
  } catch (err) {
    return res.status(400).send("Token inválido o expirado");
  }
};


export const mostrarFormularioRestablecerPassword = async (req: Request, res: Response) => {
  const { token } = req.query;

  try {
    // Validar que el token sea válido
    const payload = verifyPasswordResetToken(token as string);
    return res.render("reset-password", { token }); // Puedes renderizar una vista HTML si usas un motor de plantillas
  } catch (err) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }
};

export const mostrarMensajeVerificacionCorreo = async (req: Request, res: Response) => {
  const { token } = req.query;

  try {
    // Validar el token de verificación de correo
    const payload = jwt.verify(token as string, secret);
    return res.render("verify-email", { message: "Tu correo ha sido verificado exitosamente" });
  } catch (err) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }
};

