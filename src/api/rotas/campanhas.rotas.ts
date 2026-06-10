import { Router, Response } from "express";
import { supabaseClient } from "../../lib/supabase";
import { processCampaign } from "../../agents/campaign-agent";
import { middlewareAutenticacao, RequisicaoAutenticada } from "../middleware/autenticacao.middleware";
import type { CampaignPlatform } from "../../lib/database";

export const rotasCampanhas = Router();

rotasCampanhas.use(middlewareAutenticacao);

rotasCampanhas.get("/", async (req: RequisicaoAutenticada, res: Response) => {
  const { data: campanhas, error } = await supabaseClient
    .from("campaigns")
    .select()
    .eq("client_id", req.clienteId!)
    .order("diagnostico_status", { ascending: true });

  if (error) {
    res.status(500).json({ erro: error.message });
    return;
  }

  res.json(campanhas);
});

rotasCampanhas.post("/", async (req: RequisicaoAutenticada, res: Response) => {
  const { nome, plataforma, orcamento, gasto, impressoes, cliques, conversoes } = req.body;

  if (!nome || !plataforma || gasto === undefined || impressoes === undefined || cliques === undefined || conversoes === undefined) {
    res.status(400).json({ erro: "nome, plataforma, gasto, impressoes, cliques e conversoes sao obrigatorios" });
    return;
  }

  try {
    const resultado = await processCampaign({
      client_id: req.clienteId!,
      name: nome,
      platform: plataforma as CampaignPlatform,
      budget: orcamento ?? null,
      spend: gasto,
      impressions: impressoes,
      clicks: cliques,
      conversions: conversoes,
    });

    res.status(201).json(resultado);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Erro ao processar campanha";
    res.status(500).json({ erro: mensagem });
  }
});
