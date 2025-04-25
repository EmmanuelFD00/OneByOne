import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import versusRoutes from "./routes/versus.routes";
import fichasRoutes from "./routes/fichas.routes";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/versus", versusRoutes);
app.use("/api/fichas", fichasRoutes); // Cambio aquí para que todas sigan el patrón /api/{ruta}
app.use("/api/admin", adminRoutes); // Asegúrate de que las rutas de admin estén protegidas

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
