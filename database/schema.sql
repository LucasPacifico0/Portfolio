-- =====================================================================
--  PORTFÓLIO — Lucas Pacífico Medeiros Formiga Moreira
--  Modelagem relacional MySQL 8.0+  |  utf8mb4  |  InnoDB
--
--  Entidades:
--    projects              → projeto exibido no portfólio
--    project_categories    → categorias de filtro (N por projeto)
--    technologies          → catálogo de tecnologias (badges)
--    project_technologies  → relação N:N projeto ↔ tecnologia
--    project_metrics       → métricas de impacto (negócio / técnica)
--    project_embeddings    → (IA Ready) vetores p/ busca semântica / RAG
--    v_portfolio_projects  → VIEW que entrega tudo pronto em JSON
-- =====================================================================

CREATE DATABASE IF NOT EXISTS portfolio
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE portfolio;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW  IF EXISTS v_portfolio_projects;
DROP TABLE IF EXISTS project_embeddings;
DROP TABLE IF EXISTS project_metrics;
DROP TABLE IF EXISTS project_technologies;
DROP TABLE IF EXISTS project_categories;
DROP TABLE IF EXISTS technologies;
DROP TABLE IF EXISTS projects;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. PROJECTS
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  slug             VARCHAR(80)      NOT NULL,                 -- identificador de URL: "everycapital"
  title            VARCHAR(120)     NOT NULL,
  tagline          VARCHAR(160)     NOT NULL,                 -- frase curta do card
  summary          TEXT             NOT NULL,                 -- descrição técnica
  impact           VARCHAR(255)     NULL,                     -- resultado comercial em 1 linha (Growth)
  status           ENUM('active','in_progress','mvp','concluded')
                                    NOT NULL DEFAULT 'in_progress',
  category         ENUM('ai_data','database','web_dev','saas','client_work')
                                    NOT NULL,                 -- categoria PRINCIPAL
  github_url       VARCHAR(255)     NULL,
  live_url         VARCHAR(255)     NULL,
  cover_image      VARCHAR(255)     NULL,                     -- caminho relativo: assets/everycapital.webp
  is_featured      BOOLEAN          NOT NULL DEFAULT FALSE,
  featured_order   SMALLINT UNSIGNED NOT NULL DEFAULT 999,    -- menor = aparece primeiro
  is_published     BOOLEAN          NOT NULL DEFAULT TRUE,    -- rascunho = FALSE
  started_at       DATE             NULL,
  finished_at      DATE             NULL,
  created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_slug (slug),
  KEY ix_projects_listing (is_published, featured_order),
  KEY ix_projects_category (category),
  CONSTRAINT ck_projects_dates
    CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. PROJECT_CATEGORIES  (um projeto pode aparecer em vários filtros)
--    Ex.: EveryCapital = SaaS + Banco de Dados + IA/Data
-- ---------------------------------------------------------------------
CREATE TABLE project_categories (
  project_id  INT UNSIGNED NOT NULL,
  category    ENUM('ai_data','database','web_dev','saas','client_work') NOT NULL,
  PRIMARY KEY (project_id, category),
  KEY ix_pc_category (category),
  CONSTRAINT fk_pc_project FOREIGN KEY (project_id)
    REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. TECHNOLOGIES  (catálogo único — evita "MySQL", "mysql", "MySql")
-- ---------------------------------------------------------------------
CREATE TABLE technologies (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(60)  NOT NULL,                        -- rótulo do badge
  slug          VARCHAR(60)  NOT NULL,
  pillar        ENUM('python','backend','database','ai_data','frontend','tools') NOT NULL,
  is_highlight  BOOLEAN      NOT NULL DEFAULT FALSE,          -- badge ciano em destaque
  PRIMARY KEY (id),
  UNIQUE KEY uq_tech_slug (slug),
  UNIQUE KEY uq_tech_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PROJECT_TECHNOLOGIES  (N:N)
-- ---------------------------------------------------------------------
CREATE TABLE project_technologies (
  project_id     INT UNSIGNED      NOT NULL,
  technology_id  SMALLINT UNSIGNED NOT NULL,
  display_order  TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, technology_id),
  KEY ix_pt_technology (technology_id),
  CONSTRAINT fk_pt_project    FOREIGN KEY (project_id)
    REFERENCES projects (id)     ON DELETE CASCADE,
  CONSTRAINT fk_pt_technology FOREIGN KEY (technology_id)
    REFERENCES technologies (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. PROJECT_METRICS  (prova de resultado — estilo Growth)
-- ---------------------------------------------------------------------
CREATE TABLE project_metrics (
  id             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  project_id     INT UNSIGNED     NOT NULL,
  label          VARCHAR(80)      NOT NULL,                   -- "Perfis suportados"
  value          VARCHAR(40)      NOT NULL,                   -- "CPF + CNPJ", "95", "-40%"
  unit           VARCHAR(20)      NULL,                       -- "%", "ms", "pts"
  metric_type    ENUM('business','technical') NOT NULL DEFAULT 'technical',
  display_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_pm_project (project_id, display_order),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id)
    REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. PROJECT_EMBEDDINGS  (IA Ready — opcional)
--    Guarda o vetor gerado por um modelo de embeddings a partir de
--    title + summary + stack. Permite busca semântica ("projetos com
--    dashboards financeiros") ou um chatbot RAG no portfólio.
--    Em MySQL 9+/HeatWave você pode trocar JSON por tipo VECTOR.
-- ---------------------------------------------------------------------
CREATE TABLE project_embeddings (
  project_id   INT UNSIGNED NOT NULL,
  model        VARCHAR(80)  NOT NULL,                         -- ex.: "text-embedding-3-small"
  embedding    JSON         NOT NULL,                         -- [0.0123, -0.98, ...]
  source_hash  CHAR(64)     NOT NULL,                         -- SHA-256 do texto: regera só se mudar
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, model),
  CONSTRAINT fk_pe_project FOREIGN KEY (project_id)
    REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
--  SEED — TECNOLOGIAS
-- =====================================================================
INSERT INTO technologies (name, slug, pillar, is_highlight) VALUES
  ('Python',        'python',       'python',   TRUE),
  ('MySQL',         'mysql',        'database', TRUE),
  ('Modelagem de Dados', 'data-modeling', 'database', TRUE),
  ('Pandas',        'pandas',       'ai_data',  FALSE),
  ('IA / ML',       'ai-ml',        'ai_data',  TRUE),
  ('Data Viz',      'data-viz',     'ai_data',  FALSE),
  ('HTML5',         'html5',        'frontend', FALSE),
  ('CSS3',          'css3',         'frontend', FALSE),
  ('JavaScript',    'javascript',   'frontend', TRUE),
  ('Tailwind CSS',  'tailwind',     'frontend', FALSE),
  ('React',         'react',        'frontend', FALSE),
  ('Node.js',       'nodejs',       'backend',  TRUE),
  ('Git / GitHub',  'git',          'tools',    FALSE),
  ('SEO',           'seo',          'tools',    FALSE);


-- =====================================================================
--  SEED — PROJETOS
--  ⚠ Métricas abaixo são FACTUAIS/QUALITATIVAS. Substitua por números
--    reais assim que tiver (ex.: nota Lighthouse, nº de clientes,
--    aumento de agendamentos) — número real converte mais que adjetivo.
-- =====================================================================
INSERT INTO projects
  (slug, title, tagline, summary, impact, status, category,
   github_url, live_url, cover_image, is_featured, featured_order, started_at, finished_at)
VALUES
  ('everyfounder', 'EveryFounder',
   'Sites profissionais e acessíveis para micro e pequenas empresas.',
   'Plataforma digital para desenvolvimento e entrega de websites profissionais para PMEs: processo padronizado de briefing, design, desenvolvimento e publicação, com foco em performance, SEO e conversão.',
   'Coloca negócios locais no digital com um site que gera contato, não só presença.',
   'active', 'saas',
   NULL, NULL, NULL, TRUE, 1, NULL, NULL),

  ('everycapital', 'EveryCapital',
   'Gestão financeira pessoal e empresarial (CPF/CNPJ) orientada a dados.',
   'Plataforma completa de controle financeiro com categorização de despesas, relatórios e dashboards analíticos. Modelagem relacional que separa perfis CPF e CNPJ e prepara a base para categorização automática com IA.',
   'Transforma extrato bruto em decisão: para onde o dinheiro vai e o que ajustar.',
   'in_progress', 'saas',
   NULL, NULL, NULL, TRUE, 2, NULL, NULL),

  ('everynutri', 'EveryNutri',
   'Planos alimentares, calorias e metas — nutricionista e paciente no mesmo lugar.',
   'Aplicação web para nutricionistas e clientes gerenciarem planos alimentares, acompanhamento calórico e metas nutricionais, com banco relacional para histórico de evolução.',
   'Reduz o atrito entre consulta e rotina: o plano sai do PDF e vira acompanhamento.',
   'mvp', 'saas',
   NULL, NULL, NULL, FALSE, 3, NULL, NULL),

  ('clinica-dra-gabriela', 'Clínica Dra. Gabriela Medeiros',
   'Website responsivo para a área médica.',
   'Website institucional responsivo construído com HTML, CSS e JavaScript Vanilla: hierarquia clara de informação, apresentação de especialidades e caminho direto para contato/agendamento.',
   'Presença digital profissional que transmite confiança ao paciente antes da consulta.',
   'concluded', 'client_work',
   NULL, 'https://SEU-LINK-AQUI.com', NULL, FALSE, 4, NULL, NULL),

  ('tonny-cabelos', 'Tonny Cabelos',
   'Landing page comercial focada em agendamentos.',
   'Landing page para salão de beleza estruturada para conversão: proposta de valor no topo, prova social, serviços e CTA de agendamento sempre visível.',
   'Página desenhada com um único objetivo: transformar visita em horário marcado.',
   'concluded', 'client_work',
   NULL, 'https://SEU-LINK-AQUI.com', NULL, FALSE, 5, NULL, NULL),

  ('projeto-locadora', 'Sistema de Locadora de Veículos',
   'Sistema de locação de veículos: regras de negócio em Python e painel web interativo.',
   'Começou como sistema em linha de comando em Python (cadastro de veículos, clientes e colaboradores, controle de estoque, seguro de 25% e desconto progressivo de 5%, 10% e 20%) e ganhou um front-end web com painel, simulação de valor em tempo real, comprovante, devolução e relatório financeiro.',
   'Precificação automatizada: do pedido ao comprovante sem nenhuma conta manual.',
   'concluded', 'database',
   NULL, 'locadora/', NULL, FALSE, 6, NULL, NULL);


-- Categorias de filtro (inclui a principal + secundárias)
INSERT INTO project_categories (project_id, category)
SELECT p.id, c.category
FROM projects p
JOIN (
  SELECT 'everyfounder' AS slug, 'saas'        AS category UNION ALL
  SELECT 'everyfounder',          'web_dev'                 UNION ALL
  SELECT 'everycapital',             'saas'                    UNION ALL
  SELECT 'everycapital',             'database'                UNION ALL
  SELECT 'everycapital',             'ai_data'                 UNION ALL
  SELECT 'everynutri',            'saas'                    UNION ALL
  SELECT 'everynutri',            'database'                UNION ALL
  SELECT 'clinica-dra-gabriela',  'client_work'             UNION ALL
  SELECT 'clinica-dra-gabriela',  'web_dev'                 UNION ALL
  SELECT 'tonny-cabelos',         'client_work'             UNION ALL
  SELECT 'tonny-cabelos',         'web_dev'                 UNION ALL
  SELECT 'projeto-locadora',      'database'                UNION ALL
  SELECT 'projeto-locadora',      'web_dev'
) c ON c.slug = p.slug;


-- Stack de cada projeto (por slug → sem depender de IDs fixos)
INSERT INTO project_technologies (project_id, technology_id, display_order)
SELECT p.id, t.id, s.ord
FROM (
  SELECT 'everyfounder' AS p, 'html5' AS t, 1 AS ord UNION ALL
  SELECT 'everyfounder', 'css3',          2 UNION ALL
  SELECT 'everyfounder', 'javascript',    3 UNION ALL
  SELECT 'everyfounder', 'seo',           4 UNION ALL
  SELECT 'everycapital', 'javascript',    1 UNION ALL
  SELECT 'everycapital', 'nodejs',        2 UNION ALL
  SELECT 'everycapital', 'mysql',         3 UNION ALL
  SELECT 'everycapital', 'data-modeling', 4 UNION ALL
  SELECT 'everycapital', 'html5',         5 UNION ALL
  SELECT 'everycapital', 'css3',          6 UNION ALL
  SELECT 'everycapital', 'data-viz',      7 UNION ALL
  SELECT 'everynutri',   'python',        1 UNION ALL
  SELECT 'everynutri',   'mysql',         2 UNION ALL
  SELECT 'everynutri',   'javascript',    3 UNION ALL
  SELECT 'clinica-dra-gabriela', 'html5',      1 UNION ALL
  SELECT 'clinica-dra-gabriela', 'css3',       2 UNION ALL
  SELECT 'clinica-dra-gabriela', 'javascript', 3 UNION ALL
  SELECT 'tonny-cabelos', 'html5',      1 UNION ALL
  SELECT 'tonny-cabelos', 'css3',       2 UNION ALL
  SELECT 'tonny-cabelos', 'javascript', 3 UNION ALL
  SELECT 'tonny-cabelos', 'seo',        4 UNION ALL
  SELECT 'projeto-locadora', 'python',     1 UNION ALL
  SELECT 'projeto-locadora', 'javascript', 2 UNION ALL
  SELECT 'projeto-locadora', 'html5',      3 UNION ALL
  SELECT 'projeto-locadora', 'css3',       4 UNION ALL
  SELECT 'projeto-locadora', 'git',        5
) s
JOIN projects     p ON p.slug = s.p
JOIN technologies t ON t.slug = s.t;


-- Métricas de impacto
INSERT INTO project_metrics (project_id, label, value, unit, metric_type, display_order)
SELECT p.id, m.label, m.value, m.unit, m.mtype, m.ord
FROM (
  SELECT 'everyfounder' AS p, 'Público-alvo' AS label, 'PMEs' AS value, NULL AS unit, 'business' AS mtype, 1 AS ord UNION ALL
  SELECT 'everyfounder', 'Entrega',            'Mobile-first', NULL, 'technical', 2 UNION ALL
  SELECT 'everycapital',    'Perfis suportados',  'CPF + CNPJ',   NULL, 'business',  1 UNION ALL
  SELECT 'everycapital', 'Modelo de negócio',  'Freemium',     NULL, 'business',  2 UNION ALL
  SELECT 'everycapital', 'Camada analítica',   'Dashboards',   NULL, 'technical', 3 UNION ALL
  SELECT 'everynutri',   'Usuários',           'Nutri + Paciente', NULL, 'business', 1 UNION ALL
  SELECT 'everynutri',   'Fase',               'MVP',          NULL, 'technical', 2 UNION ALL
  SELECT 'clinica-dra-gabriela', 'Dependências', '0',          'libs', 'technical', 1 UNION ALL
  SELECT 'clinica-dra-gabriela', 'Layout',       'Responsivo', NULL,  'technical', 2 UNION ALL
  SELECT 'tonny-cabelos', 'Objetivo',          'Agendamento',  NULL, 'business',  1 UNION ALL
  SELECT 'tonny-cabelos', 'CTA',               'Sempre visível', NULL, 'technical', 2 UNION ALL
  SELECT 'projeto-locadora', 'Desconto progressivo', 'até 20', '%', 'business', 1 UNION ALL
  SELECT 'projeto-locadora', 'Interfaces',         'CLI + Web', NULL, 'technical', 2
) m
JOIN projects p ON p.slug = m.p;


-- =====================================================================
--  VIEW — entrega cada projeto com stack, categorias e métricas em JSON.
--  É ela que o script Python lê para gerar data/projects.json.
-- =====================================================================
CREATE VIEW v_portfolio_projects AS
SELECT
  p.id, p.slug, p.title, p.tagline, p.summary, p.impact,
  p.status, p.category, p.github_url, p.live_url, p.cover_image,
  p.is_featured, p.featured_order,
  (SELECT JSON_ARRAYAGG(pc.category)
     FROM project_categories pc
    WHERE pc.project_id = p.id)                                   AS categories,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'name',      t.name,
            'highlight', t.is_highlight,
            'order',     pt.display_order))
     FROM project_technologies pt
     JOIN technologies t ON t.id = pt.technology_id
    WHERE pt.project_id = p.id)                                   AS stack,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'label', pm.label, 'value', pm.value, 'unit', pm.unit,
            'type',  pm.metric_type, 'order', pm.display_order))
     FROM project_metrics pm
    WHERE pm.project_id = p.id)                                   AS metrics
FROM projects p
WHERE p.is_published = TRUE
ORDER BY p.featured_order, p.id;
-- Obs.: JSON_ARRAYAGG não garante ordem; o campo "order" é usado pelo
-- script Python (scripts/export_projects.py) para ordenar stack e métricas.


-- =====================================================================
--  CONSULTAS ÚTEIS
-- =====================================================================
-- Projetos do filtro "Banco de Dados & Backend":
--   SELECT p.title FROM projects p
--   JOIN project_categories pc ON pc.project_id = p.id
--   WHERE pc.category = 'database' ORDER BY p.featured_order;
--
-- Tecnologias mais usadas no portfólio:
--   SELECT t.name, COUNT(*) AS projetos FROM project_technologies pt
--   JOIN technologies t ON t.id = pt.technology_id
--   GROUP BY t.name ORDER BY projetos DESC;
--
-- Payload completo:
--   SELECT * FROM v_portfolio_projects;
