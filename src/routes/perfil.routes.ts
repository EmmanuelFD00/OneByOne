import { Router } from "express";
import { obtenerPerfilUsuario, 
    actualizarUsername,
    asignarNicknameLOL
     } from "../controllers/perfil.controller";
import { authMiddleware } from "../middlewares/auth.middleware";


const router = Router();

router.get("/perfil/:id", authMiddleware, obtenerPerfilUsuario);
router.put("/username", authMiddleware, actualizarUsername);
router.put("/nickname-lol", authMiddleware, asignarNicknameLOL);


export default router;