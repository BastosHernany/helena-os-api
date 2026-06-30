import { Router, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { middlewareAutenticacao, RequisicaoAutenticada } from "../middleware/autenticacao.middleware";
import { processarExcel } from "../../agents/excel-agent";
import { processCampaign } from "../../agents/campaign-agent";
import { NovaCampanha, CampaignAgentResult } from "../../agents/interfaces/campaign.interface";

export const rotasCampanhasUpload = Router();

rotasCampanhasUpload.use(middlewareAutenticacao);

// Armazena o arquivo em memória (buffer) — não salva em disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (_req, file, cb) => {
    const tiposPermitidos = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos .xlsx, .xls ou .csv são aceitos"));
    }
  },
});

const schemaUpload = z.object({
  plataforma:   z.enum(["meta", "google"], "Plataforma inválida. Use: meta ou google"),
  ticket_medio: z.coerce.number().positive("Ticket médio deve ser positivo").optional(),
});

// ── POST /api/campanhas/upload ────────────────────────────────────────────────

rotasCampanhasUpload.post(
  "/upload",
  upload.single("arquivo"),
  async (req: RequisicaoAutenticada, res: Response) => {
    if (!req.file) {
      res.status(400).json({ erro: "Arquivo não enviado. Use o campo 'arquivo' no form-data." });
      return;
    }

    const validacao = schemaUpload.safeParse(req.body);
    if (!validacao.success) {
      res.status(400).json({ erro: validacao.error.issues[0].message });
      return;
    }

    const { plataforma, ticket_medio } = validacao.data;

    try {
      const { campanhas, avisos } = await processarExcel(req.file.buffer, plataforma, ticket_medio);

      const resultados = await Promise.all(
        campanhas.map((campanha: Omit<NovaCampanha, "client_id">) =>
          processCampaign({ ...campanha, client_id: req.clienteId! })
        )
      );

      res.status(201).json({
        processadas: resultados.length,
        avisos,
        campanhas: resultados.map((r: CampaignAgentResult) => r.campaign),
      });
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : "Erro ao processar arquivo";
      res.status(422).json({ erro: mensagem });
    }
  }
);
