// TODO: substituir scoreLeadLocally pela Anthropic API em produção
import "dotenv/config";
import { supabaseClient } from "../lib/supabase";
import type {  LeadSource, LeadStatus } from "../lib/database";
import { NovoLead, ScoreResult, LeadAgentResult } from "./interfaces/lead.interface";



const SCORE_POR_ORIGEM: Record<LeadSource, number> = {
  indicacao: 90,
  site: 75,
  whatsapp: 70,
  instagram: 60,
};

const PALAVRAS_INTENCAO = ["urgente", "quanto custa", "quero", "preciso", "quando", "valor", "preço"];

function scoreLeadLocally(input: NovoLead): ScoreResult {
  const scoreBase = SCORE_POR_ORIGEM[input.source];
  const parts: string[] = [`Origem "${input.source}": ${scoreBase} pontos.`];
  let bonus = 0;

  if (input.email && input.telefone) {
    bonus += 15;
    parts.push("Tem email e telefone: +15 pontos.");
  }

  const obs = (input.observacoes ?? "").toLowerCase();
  if (PALAVRAS_INTENCAO.some((p) => obs.includes(p))) {
    bonus += 20;
    parts.push("Anotações contêm palavras de alta intenção: +20 pontos.");
  }

  const score = Math.min(100, scoreBase + bonus);
  parts.push(`Score final: ${score}/100.`);

  let suggested_action: string;
  if (score >= 80) {
    suggested_action = "Entrar em contato imediatamente por telefone ou WhatsApp.";
  } else if (score >= 50) {
    suggested_action = "Incluir em sequência de e-mails de nutrição e agendar follow-up em 3 dias.";
  } else {
    suggested_action = "Adicionar ao fluxo de nutrição de longo prazo e monitorar engajamento.";
  }

  return { score, reasoning: parts.join(" "), suggested_action };
}

function resolveStatusAndAction(score: number): {
  status: LeadStatus;
  action: "followup_imediato" | "sequencia_email" | "nurturing";
} {
  if (score >= 80) return { status: "qualified", action: "followup_imediato" };
  if (score >= 50) return { status: "contacted", action: "sequencia_email" };
  return { status: "new", action: "nurturing" };
}

export async function processLead(input: NovoLead): Promise<LeadAgentResult> {
  const scoreResult = scoreLeadLocally(input);
  const { status, action } = resolveStatusAndAction(scoreResult.score);

  const { data: lead, error } = await supabaseClient
    .from("leads")
    .insert({
      client_id: input.cliente_id,
      name: input.nome,
      email: input.email ?? null,
      phone: input.telefone ?? null,
      source: input.source,
      status,
      score: scoreResult.score,
      notes: input.observacoes ?? null,
    })
    .select()
    .single();

  if (error || !lead) {
    throw new Error(`Erro ao salvar lead no Supabase: ${error?.message}`);
  }

  return {
    lead,
    reasoning: scoreResult.reasoning,
    suggested_action: scoreResult.suggested_action,
    action,
  };
}
