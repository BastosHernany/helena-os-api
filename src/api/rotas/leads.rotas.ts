import { Router, Response } from "express";
import { supabaseClient } from "../../lib/supabase";
import { processLead } from "../../agents/lead-agent";
import { middlewareAutenticacao, RequisicaoAutenticada } from "../middleware/autenticacao.middleware";
import type { LeadSource } from "../../lib/database";

export const rotasLeads = Router();

rotasLeads.use(middlewareAutenticacao);

rotasLeads.get("/", async (req: RequisicaoAutenticada, res: Response) => {
  const { data: leads, error } = await supabaseClient
    .from("leads")
    .select("id, client_id, name, email, phone, source, status, score, score_perfil, score_interesse, estagio_funil, notes, created_at, updated_at")
    .eq("client_id", req.clienteId!)
    .order("score", { ascending: false });

  if (error) {
    res.status(500).json({ erro: error.message });
    return;
  }

  res.json(leads);
});

rotasLeads.post("/", async (req: RequisicaoAutenticada, res: Response) => {
  const { nome, email, telefone, origem, observacoes } = req.body;

  if (!nome || !origem) {
    res.status(400).json({ erro: "nome e origem sao obrigatorios" });
    return;
  }

  try {
    const resultado = await processLead({
      cliente_id: req.clienteId!,
      nome,
      email: email ?? null,
      telefone: telefone ?? null,
      source: origem as LeadSource,
      observacoes: observacoes ?? null,
    });

    res.status(201).json(resultado);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Erro ao processar lead";
    res.status(500).json({ erro: mensagem });
  }
});
