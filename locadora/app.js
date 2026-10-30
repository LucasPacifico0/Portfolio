/* =====================================================================
   LOCADORA — front-end do locadoraprincipal.py (JavaScript Vanilla)
   Mesmas regras de negócio do Python:
     • seguro = 25% do valor do aluguel
     • desconto sobre (aluguel + seguro): >5 dias 5% | >15 dias 10% | >30 dias 20%
     • cada locação tira 1 do estoque do veículo
   Dados salvos no navegador (localStorage).
   ===================================================================== */
(() => {
  "use strict";

  const STORAGE_KEY = "locadora:v3"; // nova chave = navegadores antigos recebem os nomes novos
  const SEGURO = 0.25;

  /* Dados iniciais — mesmos IDs, veículos e regras do locadoraprincipal.py (nomes fictícios) */
  const SEED = () => ({
    veiculos: {
      1: { placa: "ABC-1234", marca: "Toyota",     modelo: "Corolla", estoque: 1, valor_aluguel: 200 },
      2: { placa: "XYZ-5643", marca: "Honda",      modelo: "Civic",   estoque: 1, valor_aluguel: 180 },
      3: { placa: "XEZ-5387", marca: "Chevrolet",  modelo: "Celta",   estoque: 1, valor_aluguel: 120 },
      4: { placa: "XWZ-5274", marca: "BYD",        modelo: "Dolphin", estoque: 1, valor_aluguel: 250 },
      5: { placa: "XQZ-5182", marca: "FIAT",       modelo: "Palio",   estoque: 1, valor_aluguel: 100 },
      6: { placa: "XAZ-5954", marca: "Volkswagen", modelo: "Virtus",  estoque: 1, valor_aluguel: 170 },
      7: { placa: "QJK-2T81", marca: "Hyundai", modelo: "HB20", estoque: 2, valor_aluguel: 130 },
      8: { placa: "RFA-7B42", marca: "Renault", modelo: "Kwid", estoque: 2, valor_aluguel: 95 },
      9: { placa: "PLM-3C19", marca: "Jeep", modelo: "Compass", estoque: 1, valor_aluguel: 320 },
      10: { placa: "SDE-8H55", marca: "Toyota", modelo: "Hilux", estoque: 1, valor_aluguel: 380 },
      11: { placa: "OUV-4K07", marca: "Fiat", modelo: "Strada", estoque: 2, valor_aluguel: 160 },
      12: { placa: "NBX-6J93", marca: "Volkswagen", modelo: "T-Cross", estoque: 1, valor_aluguel: 230 },
      13: { placa: "MTR-1P66", marca: "Chevrolet", modelo: "Onix", estoque: 3, valor_aluguel: 140 },
      14: { placa: "KLW-9E24", marca: "Nissan", modelo: "Kicks", estoque: 1, valor_aluguel: 210 },
    },
    colaboradores: {
      100: { nome: "Camila Rocha" }, 101: { nome: "Diego Albuquerque" }, 102: { nome: "Patrícia Nogueira" },
      103: { nome: "Rodrigo Cavalcanti" }, 104: { nome: "Juliana Batista" }, 105: { nome: "Thiago Moura" },
    },
    clientes: {
      10: { nome: "Mariana Lopes" }, 11: { nome: "Felipe Andrade" }, 12: { nome: "Beatriz Fernandes" },
      13: { nome: "Gustavo Ribeiro" }, 14: { nome: "Larissa Teixeira" }, 15: { nome: "Eduardo Carvalho" },
    },
    locacoes: [],
  });

  /* ---------------- Estado + persistência ---------------- */
  let db = load();
  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
    return SEED();
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {} }

  /* ---------------- Helpers ---------------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nextId = (obj) => Math.max(0, ...Object.keys(obj).map(Number)) + 1;      // = max(keys) + 1 do Python
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const today = () => new Date().toLocaleDateString("pt-BR");

  /* Regra de negócio — espelho da função locacao() do Python */
  function calcular(diaria, dias) {
    const valor_base = diaria * dias;
    const seguro = valor_base * SEGURO;
    const total_bruto = valor_base + seguro;
    let desconto = 0;
    if (dias > 30) desconto = 0.20;
    else if (dias > 15) desconto = 0.10;
    else if (dias > 5) desconto = 0.05;
    const valor_descontado = total_bruto * desconto;
    return { valor_base, seguro, total_bruto, desconto, valor_descontado, total_final: total_bruto - valor_descontado };
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("is-on"), 2400);
  }

  /* ---------------- Navegação ---------------- */
  function go(view) {
    $$(".view").forEach((v) => { const on = v.id === `view-${view}`; v.hidden = !on; v.classList.toggle("is-active", on); });
    $$("[data-view]").forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("is-active", on);
      if (b.hasAttribute("role")) b.setAttribute("aria-selected", String(on));
    });
    window.scrollTo({ top: 0 });
    render();
  }
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-view], [data-goto]");
    if (nav) go(nav.dataset.view || nav.dataset.goto);
  });

  /* ---------------- Render: Painel ---------------- */
  function renderPainel() {
    const carros = Object.values(db.veiculos);
    const disponiveis = carros.filter((c) => c.estoque > 0).length;
    const ativas = db.locacoes.filter((l) => !l.devolvida).length;
    const receita = db.locacoes.reduce((s, l) => s + l.Total_com_desconto, 0);

    $("#kpis").innerHTML = [
      ["Receita total", brl(receita), `${db.locacoes.length} locação(ões)`, true],
      ["Frota disponível", `${disponiveis}/${carros.length}`, "veículos prontos para locar"],
      ["Locações ativas", ativas, "aguardando devolução"],
      ["Clientes", Object.keys(db.clientes).length, `${Object.keys(db.colaboradores).length} colaboradores`],
    ].map(([t, v, s, a]) => `<dl class="card kpi ${a ? "kpi--accent" : ""}"><dt>${t}</dt><dd>${v}</dd><small>${s}</small></dl>`).join("");

    const ult = db.locacoes.slice(-5).reverse();
    $("#ultimas").innerHTML = ult.length
      ? `<ul class="mini">${ult.map((l) => `<li><div>${esc(l.Cliente)}<small>${esc(l.Veiculo)} · ${l.dias} dia(s) · ${esc(l.Data)}</small></div><strong>${brl(l.Total_com_desconto)}</strong></li>`).join("")}</ul>`
      : `<p class="empty">Nenhuma locação ainda. <button class="link" data-goto="locacao">Fazer a primeira →</button></p>`;

    $("#avail").innerHTML = Object.values(db.veiculos).map((c) => {
      const locados = db.locacoes.filter((l) => !l.devolvida && l.Placa === c.placa).length;
      const total = c.estoque + locados || 1;
      const pct = Math.round((c.estoque / total) * 100);
      return `<li><span>${esc(c.modelo)} <small style="color:var(--dim)">${esc(c.marca)}</small></span>
        <span class="badge ${c.estoque > 0 ? "badge--ok" : "badge--out"}">${c.estoque > 0 ? `${c.estoque} disponível` : "locado"}</span>
        <span class="bar"><i style="width:${Math.max(pct, 4)}%" class="${c.estoque > 0 ? "" : "is-out"}"></i></span></li>`;
    }).join("");
  }

  /* ---------------- Render: Nova locação ---------------- */
  function fillSelect(sel, obj, placeholder) {
    const cur = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      Object.entries(obj).map(([id, p]) => `<option value="${id}">${id} — ${esc(p.nome)}</option>`).join("");
    if (cur && obj[cur]) sel.value = cur;
  }

  function renderLocacao() {
    fillSelect($("#f-cliente"), db.clientes, "Selecione o cliente");
    fillSelect($("#f-colab"), db.colaboradores, "Selecione o colaborador");
    const cur = $("input[name=veiculo]:checked")?.value;
    $("#car-picker").innerHTML = Object.entries(db.veiculos).map(([id, c]) => `
      <div class="car-opt">
        <input type="radio" name="veiculo" id="v-${id}" value="${id}" ${c.estoque <= 0 ? "disabled" : ""} ${cur === id && c.estoque > 0 ? "checked" : ""}/>
        <label for="v-${id}"><b>${esc(c.modelo)}</b><small>${esc(c.marca)} · ${esc(c.placa)}${c.estoque <= 0 ? " · indisponível" : ""}</small><span>${brl(c.valor_aluguel)}/dia</span></label>
      </div>`).join("");
    updateResumo();
  }

  function updateResumo() {
    const dias = Math.max(1, parseInt($("#f-dias").value, 10) || 1);
    const vid = $("input[name=veiculo]:checked")?.value;
    const car = vid && db.veiculos[vid];

    // destaca só a faixa de desconto que se aplica agora
    const faixa = dias > 30 ? 31 : dias > 15 ? 16 : dias > 5 ? 6 : 0;
    $$("#tiers span").forEach((s) => s.classList.toggle("is-on", +s.dataset.min === faixa));
    $("#s-dias").textContent = dias;

    if (!car) {
      $("#sum-car").textContent = "Selecione um veículo";
      ["#s-diaria", "#s-base", "#s-seguro", "#s-desc"].forEach((s) => ($(s).textContent = "—"));
      $("#s-desc-pct").textContent = "0"; $("#s-total").textContent = brl(0);
      return;
    }
    const r = calcular(car.valor_aluguel, dias);
    $("#sum-car").innerHTML = `<b>${esc(car.modelo)}</b>${esc(car.marca)} · ${esc(car.placa)}`;
    $("#s-diaria").textContent = brl(car.valor_aluguel);
    $("#s-base").textContent = brl(r.valor_base);
    $("#s-seguro").textContent = brl(r.seguro);
    $("#s-desc-pct").textContent = r.desconto * 100;
    $("#s-desc").textContent = r.valor_descontado ? `− ${brl(r.valor_descontado)}` : brl(0);
    $("#s-total").textContent = brl(r.total_final);
  }

  $("#form-locacao").addEventListener("input", updateResumo);
  $("#form-locacao").addEventListener("change", updateResumo);
  $$(".days__btn").forEach((b) => b.addEventListener("click", () => {
    const inp = $("#f-dias");
    inp.value = Math.min(365, Math.max(1, (parseInt(inp.value, 10) || 1) + +b.dataset.step));
    updateResumo();
  }));

  $("#form-locacao").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("#form-error");
    const idCli = $("#f-cliente").value, idCol = $("#f-colab").value;
    const idVei = $("input[name=veiculo]:checked")?.value;
    const dias = parseInt($("#f-dias").value, 10);

    $("#f-cliente").classList.toggle("is-invalid", !idCli);
    $("#f-colab").classList.toggle("is-invalid", !idCol);
    if (!idCli || !idCol || !idVei) { err.textContent = "Selecione cliente, colaborador e veículo."; return; }
    if (!dias || dias < 1) { err.textContent = "Informe uma quantidade de dias válida."; return; }

    const veiculo = db.veiculos[idVei];
    if (veiculo.estoque <= 0) { err.textContent = "Veículo indisponível."; return; }
    err.textContent = "";

    const r = calcular(veiculo.valor_aluguel, dias);
    veiculo.estoque -= 1;                                             // tira do estoque

    const loc = {                                                     // mesmo formato do dados_locacao
      id: db.locacoes.length ? db.locacoes[db.locacoes.length - 1].id + 1 : 1,
      Data: today(),
      Cliente: db.clientes[idCli].nome,
      Vendedor: db.colaboradores[idCol].nome,
      Veiculo: veiculo.modelo,
      Placa: veiculo.placa,
      veiculo_id: Number(idVei),
      dias,
      valor_unitario: veiculo.valor_aluguel,
      total_aluguel: r.valor_base,
      Seguro: r.seguro,
      desconto: r.desconto,
      Total_com_desconto: r.total_final,
      devolvida: false,
    };
    db.locacoes.push(loc);
    save();

    e.target.reset(); $("#f-dias").value = 1;
    renderLocacao();
    showReceipt(loc);
  });

  /* ---------------- Comprovante ---------------- */
  let lastReceiptText = "";
  function showReceipt(l) {
    const rows = [
      ["Data", l.Data], ["Cliente", l.Cliente], ["Vendedor", l.Vendedor], ["Veículo", l.Veiculo], ["Placa", l.Placa],
      ["Valor da diária", brl(l.valor_unitario)], ["Dias", l.dias], ["Total aluguel", brl(l.total_aluguel)],
      ["Seguro (25%)", brl(l.Seguro)], ["Desconto", `${l.desconto * 100}%`],
    ];
    $("#r-id").textContent = `Locação nº ${String(l.id).padStart(4, "0")}`;
    $("#r-rows").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    $("#r-total").textContent = brl(l.Total_com_desconto);
    lastReceiptText = ["--- COMPROVANTE DE LOCAÇÃO ---", ...rows.map(([k, v]) => `${k}: ${v}`),
      `Total final: ${brl(l.Total_com_desconto)}`, "------------------------------"].join("\n");
    const dlg = $("#receipt");
    dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  }
  $("#r-close").addEventListener("click", () => { $("#receipt").close(); go("painel"); });
  $("#r-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(lastReceiptText); toast("Comprovante copiado"); }
    catch { toast("Não foi possível copiar"); }
  });

  /* ---------------- Render: Frota ---------------- */
  function renderFrota() {
    $("#cars").innerHTML = Object.entries(db.veiculos).map(([id, c]) => `
      <article class="card car">
        <div class="car__top"><span class="plate">${esc(c.placa)}</span>
          <span class="badge ${c.estoque > 0 ? "badge--ok" : "badge--out"}">${c.estoque > 0 ? "Disponível" : "Locado"}</span></div>
        <div><h3>${esc(c.modelo)}</h3><small>${esc(c.marca)} · ID ${id} · estoque ${c.estoque}</small></div>
        <div class="car__foot"><span class="car__price">${brl(c.valor_aluguel)} <small>/dia</small></span>
          ${c.estoque > 0 && !db.locacoes.some((l) => !l.devolvida && l.veiculo_id === +id)
            ? `<button class="btn--danger-ghost" data-del-car="${id}">Remover</button>` : ""}</div>
      </article>`).join("");
  }

  $("#form-carro").addEventListener("submit", (e) => {
    e.preventDefault();
    const placa = $("#c-placa").value.trim().toUpperCase();
    const marca = $("#c-marca").value.trim();
    const modelo = $("#c-modelo").value.trim();
    const valor = parseFloat($("#c-valor").value);
    const err = $("#carro-error");
    if (!placa || !marca || !modelo || !(valor > 0)) { err.textContent = "Preencha placa, marca, modelo e uma diária maior que zero."; return; }
    if (Object.values(db.veiculos).some((v) => v.placa.toUpperCase() === placa)) { err.textContent = "Já existe um veículo com essa placa."; return; }
    err.textContent = "";
    db.veiculos[nextId(db.veiculos)] = { placa, marca, modelo, estoque: 1, valor_aluguel: valor };
    save(); e.target.reset(); renderFrota(); toast(`${modelo} adicionado à frota`);
  });

  $("#cars").addEventListener("click", (e) => {
    const id = e.target.closest("[data-del-car]")?.dataset.delCar;
    if (!id) return;
    const nome = db.veiculos[id].modelo;
    delete db.veiculos[id]; save(); renderFrota(); toast(`${nome} removido`);
  });

  /* ---------------- Render: Pessoas ---------------- */
  function renderPessoas() {
    ["clientes", "colaboradores"].forEach((k) => {
      const list = Object.entries(db[k]);
      $(`#count-${k}`).textContent = list.length;
      $(`#list-${k}`).innerHTML = list.map(([id, p]) =>
        `<li><span class="avatar">${esc(initials(p.nome))}</span>${esc(p.nome)}<span class="id">#${id}</span></li>`).join("");
    });
  }
  $$(".add-row").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("input", f), nome = inp.value.trim(), kind = f.dataset.kind;
    if (!nome) { inp.classList.add("is-invalid"); inp.focus(); return; }
    inp.classList.remove("is-invalid");
    db[kind][nextId(db[kind])] = { nome };
    save(); inp.value = ""; renderPessoas(); toast(`${nome} cadastrado(a)`);
  }));

  /* ---------------- Render: Relatório ---------------- */
  function renderRelatorio() {
    const total_aluguel = db.locacoes.reduce((s, l) => s + l.total_aluguel, 0);
    const total_seguros = db.locacoes.reduce((s, l) => s + l.Seguro, 0);
    const total_locado  = db.locacoes.reduce((s, l) => s + l.Total_com_desconto, 0);

    $("#fin").innerHTML = [
      ["Valor dos aluguéis", total_aluguel], ["Valor dos seguros", total_seguros], ["Valor das locações", total_locado, true],
    ].map(([t, v, a]) => `<dl class="card kpi ${a ? "kpi--accent" : ""}"><dt>${t}</dt><dd>${brl(v)}</dd></dl>`).join("");

    $("#count-locacoes").textContent = db.locacoes.length;
    const tb = $("#table-locacoes tbody");
    tb.innerHTML = db.locacoes.length ? db.locacoes.slice().reverse().map((l) => `
      <tr>
        <td class="num">${String(l.id).padStart(4, "0")}</td><td>${esc(l.Data)}</td><td>${esc(l.Cliente)}</td><td>${esc(l.Vendedor)}</td>
        <td>${esc(l.Veiculo)} <small style="color:var(--dim)">${esc(l.Placa)}</small></td>
        <td class="num">${l.dias}</td><td class="num">${brl(l.total_aluguel)}</td><td class="num">${brl(l.Seguro)}</td>
        <td class="num">${brl(l.Total_com_desconto)}</td>
        <td><span class="badge ${l.devolvida ? "badge--done" : "badge--active"}">${l.devolvida ? "Devolvido" : "Em andamento"}</span></td>
        <td>${l.devolvida ? "" : `<button class="btn--return" data-return="${l.id}">Devolver</button>`}</td>
      </tr>`).join("")
      : `<tr><td colspan="11" class="empty">Nenhuma locação registrada.</td></tr>`;
  }

  // Devolução: volta o veículo ao estoque (não existia no Python — extensão natural)
  $("#table-locacoes").addEventListener("click", (e) => {
    const id = +e.target.closest("[data-return]")?.dataset.return;
    if (!id) return;
    const loc = db.locacoes.find((l) => l.id === id);
    if (!loc || loc.devolvida) return;
    loc.devolvida = true;
    const car = db.veiculos[loc.veiculo_id] || Object.values(db.veiculos).find((v) => v.placa === loc.Placa);
    if (car) car.estoque += 1;
    save(); renderRelatorio(); toast(`${loc.Veiculo} devolvido ao estoque`);
  });

  /* ---------------- Reset ---------------- */
  $("#reset-btn").addEventListener("click", () => {
    db = SEED(); save(); render(); toast("Dados de exemplo restaurados");
  });

  /* ---------------- Render principal ---------------- */
  function render() {
    const view = $(".view.is-active")?.id.replace("view-", "");
    ({ painel: renderPainel, locacao: renderLocacao, frota: renderFrota, pessoas: renderPessoas, relatorio: renderRelatorio }[view] || renderPainel)();
  }

  render();
})();
