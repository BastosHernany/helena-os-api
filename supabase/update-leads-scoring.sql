ALTER TABLE leads
ADD COLUMN IF NOT EXISTS score_perfil integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_interesse integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS estagio_funil text DEFAULT 'topo';
