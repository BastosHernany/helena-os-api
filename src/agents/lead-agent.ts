// TODO: substituir scoreLeadLocally pela Anthropic API em producao
// A IA vai gerar reasoning muito mais rico e contextualizado
import "dotenv/config";
import { supabaseClient } from "../lib/supabase";
import type { LeadStatus, EstagioFunil } from "../lib/database";
import { NovoLead, ScoreResult, LeadAgentResult, AcaoRecomendada } from "./interfaces/lead.interface";

const PALAVRAS_URGENCIA = ["urgente", "rapido", "rápido", "hoje", "essa semana"];
const PALAVRAS_INTENCAO_COMPRA = ["quero", "preciso", "quanto custa", "valor", "preço", "preco", "orcamento", "orçamento", "contratar"];
const PALAVRAS_CONSIDERACAO = ["pensando", "avaliando", "comparando", "pesquisando"];

function calcularScorePerfil(input: NovoLead): { score: number; reasoning: string[] } {
  const parts: string[] = [];
  let score = 0;

  if (input.email && input.telefone) {
    score += 30;
    parts.push("Tem email e telefone (contato completo): +30 pontos.");
  } else if (input.email || input.telefone) {
    score += 15;
    parts.push("Tem apenas email ou telefone: +15 pontos.");
  } else {
    parts.push("Sem email nem telefone: +0 pontos.");
  }

  const bonusOrigem: Record<string, number> = {
    indicacao: 40,
    site: 25,
    whatsapp: 20,
    instagram: 10,
  };
  const bonus = bonusOrigem[input.source] ?? 0;
  score += bonus;
  parts.push(`Origem "${input.source}": +${bonus} pontos.`);

  return { score: Math.min(100, score), reasoning: parts };
}

function calcularScoreInteresse(input: NovoLead): { score: number; reasoning: string[] } {
  const parts: string[] = [];
  let score = 0;
  const obs = (input.observacoes ?? "").toLowerCase();

  if (PALAVRAS_URGENCIA.some((p) => obs.includes(p))) {
    score += 40;
    parts.push("Observações contêm palavras de urgência: +40 pontos.");
  }

  if (PALAVRAS_INTENCAO_COMPRA.some((p) => obs.includes(p))) {
    score += 30;
    parts.push("Observações contêm intenção de compra: +30 pontos.");
  }

  if (PALAVRAS_CONSIDERACAO.some((p) => obs.includes(p))) {
    score += 15;
    parts.push("Observações contêm palavras de consideração: +15 pontos.");
  }

  if (obs.length > 50) {
    score += 15;
    parts.push("Lead se explicou bem (mais de 50 caracteres): +15 pontos.");
  }

  if (score === 0) {
    parts.push("Nenhum sinal de interesse nas observações: +0 pontos.");
  }

  return { score: Math.min(100, score), reasoning: parts };
}

function resolverEstagioFunil(scoreInteresse: number): EstagioFunil {
  if (scoreInteresse >= 61) return "fundo";
  if (scoreInteresse >= 31) return "meio";
  return "topo";
}

function resolverAcao(scorePerfil: number, scoreInteresse: number): AcaoRecomendada {
  if (scorePerfil >= 60 && scoreInteresse >= 60) return "followup_imediato";
  if (scorePerfil >= 60 && scoreInteresse >= 30) return "nutricao_ativa";
  if (scorePerfil >= 60) return "nutricao_leve";
  if (scorePerfil >= 30 && scoreInteresse >= 60) return "followup_rapido";
  if (scorePerfil >= 30) return "nutricao_leve";
  return "monitorar";
}

function resolverStatus(score: number): LeadStatus {
  if (score >= 70) return "qualified";
  if (score >= 40) return "contacted";
  return "new";
}

const DESCRICAO_ACAO: Record<AcaoRecomendada, string> = {
  followup_imediato: "Contato em menos de 1 hora — lead pronto para decidir.",
  nutricao_ativa: "Sequência de conteúdo + follow-up em 48h.",
  nutricao_leve: "Emails educativos sem pressão.",
  followup_rapido: "Contato em 24h para qualificar melhor o perfil.",
  monitorar: "Não investir energia agora, monitorar evolução.",
};

function scoreLeadLocally(input: NovoLead): ScoreResult {
  const { score: score_perfil, reasoning: partesPerfil } = calcularScorePerfil(input);
  const { score: score_interesse, reasoning: partesInteresse } = calcularScoreInteresse(input);

  const score = Math.round(score_perfil * 0.4 + score_interesse * 0.6);
  const estagio_funil = resolverEstagioFunil(score_interesse);
  const suggested_action = resolverAcao(score_perfil, score_interesse);

  const reasoning = [
    `PERFIL (${score_perfil}/100): ${partesPerfil.join(" ")}`,
    `INTERESSE (${score_interesse}/100): ${partesInteresse.join(" ")}`,
    `Estágio no funil: ${estagio_funil} (baseado no interesse).`,
    `Ação recomendada: ${suggested_action} — ${DESCRICAO_ACAO[suggested_action]}`,
    `Score geral: ${score}/100 (perfil x0.4 + interesse x0.6).`,
  ].join(" | ");

  return { score, score_perfil, score_interesse, estagio_funil, reasoning, suggested_action };
}

export async function processLead(input: NovoLead): Promise<LeadAgentResult> {
  const scoreResult = scoreLeadLocally(input);
  const status = resolverStatus(scoreResult.score);

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
      score_perfil: scoreResult.score_perfil,
      score_interesse: scoreResult.score_interesse,
      estagio_funil: scoreResult.estagio_funil,
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
    action: scoreResult.suggested_action,
  };
}
