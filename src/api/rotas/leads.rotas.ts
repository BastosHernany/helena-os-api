import { Router, Response } from "express";
import { z } from "zod";
import { supabaseClient } from "../../lib/supabase";
import { processLead } from "../../agents/lead-agent";
import { middlewareAutenticacao, RequisicaoAutenticada } from "../middleware/autenticacao.middleware";

export const rotasLeads = Router();

rotasLeads.use(middlewareAutenticacao);

// ── Schemas de validação ──────────────────────────────────────────────────────

const schemaCriarLead = z.object({
  nome:        z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email:       z.string().email("E-mail inválido").optional().nullable(),
  telefone:    z.string().optional().nullable(),
  origem:      z.enum(["instagram", "whatsapp", "site", "indicacao"], "Origem inválida. Use: instagram, whatsapp, site ou indicacao"),
  observacoes: z.string().optional().nullable(),
});

const schemaAtualizarLead = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"], "Status inválido").optional(),
  notes:  z.string().optional().nullable(),
});

// ── GET /api/leads ────────────────────────────────────────────────────────────

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

// ── POST /api/leads ───────────────────────────────────────────────────────────

rotasLeads.post("/", async (req: RequisicaoAutenticada, res: Response) => {
  const validacao = schemaCriarLead.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({ erro: validacao.error.issues[0].message });
    return;
  }

  const { nome, email, telefone, origem, observacoes } = validacao.data;

  try {
    const resultado = await processLead({
      cliente_id:  req.clienteId!,
      nome,
      email:       email ?? null,
      telefone:    telefone ?? null,
      source:      origem,
      observacoes: observacoes ?? null,
    });

    res.status(201).json(resultado);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Erro ao processar lead";
    res.status(500).json({ erro: mensagem });
  }
});

// ── PATCH /api/leads/:id ──────────────────────────────────────────────────────

rotasLeads.patch("/:id", async (req: RequisicaoAutenticada, res: Response) => {
  const { id } = req.params;

  const validacao = schemaAtualizarLead.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({ erro: validacao.error.issues[0].message });
    return;
  }

  if (Object.keys(validacao.data).length === 0) {
    res.status(400).json({ erro: "Nenhum campo para atualizar" });
    return;
  }

  // Garante que o lead pertence ao cliente autenticado antes de atualizar
  const { data: lead, error: erroBusca } = await supabaseClient
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("client_id", req.clienteId!)
    .single();

  if (erroBusca || !lead) {
    res.status(404).json({ erro: "Lead não encontrado" });
    return;
  }

  const { data: leadAtualizado, error: erroUpdate } = await supabaseClient
    .from("leads")
    .update(validacao.data)
    .eq("id", id)
    .select()
    .single();

  if (erroUpdate) {
    res.status(500).json({ erro: erroUpdate.message });
    return;
  }

  res.json(leadAtualizado);
});