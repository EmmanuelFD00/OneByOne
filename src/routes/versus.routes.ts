import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";
import { crearDuelo, aceptarDuelo, listarPendientes, declararResultado, historialUsuario, listarDuelosEnApelacion, decidirGanador, apelarDuelo   } from "../controllers/versus.controller";

const router = Router();

router.post("/crear", authMiddleware, crearDuelo);
router.post("/aceptar", authMiddleware, aceptarDuelo);
router.get("/pendientes", listarPendientes);
router.post("/resultado", authMiddleware, declararResultado);
router.get('/historial', authMiddleware, historialUsuario);
router.get("/duelos-en-apelacion",adminMiddleware, listarDuelosEnApelacion);
router.post("/decidir-ganador",adminMiddleware, decidirGanador);
router.post("/duelo/:id/apelar", authMiddleware, apelarDuelo);



export default router;
