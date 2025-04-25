import express from "express";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";
import { historialUsuario } from "../controllers/versus.controller"; // Ajustar según el controlador
import { crearUsuarioAdmin, verSolicitudesDeCarga } from "../controllers/admin.controller";

const router = express.Router();

// Asegúrate de que esté protegida con el middleware de admin
router.get("/historial", authMiddleware, adminMiddleware, historialUsuario);
router.post("/crear-admin", adminMiddleware, crearUsuarioAdmin);
router.get("/solicitudes/carga",adminMiddleware, verSolicitudesDeCarga);

// Agrega más rutas del admin cuando sea necesario

export default router;
