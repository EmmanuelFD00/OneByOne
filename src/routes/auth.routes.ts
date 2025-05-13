import { Router } from "express";
import { register, login, refreshToken, logout, cambiarPassword, solicitarRecuperarPassword, resetearPassword, verificarEmail, mostrarFormularioRestablecerPassword, mostrarMensajeVerificacionCorreo } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";


const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.put("/cambiar-password",authMiddleware, cambiarPassword);

// Rutas para recuperación y verificación de email
router.post("/solicitar-recuperar-password", solicitarRecuperarPassword); // Esta ruta solicita el link para la recuperación de contraseña
// Ruta GET para mostrar el formulario de restablecimiento de contraseña
router.get("/reset-password", mostrarFormularioRestablecerPassword); 

// Ruta POST para cambiar la contraseña
router.post("/reset-password", resetearPassword); 

// Ruta GET para mostrar mensaje de verificación de correo
router.get("/verify-email", mostrarMensajeVerificacionCorreo);

// Ruta POST para confirmar la verificación del correo
router.post("/verify-email", verificarEmail); 








export default router;
