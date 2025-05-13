import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import versusRoutes from "./routes/versus.routes";
import fichasRoutes from "./routes/fichas.routes";
import adminRoutes from "./routes/admin.routes";
import perfilRoutes from "./routes/perfil.routes";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/versus", versusRoutes);
app.use("/api/fichas", fichasRoutes); // Cambio aquí para que todas sigan el patrón /api/{ruta}
app.use("/api/admin", adminRoutes); // Asegúrate de que las rutas de admin estén protegidas
app.use("/api/perfil", perfilRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
