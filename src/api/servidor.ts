import "dotenv/config";
import express from "express";
import cors from "cors";
import { rotasAutenticacao }      from "./rotas/autenticacao.rotas";
import { rotasLeads }             from "./rotas/leads.rotas";
import { rotasCampanhas }         from "./rotas/campanhas.rotas";
import { rotasCampanhasUpload }   from "./rotas/campanhas-upload.rotas";
import { limiterGeral }           from "./middleware/rate-limit.middleware";
import { middlewareLog }          from "./middleware/log.middleware";
import { middlewareErro }         from "./middleware/erro.middleware";

const app  = express();
const PORTA = process.env.PORT ?? 3000;

app.use(cors({
  origin: process.env.CORS_ORIGEM ?? "http://localhost:5173",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(middlewareLog);

app.get("/health", (req, res) => {
  res.json({ status: "ok", versao: "0.1.0", timestamp: new Date().toISOString() });
});

app.use(limiterGeral);

app.use("/api/auth",      rotasAutenticacao);
app.use("/api/leads",     rotasLeads);
app.use("/api/campanhas", rotasCampanhas);
app.use("/api/campanhas", rotasCampanhasUpload); // upload de Excel via multipart

app.use(middlewareErro);

app.listen(PORTA, () => {
  console.log(`Helena OS API rodando na porta ${PORTA}`);
});