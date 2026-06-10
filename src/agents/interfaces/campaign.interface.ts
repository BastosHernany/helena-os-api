import { CampaignPlatform, Campaign } from "../../lib/database";

export interface NovaCampanha {
    client_id: string;
    name: string;
    platform: CampaignPlatform;
    budget?: number | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ticket_medio?: number;
}

export interface Metricas {
    ctr: number;
    cpc: number;
    cpl: number;
    roas: number;
    taxa_conversao: number;
}

export interface Diagnostico {
    status: "saudavel" | "atencao" | "critico";
    problemas: string[];
    recomendacoes: string[];
    resumo: string;
}

export interface CampaignAgentResult {
    campaign: Campaign;
    metricas: Metricas;
    diagnostico: Diagnostico;
}