export type LeadSource = "instagram" | "whatsapp" | "site" | "indicacao";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type InteractionType = "email" | "whatsapp" | "call";
export type CampaignPlatform = "meta" | "google";
export type CampaignStatus = "active" | "paused" | "ended";
export type ContentPlatform = "instagram";
export type ContentType = "feed" | "story" | "carousel";
export type ContentStatus = "draft" | "scheduled" | "published";

export interface Client {
  id: string;
  name: string;
  segment: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: InteractionType;
  content: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  budget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
  taxa_conversao: number | null;
  diagnostico_status: string | null;
  diagnostico_problemas: string[] | null;
  diagnostico_recomendacoes: string[] | null;
  diagnostico_resumo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPost {
  id: string;
  client_id: string;
  platform: ContentPlatform;
  type: ContentType;
  content: string;
  media_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: ContentStatus;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      clients: { Row: Client; Insert: Omit<Client, "id" | "created_at">; Update: Partial<Omit<Client, "id" | "created_at">> };
      leads: { Row: Lead; Insert: Omit<Lead, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Lead, "id" | "client_id" | "created_at">> };
      lead_interactions: { Row: LeadInteraction; Insert: Omit<LeadInteraction, "id" | "created_at">; Update: never };
      campaigns: { Row: Campaign; Insert: Omit<Campaign, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Campaign, "id" | "client_id" | "created_at">> };
      content_posts: { Row: ContentPost; Insert: Omit<ContentPost, "id" | "created_at">; Update: Partial<Omit<ContentPost, "id" | "client_id" | "created_at">> };
    };
  };
}
