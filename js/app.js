/* =====================================================================
   PORTFÓLIO — app.js (JavaScript Vanilla, sem dependências)
   Fonte única de dados: data/projects.json
   ===================================================================== */
(() => {
  "use strict";

  const DATA_URL = "data/projects.json";

  /* ------------------------------------------------------------------
     CONFIGURAÇÃO — rótulos e regras de filtro.
     Para criar um filtro novo: adicione aqui + um <button data-filter>.
     ------------------------------------------------------------------ */
  const STATUS_LABEL = {
    active:      "Ativo",
    in_progress: "Em andamento",
    mvp:         "MVP",
    concluded:   "Concluído",
  };

  // Cada filtro do front-end aceita uma ou mais categorias do banco.
  const FILTERS = {
    all:      null,                        // null = mostra tudo
    ai_data:  ["ai_data"],
    database: ["database"],
    saas:     ["saas"],
    frontend: ["web_dev", "client_work"],
  };

  const FILTER_LABEL = {
    all: "Todos", ai_data: "IA & Data Science", database: "Banco de Dados & Backend",
    saas: "SaaS & Produtos", frontend: "Frontend & Clientes",
  };

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Escapa texto vindo do JSON/banco antes de ir para o HTML */
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const isRealUrl = (url) => !!url && !/SEU-(USUARIO|LINK)/i.test(url);

  /* ------------------------------------------------------------------
     NORMALIZAÇÃO — garante que um projeto incompleto não quebre o layout
     ------------------------------------------------------------------ */
  function normalize(p, i) {
    return {
      slug:           p.slug || `projeto-${i + 1}`,
      title:          p.title || "Projeto sem título",
      tagline:        p.tagline || "",
      summary:        p.summary || "",
      impact:         p.impact || "",
      status:         STATUS_LABEL[p.status] ? p.status : "in_progress",
      categories:     Array.isArray(p.categories) && p.categories.length ? p.categories : [p.category].filter(Boolean),
      github_url:     p.github_url || null,
      live_url:       p.live_url || null,
      is_featured:    Boolean(p.is_featured),
      featured_order: Number.isFinite(+p.featured_order) ? +p.featured_order : 999,
      stack:          (p.stack || []).map((t) => (typeof t === "string" ? { name: t, highlight: false } : t)),
      metrics:        (p.metrics || []).slice(0, 4),
    };
  }

  /* ------------------------------------------------------------------
     TEMPLATE DO CARD
     ------------------------------------------------------------------ */
  const ICON_IMPACT = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICON_EXT    = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICON_GH     = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>`;

  function actionButton(url, label, icon, primary) {
    const cls = `btn btn--sm ${primary ? "btn--primary" : "btn--ghost"}`;
    if (isRealUrl(url)) {
      // link externo abre em nova aba; demo interna (ex.: "locadora/") abre na mesma
      const ext = /^https?:\/\//i.test(url) ? ` target="_blank" rel="noopener"` : "";
      return `<a class="${cls}" href="${esc(url)}"${ext}>${icon}${label}</a>`;
    }
    // Link ainda não definido → botão visível mas desabilitado (layout não muda)
    return `<span class="${cls}" aria-disabled="true" title="Em breve">${icon}${label}</span>`;
  }

  function cardTemplate(p, index) {
    const metrics = p.metrics.length
      ? `<dl class="metrics">${p.metrics.map((m) => `
          <div class="metric"><dt>${esc(m.label)}</dt><dd>${esc(m.value)}${m.unit ? `<small>${esc(m.unit)}</small>` : ""}</dd></div>`).join("")}
        </dl>` : "";

    const stack = p.stack.length
      ? `<ul class="stack" aria-label="Tecnologias">${p.stack.map((t) =>
          `<li class="${t.highlight ? "is-hl" : ""}">${esc(t.name)}</li>`).join("")}</ul>` : "";

    const impact = p.impact
      ? `<p class="project__impact">${ICON_IMPACT}<span>${esc(p.impact)}</span></p>` : "";

    const main = `
      <h3 class="project__title">${esc(p.title)}</h3>
      <p class="project__tagline">${esc(p.tagline)}</p>
      <p class="project__summary">${esc(p.summary)}</p>`;

    const side = `${impact}${metrics}${stack}
      <div class="project__actions">
        ${actionButton(p.live_url, "Ver Projeto", ICON_EXT, true)}
        ${actionButton(p.github_url, "Repositório GitHub", ICON_GH, false)}
      </div>`;

    return `
      <article class="project glass ${p.is_featured ? "project--featured" : ""}"
               data-categories="${esc(p.categories.join(" "))}" id="projeto-${esc(p.slug)}">
        <div class="project__top">
          <span class="project__index">${String(index + 1).padStart(2, "0")} / ${esc(p.slug)}</span>
          <div class="badges-row">
            ${p.is_featured ? `<span class="featured-tag">destaque</span>` : ""}
            <span class="status status--${p.status}">${STATUS_LABEL[p.status]}</span>
          </div>
        </div>
        ${p.is_featured
          ? `<div class="project__body"><div>${main}</div><div>${side}</div></div>`
          : `${main}${side}`}
      </article>`;
  }

  /* ------------------------------------------------------------------
     FILTROS
     ------------------------------------------------------------------ */
  const matches = (cats, filter) => !FILTERS[filter] || FILTERS[filter].some((c) => cats.includes(c));

  function setupFilters(projects) {
    const grid = $("#projects-grid");
    const chips = $$("#filters .chip");
    const status = $("#filter-status");

    // Contadores em cada chip + desabilita filtros vazios
    chips.forEach((chip) => {
      const f = chip.dataset.filter;
      const n = projects.filter((p) => matches(p.categories, f)).length;
      $(".chip__count", chip).textContent = n;
      chip.disabled = n === 0;
    });

    function apply(filter, { pushUrl = true } = {}) {
      if (!(filter in FILTERS)) filter = "all";
      let visible = 0;

      chips.forEach((c) => {
        const on = c.dataset.filter === filter;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", String(on));
      });

      $$(".project", grid).forEach((card) => {
        const show = matches(card.dataset.categories.split(" "), filter);
        card.classList.toggle("is-hidden", !show);
        card.classList.remove("is-entering");
        if (show) {
          visible++;
          if (!reduceMotion) {
            void card.offsetWidth; // reinicia animação
            card.style.animationDelay = `${(visible - 1) * 60}ms`;
            card.classList.add("is-entering");
          }
        }
      });

      $(".empty", grid)?.remove();
      if (!visible) grid.insertAdjacentHTML("beforeend", `<p class="empty">Nenhum projeto nesta categoria ainda.</p>`);

      status.textContent = `${visible} projeto(s) em ${FILTER_LABEL[filter]}`;

      if (pushUrl) {
        const url = new URL(location.href);
        filter === "all" ? url.searchParams.delete("filtro") : url.searchParams.set("filtro", filter);
        try { history.replaceState(null, "", url); } catch { /* ambientes sandbox */ }
      }
    }

    $("#filters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip && !chip.disabled) apply(chip.dataset.filter);
    });

    // Link compartilhável: index.html?filtro=database#projetos
    apply(new URLSearchParams(location.search).get("filtro") || "all", { pushUrl: false });
  }

  /* ------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------ */
  async function loadProjects() {
    const grid = $("#projects-grid");
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = (Array.isArray(json) ? json : json.projects || [])
        .map(normalize)
        .sort((a, b) => (b.is_featured - a.is_featured) || (a.featured_order - b.featured_order));

      grid.innerHTML = list.map(cardTemplate).join("");
      setupFilters(list);
      setupSpotlight();

      // Números do hero vêm dos dados — nunca ficam desatualizados
      $("[data-count-projects]").textContent = list.length;
      $("[data-count-live]").textContent = list.filter((p) => ["active", "concluded"].includes(p.status)).length;
    } catch (err) {
      console.error("[portfolio] Falha ao carregar projetos:", err);
      grid.innerHTML = `<p class="empty">Não foi possível carregar <code>${DATA_URL}</code>.<br>
        Abra o site por um servidor local (ex.: <code>python -m http.server</code>) em vez de clicar duas vezes no arquivo.</p>`;
    }
  }

  /* Spotlight que segue o cursor nos cards */
  function setupSpotlight() {
    if (reduceMotion || !matchMedia("(hover: hover)").matches) return;
    $("#projects-grid").addEventListener("pointermove", (e) => {
      const card = e.target.closest(".project");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  /* ------------------------------------------------------------------
     TERMINAL DO HERO (efeito de digitação)
     ------------------------------------------------------------------ */
  function typeTerminal() {
    const el = $("#terminal-code");
    if (!el) return;
    const lines = [
      [["c", "-- o que eu construo"]],
      [["k", "SELECT "], ["f", "p.title"], ["", ", "], ["f", "p.status"]],
      [["k", "FROM "], ["", "projects p"]],
      [["k", "JOIN "], ["", "project_categories pc "], ["k", "USING"], ["", " (id)"]],
      [["k", "WHERE "], ["", "pc.category "], ["k", "IN "], ["", "("], ["s", "'ai_data'"], ["", ", "], ["s", "'saas'"], ["", ")"]],
      [["k", "ORDER BY "], ["", "featured_order;"]],
      [["", ""]],
      [["c", "# python → automação"]],
      [["k", "df "], ["", "= "], ["f", "pd.read_sql"], ["", "(query, conn)"]],
      [["f", "dashboard"], ["", ".publish(df)  "], ["c", "# "], ["n", "✓ 0.21s"]],
    ];

    const html = lines.map((l) => l.map(([cls, t]) => cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t)).join("")).join("\n");
    if (reduceMotion) { el.innerHTML = html; return; }

    // Digita caractere por caractere preservando as cores
    const tokens = lines.flatMap((l, i) => [...l, ...(i < lines.length - 1 ? [["", "\n"]] : [])]);
    let ti = 0, ci = 0, out = "";
    (function step() {
      if (ti >= tokens.length) return;
      const [cls, text] = tokens[ti];
      ci++;
      const partial = esc(text.slice(0, ci));
      el.innerHTML = out + (cls ? `<span class="${cls}">${partial}</span>` : partial);
      if (ci >= text.length) {
        out += cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text);
        ti++; ci = 0;
      }
      setTimeout(step, text === "\n" ? 140 : 18 + Math.random() * 22);
    })();
  }

  /* ------------------------------------------------------------------
     UI GERAL: nav, reveal, menu mobile, copiar e-mail
     ------------------------------------------------------------------ */
  function setupUI() {
    document.documentElement.classList.remove("no-js");
    // Links ainda não configurados (SEU-USUARIO / SEU-LINK / SEUNUMERO) ficam desativados
    $$("a[href]").forEach((a) => {
      if (/SEU-(USUARIO|LINK)|SEUNUMERO/i.test(a.getAttribute("href"))) {
        a.setAttribute("aria-disabled", "true"); a.setAttribute("title", "Em breve"); a.removeAttribute("href");
      }
    });
    $("#year").textContent = new Date().getFullYear();

    // Nav com fundo ao rolar
    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 20);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // Menu mobile
    const toggle = $("#nav-toggle"), links = $("#nav-links");
    const closeMenu = () => { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Abrir menu"); };
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    links.addEventListener("click", (e) => e.target.closest("a") && closeMenu());
    addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

    // Reveal on scroll
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

    // Link ativo no menu
    const sections = $$("main section[id]");
    const navIO = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      $$(".nav__links a").forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${en.target.id}`));
    }), { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => navIO.observe(s));

    // Copiar e-mail
    const copyBtn = $("#copy-email");
    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.email);
        copyBtn.classList.add("is-copied"); $("span", copyBtn).textContent = "copiado ✓";
        setTimeout(() => { copyBtn.classList.remove("is-copied"); $("span", copyBtn).textContent = "copiar"; }, 2000);
      } catch { location.href = `mailto:${copyBtn.dataset.email}`; }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupUI();
    typeTerminal();
    loadProjects();
  });
})();
