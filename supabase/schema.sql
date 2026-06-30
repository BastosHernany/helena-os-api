-- ============================================================
-- Helena OS — Schema consolidado
-- Versão única e definitiva. Rode este arquivo no Supabase
-- Dashboard > SQL Editor em um banco limpo.
-- ============================================================

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE lead_source AS ENUM ('instagram', 'whatsapp', 'site', 'indicacao');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
CREATE TYPE estagio_funil AS ENUM ('topo', 'meio', 'fundo');
CREATE TYPE interaction_type AS ENUM ('email', 'whatsapp', 'call');
CREATE TYPE campaign_platform AS ENUM ('meta', 'google');
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'ended');
CREATE TYPE diagnostico_status AS ENUM ('saudavel', 'atencao', 'critico');
CREATE TYPE content_platform AS ENUM ('instagram');
CREATE TYPE content_type AS ENUM ('feed', 'story', 'carousel');
CREATE TYPE content_status AS ENUM ('draft', 'scheduled', 'published');

-- ============================================================
-- FUNÇÃO UTILITÁRIA: mantém updated_at sempre atualizado
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. clients — empresas clientes do Helena OS
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  segment       TEXT,
  email         TEXT        UNIQUE,
  phone         TEXT,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. leads — leads captados para cada cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  email           TEXT,
  phone           TEXT,
  source          lead_source  NOT NULL,
  status          lead_status  NOT NULL DEFAULT 'new',
  score           SMALLINT     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  score_perfil    SMALLINT     NOT NULL DEFAULT 0 CHECK (score_perfil BETWEEN 0 AND 100),
  score_interesse SMALLINT     NOT NULL DEFAULT 0 CHECK (score_interesse BETWEEN 0 AND 100),
  estagio_funil   estagio_funil NOT NULL DEFAULT 'topo',
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_client_status   ON leads (client_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_client_score    ON leads (client_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_client_criado   ON leads (client_id, created_at DESC);

-- ============================================================
-- 3. lead_interactions — histórico de interações com cada lead
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_interactions (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID             NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type       interaction_type NOT NULL,
  content    TEXT             NOT NULL,
  created_at TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON lead_interactions (lead_id, created_at DESC);

-- ============================================================
-- 4. campaigns — campanhas de tráfego dos clientes
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id                        UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 UUID               NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name                      TEXT               NOT NULL,
  platform                  campaign_platform  NOT NULL,
  status                    campaign_status    NOT NULL DEFAULT 'active',
  budget                    NUMERIC(12, 2),
  spend                     NUMERIC(12, 2)     NOT NULL DEFAULT 0,
  impressions               INTEGER            NOT NULL DEFAULT 0,
  clicks                    INTEGER            NOT NULL DEFAULT 0,
  conversions               INTEGER            NOT NULL DEFAULT 0,
  ticket_medio              NUMERIC(12, 2),
  roas                      NUMERIC(8, 4),
  ctr                       NUMERIC(8, 4),
  cpc                       NUMERIC(12, 4),
  cpl                       NUMERIC(12, 4),
  taxa_conversao            NUMERIC(8, 4),
  diagnostico_status        diagnostico_status,
  diagnostico_problemas     TEXT[]             DEFAULT '{}',
  diagnostico_recomendacoes TEXT[]             DEFAULT '{}',
  diagnostico_resumo        TEXT,
  created_at                TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_campaigns_client          ON campaigns (client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_status   ON campaigns (client_id, diagnostico_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_platform ON campaigns (client_id, platform);

-- ============================================================
-- 5. content_posts — posts agendados para redes sociais
-- ============================================================

CREATE TABLE IF NOT EXISTS content_posts (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID             NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform     content_platform NOT NULL,
  type         content_type     NOT NULL,
  content      TEXT             NOT NULL,
  media_url    TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status       content_status   NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_client ON content_posts (client_id, status, scheduled_at);