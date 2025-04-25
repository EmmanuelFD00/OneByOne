import express from "express";
import {
  solicitarFichas,
  aprobarSolicitud,
} from "../controllers/fichas.controller";
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';


const router = express.Router();

router.post("/solicitar", authMiddleware, solicitarFichas);
router.post("/admin/aprobar/:id", authMiddleware, adminMiddleware, aprobarSolicitud);

export default router;
