import { Router, Response } from "express";
import { z } from "zod";
import { supabaseClient } from "../../lib/supabase";
import { processCampaign } from "../../agents/campaign-agent";
import { middlewareAutenticacao, RequisicaoAutenticada } from "../middleware/autenticacao.middleware";

export const rotasCampanhas = Router();

rotasCampanhas.use(middlewareAutenticacao);

// ── Schemas de validação ──────────────────────────────────────────────────────

const schemaCriarCampanha = z.object({
  nome:         z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  plataforma:   z.enum(["meta", "google"], "Plataforma inválida. Use: meta ou google"),
  orcamento:    z.number().positive("Orçamento deve ser positivo").optional().nullable(),
  gasto:        z.number().min(0, "Gasto não pode ser negativo"),
  impressoes:   z.number().int().min(0, "Impressões não pode ser negativo"),
  cliques:      z.number().int().min(0, "Cliques não pode ser negativo"),
  conversoes:   z.number().int().min(0, "Conversões não pode ser negativo"),
  ticket_medio: z.number().positive("Ticket médio deve ser positivo").optional().nullable(),
});

const schemaAtualizarCampanha = z.object({
  status: z.enum(["active", "paused", "ended"], "Status inválido. Use: active, paused ou ended").optional(),
  nome:   z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
});

// ── GET /api/campanhas ────────────────────────────────────────────────────────

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

// ── POST /api/campanhas ───────────────────────────────────────────────────────

rotasCampanhas.post("/", async (req: RequisicaoAutenticada, res: Response) => {
  const validacao = schemaCriarCampanha.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({ erro: validacao.error.issues[0].message });
    return;
  }

  const { nome, plataforma, orcamento, gasto, impressoes, cliques, conversoes, ticket_medio } = validacao.data;

  try {
    const resultado = await processCampaign({
      client_id:    req.clienteId!,
      name:         nome,
      platform:     plataforma,
      budget:       orcamento ?? null,
      spend:        gasto,
      impressions:  impressoes,
      clicks:       cliques,
      conversions:  conversoes,
      ticket_medio: ticket_medio ?? undefined,
    });

    res.status(201).json(resultado);
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Erro ao processar campanha";
    res.status(500).json({ erro: mensagem });
  }
});

// ── PATCH /api/campanhas/:id ──────────────────────────────────────────────────

rotasCampanhas.patch("/:id", async (req: RequisicaoAutenticada, res: Response) => {
  const { id } = req.params;

  const validacao = schemaAtualizarCampanha.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({ erro: validacao.error.issues[0].message });
    return;
  }

  if (Object.keys(validacao.data).length === 0) {
    res.status(400).json({ erro: "Nenhum campo para atualizar" });
    return;
  }

  // Garante que a campanha pertence ao cliente autenticado
  const { data: campanha, error: erroBusca } = await supabaseClient
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("client_id", req.clienteId!)
    .single();

  if (erroBusca || !campanha) {
    res.status(404).json({ erro: "Campanha não encontrada" });
    return;
  }

  const camposParaAtualizar: Record<string, unknown> = {};
  if (validacao.data.status) camposParaAtualizar.status = validacao.data.status;
  if (validacao.data.nome)   camposParaAtualizar.name   = validacao.data.nome;

  const { data: campanhaAtualizada, error: erroUpdate } = await supabaseClient
    .from("campaigns")
    .update(camposParaAtualizar)
    .eq("id", id)
    .select()
    .single();

  if (erroUpdate) {
    res.status(500).json({ erro: erroUpdate.message });
    return;
  }

  res.json(campanhaAtualizada);
});