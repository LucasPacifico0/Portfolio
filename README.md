# Portfólio — Lucas Pacífico

Site estático (HTML + CSS + JavaScript puros, zero dependências) alimentado por
um único arquivo de dados: `data/projects.json`. Opcionalmente, esse JSON é
gerado a partir de um banco **MySQL** por um script **Python**.

```
portfolio/
├── index.html                 ← estrutura semântica (hero, projetos, stack, sobre, CTA)
├── css/style.css              ← design system (variáveis no topo: cores, raio, fontes)
├── js/app.js                  ← render dos cards, filtros, animações, menu mobile
├── data/projects.json         ← FONTE ÚNICA dos projetos exibidos
├── database/schema.sql        ← modelagem MySQL + seeds dos 6 projetos + VIEW
├── scripts/export_projects.py ← MySQL → data/projects.json
├── locadora/                  ← front-end do Sistema de Locadora (aberto pelo card)
└── assets/                    ← favicon.svg + imagens (capas, foto)
```

---

## 1. Rodar localmente

O JS carrega o JSON via `fetch`, então **abra por um servidor** (clicar duas
vezes no `index.html` bloqueia o fetch por segurança do navegador):

```bash
cd portfolio
python -m http.server 5500
# abra http://localhost:5500
```

Ou use a extensão **Live Server** do VS Code.

## 2. Antes de publicar: checklist de links

Links com `SEU-USUARIO`, `SEU-LINK` ou `SEUNUMERO` aparecem como **botão
desativado ("Em breve")**, então o site já pode ir ao ar e você vai trocando aos poucos.

- [ ] `index.html`: WhatsApp → `https://wa.me/55DDDNUMERO`
- [x] `index.html`: LinkedIn → `https://www.linkedin.com/in/lucas-pacifico/`
- [x] `index.html`: GitHub → `https://github.com/LucasPacifico0`
- [ ] `data/projects.json`: `github_url` de cada projeto quando o repositório ficar **público** (ex.: `https://github.com/LucasPacifico0/Projeto-Locadora-`)
- [ ] `data/projects.json`: `live_url` da Clínica Dra. Gabriela Medeiros e da Tonny Cabelos
- [ ] `data/projects.json`: `live_url` do EveryCapital quando o everycapital.com.br estiver no ar
- [ ] Repita as mesmas trocas em `database/schema.sql` se for usar o MySQL
- [ ] (Opcional) capas em `assets/` + campo `cover_image`

Dica: no VS Code, `Ctrl+Shift+F` → busque `SEU` para achar todos de uma vez.

**Métricas:** as atuais são qualitativas ("CPF + CNPJ", "Mobile-first"). Assim
que tiver números reais (nota do Lighthouse, nº de clientes, +X% de
agendamentos), troque. Número real converte muito mais que adjetivo.

## 3. Publicar (grátis)

- **GitHub Pages:** suba a pasta em um repositório → *Settings → Pages →
  Deploy from branch → main / root*.
- **Netlify / Vercel:** arraste a pasta. Não há build, é só arquivo estático.

---

## 4. Como adicionar um novo projeto

### Opção A — JSON direto (mais simples)

Copie um objeto dentro de `"projects"` em `data/projects.json` e edite:

```json
{
  "slug": "meu-novo-projeto",
  "title": "Meu Novo Projeto",
  "tagline": "Uma frase de valor.",
  "summary": "O que é e como foi construído.",
  "impact": "Resultado de negócio em uma linha.",
  "status": "in_progress",
  "category": "ai_data",
  "categories": ["ai_data", "database"],
  "github_url": "https://github.com/...",
  "live_url": null,
  "is_featured": false,
  "featured_order": 6,
  "stack": [{ "name": "Python", "highlight": true }, { "name": "Pandas", "highlight": false }],
  "metrics": [{ "label": "Acurácia", "value": "92", "unit": "%", "type": "technical" }]
}
```

Pronto. Os contadores dos filtros, os números do hero e a ordem se atualizam sozinhos.

**Regras que mantêm o layout estável:**

| Campo | Valores aceitos | Se faltar |
|---|---|---|
| `status` | `active`, `in_progress`, `mvp`, `concluded` | vira `in_progress` |
| `categories` | `ai_data`, `database`, `web_dev`, `saas`, `client_work` | usa `category` |
| `is_featured` | `true` = card largo (2 colunas). Use no máx. 2–3 | `false` |
| `featured_order` | menor aparece primeiro | `999` (fim) |
| `metrics` | até 4 (o resto é ignorado) | seção some |
| `stack` | objetos `{name, highlight}` ou strings `"Python"` | seção some |

Mapeamento dos filtros (em `js/app.js → FILTERS`):

| Botão | Categorias do banco |
|---|---|
| IA & Data Science | `ai_data` |
| Banco de Dados & Backend | `database` |
| SaaS & Produtos | `saas` |
| Frontend & Clientes | `web_dev` ou `client_work` |

Filtros sem projeto ficam desabilitados automaticamente. Cada filtro tem link
compartilhável, ex.: `seusite.com/?filtro=database#projetos`. Útil para mandar a
um recrutador de dados só o que interessa a ele.

### Opção B — MySQL como fonte da verdade (recomendado a médio prazo)

1. Crie o banco:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. Insira o projeto (exemplo):
   ```sql
   INSERT INTO projects (slug, title, tagline, summary, impact, status, category, github_url, featured_order)
   VALUES ('churn-predictor', 'Churn Predictor', 'Prevê cancelamento de clientes.',
           'Modelo de ML treinado em Python...', 'Antecipa quem vai cancelar.',
           'mvp', 'ai_data', 'https://github.com/...', 6);

   SET @id = LAST_INSERT_ID();
   INSERT INTO project_categories VALUES (@id, 'ai_data'), (@id, 'database');
   INSERT INTO project_technologies (project_id, technology_id, display_order)
     SELECT @id, id, 1 FROM technologies WHERE slug = 'python';
   INSERT INTO project_metrics (project_id, label, value, unit, metric_type)
     VALUES (@id, 'Acurácia', '92', '%', 'technical');
   ```
   Tecnologia nova? `INSERT INTO technologies (name, slug, pillar, is_highlight) VALUES ('Scikit-learn','sklearn','ai_data',FALSE);`
3. Exporte para o site:
   ```bash
   pip install mysql-connector-python
   DB_PASS=suasenha python scripts/export_projects.py
   ```
4. Faça commit do `data/projects.json` e pronto.

Ocultar sem apagar: `UPDATE projects SET is_published = FALSE WHERE slug = '...';`

### Por que JSON gerado e não o site consultando o MySQL direto?

Site estático = carregamento instantâneo, nota alta no Core Web Vitals,
hospedagem grátis e nenhuma senha de banco exposta no front-end. O banco fica
no seu ambiente; o site recebe só o resultado.

---

## 5. Evoluções "IA Ready"

A tabela `project_embeddings` já está pronta para:

- **Busca semântica:** gere embeddings de `title + summary + stack` em Python,
  salve no banco e permita buscas como "projetos com dashboards financeiros".
- **Assistente do portfólio (RAG):** um chat que responde a recrutadores com
  base nos seus projetos reais.
- `source_hash` evita recalcular embeddings de projetos que não mudaram.

## 6. Personalizar o visual

Todas as cores estão em `:root` no topo de `css/style.css` (`--bg`, `--accent`
etc.). Trocar `--accent` muda o tema inteiro. Animações respeitam
`prefers-reduced-motion` automaticamente.

## 7. Projetos com demo dentro do portfólio

O Sistema de Locadora fica em `locadora/` e o card aponta para ele com
`"live_url": "locadora/"`. Para hospedar outra demo do mesmo jeito: crie a pasta
(ex.: `everynutri-demo/`), coloque o `index.html` dela e use o caminho relativo
em `live_url`. Os dados da locadora ficam salvos no navegador de quem usa
(localStorage); o botão "Restaurar dados de exemplo" volta ao estado inicial.
