import { LeadSource, Lead } from "../../lib/database";

export interface NovoLead {
    cliente_id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    source: LeadSource;
    observacoes?: string | null;
}

export interface ScoreResult {
    score: number;
    reasoning: string;
    suggested_action: string;
}

export interface LeadAgentResult {
    lead: Lead;
    reasoning: string;
    suggested_action: string;
    action: "followup_imediato" | "sequencia_email" | "nurturing";
}