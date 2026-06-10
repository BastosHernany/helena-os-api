import "dotenv/config";
import express from "express";
import cors from "cors";
import { rotasAutenticacao } from "./rotas/autenticacao.rotas";
import { rotasLeads } from "./rotas/leads.rotas";
import { rotasCampanhas } from "./rotas/campanhas.rotas";

const app = express();
const PORTA = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", rotasAutenticacao);
app.use("/api/leads", rotasLeads);
app.use("/api/campanhas", rotasCampanhas);

app.listen(PORTA, () => {
  console.log(`Helena OS API rodando na porta ${PORTA}`);
});
