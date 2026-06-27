import { LeadSource, Lead } from "../../lib/database";

export interface NovoLead {
    cliente_id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    source: LeadSource;
    observacoes?: string | null;
}

export type AcaoRecomendada =
  | "followup_imediato"
  | "nutricao_ativa"
  | "nutricao_leve"
  | "followup_rapido"
  | "monitorar";

export interface ScoreResult {
    score: number;
    score_perfil: number;
    score_interesse: number;
    estagio_funil: "topo" | "meio" | "fundo";
    reasoning: string;
    suggested_action: AcaoRecomendada;
}

export interface LeadAgentResult {
    lead: Lead;
    reasoning: string;
    suggested_action: AcaoRecomendada;
    action: AcaoRecomendada;
}