import express from "express";
import cors from "cors";
import "dotenv/config";
import { authRouter } from "./routes/auth.routes.js";
import { participantesRouter } from "./routes/participantes.routes.js";
import { votacionRouter } from "./routes/votacion.routes.js";
import { tombolaRouter } from "./routes/tombola.routes.js";

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

const app = express();

const origenesPermitidos = process.env.FRONTEND_URL?.split(",").map((o) => o.trim());
app.use(cors(origenesPermitidos?.length ? {origin: origenesPermitidos} : undefined));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/participantes", participantesRouter);
app.use("/api/votacion", votacionRouter);
app.use("/api/tombola", tombolaRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Ocurrió un error inesperado en el servidor" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
    console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
