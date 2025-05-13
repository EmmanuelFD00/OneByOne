import express from "express";
import { adminMiddleware } from "../middlewares/auth.middleware";
import { crearUsuarioAdmin, verSolicitudesDeCarga, bloquearNickname, bloquearUsuario } from "../controllers/admin.controller";

const router = express.Router();

// Asegúrate de que esté protegida con el middleware de admin

router.post("/crear-admin", adminMiddleware, crearUsuarioAdmin);
router.get("/solicitudes/carga",adminMiddleware, verSolicitudesDeCarga);
router.post("/bloquear-nickname", adminMiddleware, bloquearNickname);
router.post("/bloquear-usuario", adminMiddleware, bloquearUsuario);

// Agrega más rutas del admin cuando sea necesario

export default router;
