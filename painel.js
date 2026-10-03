// Painel dentro do site da Smiles: fotos/texto -> Gemini (background.js) -> passageiros para conferir -> preenche
// o cartão "Informar viajante N". Com tudo certo, clica em "Concluir e continuar" DAQUELE viajante (confirma os dados
// dele). NUNCA clica em "Ir para pagamento": o pagamento é sempre você.
(() => {
  if (window.top !== window || document.getElementById("pp-raiz")) return;

  // ---------- registro (log) do "Preencher todos" ----------
  // Vai para quem mantém a extensão: SEM dados pessoais. Valores aparecem só como "preenchido"/"sem dado";
  // entram as opções escolhidas (tipo de documento, gênero), os tipos dos cartões e os erros.
  let diario = null;
  const anotar = (texto) => diario?.push(`${new Date().toLocaleTimeString("pt-BR")}  ${texto}`);
  const tem = (v) => (v ? "preenchido" : "sem dado");

  function baixarRegistro() {
    const agora = new Date();
    const dois = (n) => String(n).padStart(2, "0"); // horário local no nome
    const nome = `preenche-passageiros-registro-${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}-${dois(agora.getHours())}${dois(agora.getMinutes())}.txt`;
    const url = URL.createObjectURL(new Blob([diario.join("\n") + "\n"], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: nome });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return nome;
  }

  // ---------- regras dos dados ----------
  const semAcento = (s) => (s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const digitos = (s) => (s || "").replace(/\D/g, "");
  function telefone(s) {
    let d = digitos(s);
    if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
    return d;
  }
  // Smiles: "Nome" = nomes + nomes do meio; "Último sobrenome" = só a última palavra do sobrenome.
  function dividirNome(p) {
    const partes = `${p.nome} ${p.sobrenome}`.trim().split(/\s+/);
    const ultimo = partes.length > 1 ? partes.pop() : "";
    return { nome: semAcento(partes.join(" ")), ultimo: semAcento(ultimo) };
  }

  // ---------- leitura local (sem Gemini) de texto simples ----------
  // Um passageiro por bloco (linha em branco separa) ou por linha; partes separadas por vírgula, ";" ou quebra de
  // linha: nome, CPF (11 números), nascimento (DD/MM/AAAA), passaporte, e-mail, telefone. Se faltar nome, documento
  // ou nascimento em algum passageiro, devolve null e a leitura vai para o Gemini.
  function sexoPeloNome(nome) {
    const primeiro = (nome || "").split(/\s+/)[0].normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return globalThis.NOMES_MASCULINOS?.has(primeiro) ? "Masculino" : globalThis.NOMES_FEMININOS?.has(primeiro) ? "Feminino" : "";
  }
  // Separa data e CPF de dentro de um pedaço ("Nome: 02/02/2019", "CPF 080.330.762-40"): cada valor vira um pedaço
  // próprio e o rótulo que estava junto ("CPF", "Nascimento") some. Pedaço sem valor (um nome) fica como está.
  function pedacos(parte) {
    const achados = [];
    let resto = parte
      .replace(/(?<!\d)\d{1,2}[/.-]\d{1,2}[/.-]\d{4}(?!\d)/g, (m) => { achados.push(m); return " "; })
      .replace(/(?<!\d)\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}(?!\d)/g, (m) => { achados.push(m.replace(/\D/g, "")); return " "; });
    if (achados.length) resto = resto.replace(/\b(data de nascimento|nascimento|nasc|cpf|documento|doc)\b\.?\s*[:=-]?/gi, " ");
    resto = resto.replace(/\s*[:=-]\s*$/, "").replace(/\s+/g, " ").trim();
    return [...(resto ? [resto] : []), ...achados];
  }

  function lerTextoLocal(texto) {
    const linhas = texto.trim().split(/\n/).map((l) => l.trim());
    // Cada linha com nome + documento é um passageiro; senão os blocos separados por linha em branco são.
    const porLinha = linhas.filter(Boolean).every((l) => /[A-Za-zÀ-ÿ]/.test(l) && /\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}/.test(l));
    const blocos = porLinha ? linhas.filter(Boolean) : texto.trim().split(/\n\s*\n/);
    const contato = {};
    const lista = blocos.map((bloco) => {
      const p = {};
      for (const parte of bloco.split(/[\n,;]+/).flatMap(pedacos).map((x) => x.replace(/^\s*[A-Za-zÀ-ÿ ]{2,20}\s*[:=-]\s*/, (m) => /cpf|nasc|tel|cel|fone|e-?mail|passaporte|nome/i.test(m) ? "" : m).trim()).filter(Boolean)) {
        const dig = parte.replace(/\D/g, "");
        if (/@/.test(parte)) p.email = parte.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0] || "";
        else if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(parte)) p.nascimento = parte.replace(/[.-]/g, "/").replace(/^(\d)\//, "0$1/").replace(/\/(\d)\//, "/0$1/");
        else if (!/[A-Za-zÀ-ÿ]/.test(parte) && dig.length === 11 && !p.cpf) p.cpf = dig;
        else if (!/[A-Za-zÀ-ÿ]/.test(parte) && dig.length >= 10 && dig.length <= 13) p.telefone = dig;
        else if (/^[A-Za-z]{1,3}\d{5,8}$/.test(parte.replace(/\s/g, ""))) p.passaporte = parte.replace(/\s/g, "").toUpperCase();
        else if (/[A-Za-zÀ-ÿ]{2}/.test(parte) && !p.nome) {
          const [nome, ...resto] = parte.split(/\s+/);
          Object.assign(p, { nome, sobrenome: resto.join(" ") });
        }
      }
      // Bloco sem nome = só contato (e-mail/telefone de todos); ali um número de 11 dígitos é celular, não CPF.
      if (!p.nome) { Object.assign(contato, { email: p.email, telefone: p.telefone || p.cpf }); return null; }
      return p;
    }).filter(Boolean);
    if (!lista.length || lista.some((p) => !p.nome || !p.nascimento || !(p.cpf || p.passaporte))) return null;
    const emails = [...new Set(lista.map((p) => p.email).filter(Boolean).concat(contato.email || []))];
    const fones = [...new Set(lista.map((p) => p.telefone).filter(Boolean).concat(contato.telefone || []))];
    return lista.map((p) => {
      const sexo = sexoPeloNome(p.nome);
      return { cpf: "", passaporte: "", passaporte_validade: "", passaporte_pais: "", ...p, sexo, sexo_origem: sexo ? "nome" : "",
        email: p.email || (emails.length === 1 ? emails[0] : ""), telefone: p.telefone || (fones.length === 1 ? fones[0] : "") };
    });
  }

  // ---------- preencher a página ----------
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const cartoes = () => [...document.querySelectorAll('[id="text-input-personalData.firstName"]')].map((campo) => {
    let c = campo;
    while (c && !/^\s*Informar viajante\s*\d/i.test(c.innerText || "")) c = c.parentElement;
    return c;
  }).filter(Boolean);

  // O site é React: valor pelo setter nativo + eventos, senão ele ignora.
  function escrever(campo, valor) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    campo.focus();
    setter.call(campo, valor);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
    campo.blur();
  }

  async function escolher(cartao, id, texto) {
    const campo = cartao.querySelector(`[id="${id}"]`);
    if (!campo) return false;
    campo.click();
    await esperar(250);
    const lista = campo.parentElement.parentElement.querySelector("ul");
    const norm = (x) => (x || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const item = [...(lista?.querySelectorAll("li") || [])].find((li) => norm(li.innerText) === norm(texto));
    if (!item) return false;
    (item.querySelector("button") || item).click(); // a opção é um botão dentro do <li>
    await esperar(250);
    return norm(campo.value) === norm(texto);
  }

  // Cartão fechado (~120 px, os campos ficam escondidos dentro): clica no título "Informar viajante N" (h5).
  async function expandir(cartao) {
    if (cartao.getBoundingClientRect().height > 250) return;
    const titulo = [...cartao.querySelectorAll("h5, h4, h3")].find((el) => /^\s*Informar viajante\s*\d+\s*$/i.test(el.innerText));
    titulo?.click();
    await esperar(700);
  }

  // "Pessoa adulta a partir de 12 anos" / "Criança…" / "Bebê até 23 meses": o tipo do lugar.
  const tipoDoCartao = (c) => {
    const topo = (c.innerText || "").slice(0, 150); // "Informar viajante N" + o tipo logo abaixo
    return /beb/i.test(topo) ? "Bebê" : /crian/i.test(topo) ? "Criança" : "Adulto";
  };
  function tipoPelaIdade(nascimento) {
    const [d, m, a] = (nascimento || "").split("/").map(Number);
    if (!a) return "";
    const hoje = new Date(), anos = hoje.getFullYear() - a - ((hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) ? 1 : 0);
    return anos < 2 ? "Bebê" : anos < 12 ? "Criança" : "Adulto";
  }

  // Erros que o site mostra dentro do cartão (ex.: "Bebês devem ter até 1 ano e 11 meses…").
  const errosDoSite = (cartao) => [...cartao.querySelectorAll("[class*=error i], [role=alert]")]
    .map((e) => e.innerText.replace(/error_outline/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t && !/viajantes favoritos/i.test(t));

  // Tela internacional: não tem "Tipo de documento"; tem Passaporte, Vencimento e País emissor.
  const telaInternacional = () => !!document.querySelector('[id="text-input-personalData.passportNumber"]');
  function vencido(data) {
    const [d, m, a] = (data || "").split("/").map(Number);
    return a ? new Date(a, m - 1, d) < new Date() : false;
  }

  // Documento pelo que veio: CPF -> "Outro Documento Oficial" com o CPF; passaporte -> "Passaporte".
  // Internacional: sempre passaporte (obrigatório). Nacional com os dois: CPF.
  function documento(p, internacional) {
    const passaporte = (p.passaporte || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const cpf = digitos(p.cpf);
    if (internacional) return ["Passaporte", passaporte];
    if (cpf.length === 11) return ["Outro Documento Oficial", cpf];
    return ["Passaporte", passaporte];
  }

  async function preencher(n, p, internacional) {
    const cartao = cartoes()[n - 1];
    if (!cartao) throw new Error(`Não achei o cartão "Informar viajante ${n}" nesta página.`);
    await expandir(cartao);
    const falhas = [];
    const campo = (id) => cartao.querySelector(`[id="${id}"]`);
    const por = (id, valor, nome) => {
      const c = campo(id);
      anotar(`    ${nome}: ${!valor ? "sem dado" : c ? "preenchido" : "CAMPO NÃO ACHADO na página"}`);
      if (!valor) return falhas.push(`${nome} (sem dado)`);
      c ? escrever(c, valor) : falhas.push(`${nome} (campo não achado)`);
    };
    anotar(`  viajante ${n} (${tipoDoCartao(cartao)}): cartão ${cartao.getBoundingClientRect().height > 250 ? "aberto" : "fechado"}`);
    const { nome, ultimo } = dividirNome(p);
    por("text-input-personalData.firstName", nome, "Nome");
    por("text-input-personalData.lastName", ultimo, "Último sobrenome");
    if (digitos(p.cpf).length === 11) por("text-input-personalData.federalId", digitos(p.cpf), "CPF");
    if (campo("text-input-personalData.passportNumber")) {
      // Internacional: passaporte, vencimento e país emissor (lista em português, ex.: "Brasil", "Estados Unidos").
      por("text-input-personalData.passportNumber", (p.passaporte || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(), "Passaporte");
      por("date-input-personalData.passportExpirationDate", p.passaporte_validade, "Vencimento do passaporte");
      if (vencido(p.passaporte_validade)) falhas.push("Passaporte VENCIDO");
      if (!p.passaporte_pais) { falhas.push("País emissor (sem dado)"); anotar("    País emissor: sem dado"); }
      else {
        const paisOk = await escolher(cartao, "dropdown-input-personalData.passportIssuingCountry", p.passaporte_pais);
        anotar(`    País emissor: "${p.passaporte_pais}" ${paisOk ? "escolhido" : "NÃO ACHADO na lista"}`);
        if (!paisOk) falhas.push(`País emissor ("${p.passaporte_pais}" não está na lista)`);
      }
    } else {
      const [tipo, numero] = documento(p, internacional);
      const tipoOk = await escolher(cartao, "dropdown-input-personalData.documentTypeBpeta", tipo);
      anotar(`    Tipo de documento: "${tipo}" ${tipoOk ? "escolhido" : "NÃO ESCOLHIDO (opção não achada)"}`);
      if (!tipoOk) falhas.push("Tipo de documento");
      await esperar(200);
      por("text-input-personalData.documentNumberBpeta", numero, "Número do documento");
    }
    por("date-input-personalData.birthDate", p.nascimento, "Data de nascimento");
    if (!p.sexo) { falhas.push("Gênero (não sei pelo nome: escolha)"); anotar("    Gênero: sem dado"); }
    else {
      const generoOk = await escolher(cartao, "dropdown-input-personalData.gender", p.sexo);
      anotar(`    Gênero: "${p.sexo}" (${p.sexo_origem || "digitado"}) ${generoOk ? "escolhido" : "NÃO ESCOLHIDO"}`);
      if (!generoOk) falhas.push("Gênero");
    }
    por("text-input-contact.email", (p.email || "").trim(), "E-mail (obrigatório)");
    por("phone-input-contact.phone", telefone(p.telefone), "Telefone (obrigatório)");
    await esperar(500);
    const doSite = [...new Set(errosDoSite(cartao))];
    doSite.forEach((e) => anotar(`    ERRO DO SITE: ${e.slice(0, 160)}`));
    falhas.push(...doSite);
    // Só confirma o viajante se nada faltou e o site não reclamou de nada.
    const concluir = [...cartao.querySelectorAll("button")].find((b) => /^\s*Concluir e continuar\s*$/i.test(b.innerText));
    const confirmou = !falhas.length && concluir && !concluir.disabled;
    if (confirmou) { concluir.click(); await esperar(500); }
    anotar(`    Concluir e continuar: ${confirmou ? "CLICADO" : !concluir ? "botão não achado" : falhas.length ? "não clicado (há falhas)" : "botão desabilitado"}`);
    cartao.scrollIntoView({ behavior: "smooth", block: "start" });
    return { falhas, confirmou };
  }

  // ---------- painel ----------
  const raiz = document.createElement("div");
  raiz.id = "pp-raiz";
  document.body.append(raiz);
  const sombra = raiz.attachShadow({ mode: "open" });
  sombra.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, "Segoe UI", sans-serif; }
    .abrir { position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; padding: 12px 18px; border: 0; border-radius: 999px;
      background: #ff5a00; color: #fff; font-weight: 700; font-size: 14px; box-shadow: 0 6px 20px #0004; cursor: pointer; }
    .painel { position: fixed; right: 18px; bottom: 76px; z-index: 2147483647; width: 400px; max-height: 80vh; overflow: auto;
      background: #fff; color: #18181b; border-radius: 14px; box-shadow: 0 18px 50px #0006; padding: 16px; font-size: 14px; }
    h2 { margin: 0 0 10px; font-size: 17px; }
    .tipo-voo { margin: 0 0 10px; padding: 8px 10px; border-radius: 8px; background: #f4f4f5; font-weight: 600; }
    .seg { display: flex; gap: 4px; background: #f4f4f5; border-radius: 10px; padding: 4px; margin-bottom: 10px; }
    .seg label { flex: 1; text-align: center; padding: 6px; border-radius: 8px; cursor: pointer; }
    .seg input { display: none; } .seg label:has(input:checked) { background: #fff; font-weight: 700; box-shadow: 0 1px 3px #0002; }
    .zona { border: 2px dashed #d4d4d8; border-radius: 10px; padding: 14px; text-align: center; color: #71717a; cursor: pointer; outline: none; }
    .zona:focus, .zona.sobre { border-color: #ff5a00; color: #ff5a00; }
    .fotos { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; } .fotos img { height: 56px; border-radius: 6px; }
    textarea { width: 100%; min-height: 70px; margin-top: 8px; padding: 8px; border: 1px solid #d4d4d8; border-radius: 8px; font-size: 13px; }
    button.acao { width: 100%; margin-top: 8px; padding: 10px; border: 0; border-radius: 8px; background: #ff5a00; color: #fff; font-weight: 700; cursor: pointer; }
    button.acao:disabled { opacity: .6; cursor: wait; }
    button.leve { background: #f4f4f5; color: #18181b; }
    .pax { border: 1px solid #e4e4e7; border-radius: 10px; padding: 10px; margin-top: 10px; }
    .pax h3 { margin: 0 0 6px; font-size: 14px; }
    .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .grade label { display: flex; flex-direction: column; font-size: 11px; color: #52525b; gap: 2px; }
    .grade input { padding: 6px; border: 1px solid #d4d4d8; border-radius: 6px; font-size: 13px; color: #18181b; }
    .linha { display: flex; gap: 6px; align-items: center; margin-top: 8px; } .linha select { padding: 7px; border-radius: 6px; }
    .erro { background: #fee2e2; color: #991b1b; border: 2px solid #dc2626; border-radius: 10px; padding: 10px; margin-top: 10px; font-weight: 600; }
    .ok { background: #dcfce7; color: #166534; border-radius: 10px; padding: 10px; margin-top: 10px; }
    .atencao { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; border-radius: 10px; padding: 8px 10px; margin: 6px 0; font-weight: 600; }
    .nota { font-size: 11px; color: #71717a; margin-top: 8px; }
  </style>
  <button class="abrir">Passageiros</button>
  <div class="painel" hidden>
    <h2>Preencher passageiros</h2>
    <p class="tipo-voo"></p>
    <div class="zona" tabindex="0">Cole (Ctrl+V), arraste ou clique para escolher fotos de passaporte, RG ou CNH</div>
    <input type="file" accept="image/*" multiple hidden>
    <div class="fotos"></div>
    <textarea placeholder="Ou escreva/cole os dados como vieram (nome, CPF, nascimento, passaporte...)"></textarea>
    <button class="acao ler">Ler dados</button>
    <div class="saida"></div>
    <p class="nota">As fotos e o texto vão para o Google Gemini (chave nas opções da extensão). Nada é enviado à Smiles
      sem você clicar em "Concluir e continuar".</p>
  </div>`;
  const $ = (s) => sombra.querySelector(s);
  const painel = $(".painel");
  $(".abrir").onclick = () => {
    painel.hidden = !painel.hidden;
    $(".tipo-voo").textContent = telaInternacional() ? "Voo internacional: passaporte obrigatório (número, vencimento e país)."
      : "Voo nacional: documento = CPF (ou passaporte, se não houver CPF).";
  };

  const fotos = [];
  function desenharFotos() {
    $(".fotos").replaceChildren(...fotos.map((url, i) => {
      const img = document.createElement("img");
      img.src = url; img.title = "Clique para remover";
      img.onclick = () => { fotos.splice(i, 1); desenharFotos(); };
      return img;
    }));
  }
  function adicionar(arquivos) {
    for (const a of arquivos) {
      if (!a.type.startsWith("image/")) continue;
      const leitor = new FileReader();
      leitor.onload = () => { fotos.push(leitor.result); desenharFotos(); };
      leitor.readAsDataURL(a);
    }
  }
  const zona = $(".zona"), escolha = $("input[type=file]");
  zona.onclick = () => escolha.click();
  escolha.onchange = () => { adicionar(escolha.files); escolha.value = ""; };
  zona.addEventListener("paste", (ev) => { ev.preventDefault(); adicionar([...ev.clipboardData.files]); });
  zona.addEventListener("dragover", (ev) => { ev.preventDefault(); zona.classList.add("sobre"); });
  zona.addEventListener("dragleave", () => zona.classList.remove("sobre"));
  zona.addEventListener("drop", (ev) => { ev.preventDefault(); zona.classList.remove("sobre"); adicionar(ev.dataTransfer.files); });

  const internacional = telaInternacional;
  const aviso = (classe, texto) => { const d = document.createElement("div"); d.className = classe; d.textContent = texto; return d; };
  const CAMPOS = [["nome", "Nome(s)"], ["sobrenome", "Sobrenome(s)"], ["nascimento", "Nascimento"], ["sexo", "Sexo"],
    ["cpf", "CPF"], ["passaporte", "Passaporte"], ["passaporte_validade", "Vencimento passaporte"],
    ["passaporte_pais", "País emissor"], ["email", "E-mail"], ["telefone", "Telefone"]];

  function cartaoPax(p, i) {
    const caixa = document.createElement("div");
    caixa.className = "pax";
    const genero = !p.sexo ? `<div class="erro">Gênero desconhecido: não deu para saber pelo nome. Escreva Masculino ou Feminino.</div>`
      : p.sexo_origem === "nome" ? `<div class="atencao">Gênero deduzido pelo nome (${p.sexo}): confira.</div>` : "";
    caixa.innerHTML = `<h3>Passageiro ${i + 1}</h3>${genero}<div class="grade"></div>
      <div class="linha">Preencher no viajante <select></select><button class="acao" style="margin:0;flex:1">Preencher</button></div>
      <div class="res"></div>`;
    for (const [k, rotulo] of CAMPOS) {
      const l = document.createElement("label");
      const inp = document.createElement("input");
      inp.value = p[k] || ""; inp.dataset.k = k;
      l.append(rotulo, inp);
      caixa.querySelector(".grade").append(l);
    }
    const sel = caixa.querySelector("select");
    const lista = cartoes();
    lista.forEach((c, k) => sel.append(new Option(`${k + 1} · ${tipoDoCartao(c)}`, k + 1)));
    if (!lista.length) sel.append(new Option("1", 1));
    // Sugere o primeiro lugar do mesmo tipo (adulto/criança/bebê) a partir da posição do passageiro.
    const tipo = tipoPelaIdade(p.nascimento);
    const livre = lista.findIndex((c, k) => k >= i && (!tipo || tipoDoCartao(c) === tipo));
    sel.value = String(livre >= 0 ? livre + 1 : Math.min(i + 1, Math.max(lista.length, 1)));
    // Preenche e confirma este passageiro; devolve true só se ficou tudo certo (o "Preencher todos" para no primeiro false).
    caixa.executar = async () => {
      const dados = Object.fromEntries([...caixa.querySelectorAll("input")].map((x) => [x.dataset.k, x.value.trim()]));
      dados.sexo_origem = dados.sexo === (p.sexo || "") ? p.sexo_origem : "digitado"; // de onde veio o gênero (para o registro)
      // Um único e-mail (ou celular) entre todos os passageiros vale para quem veio sem.
      for (const k of ["email", "telefone"]) {
        const valores = [...new Set([...sombra.querySelectorAll(`.pax input[data-k=${k}]`)].map((x) => x.value.trim()).filter(Boolean))];
        if (!dados[k] && valores.length === 1) {
          dados[k] = valores[0];
          caixa.querySelector(`input[data-k=${k}]`).value = valores[0]; // mostra no cartão o que vai ser usado
        }
      }
      const res = caixa.querySelector(".res");
      const recusa = (texto) => { anotar(`  RECUSADO: ${texto}`); res.replaceChildren(aviso("erro", texto)); return false; };
      anotar(`Passageiro ${i + 1} -> viajante ${sel.value}; veio: ${["nome", "sobrenome", "nascimento", "cpf", "passaporte", "email", "telefone"]
        .map((k) => `${k} ${tem(dados[k])}`).join(", ")}; passaporte_validade ${tem(dados.passaporte_validade)}; ` +
        `país "${dados.passaporte_pais || ""}"; sexo "${dados.sexo || ""}"`);
      if (internacional() && !dados.passaporte) return recusa("Voo internacional exige passaporte. Esta pessoa está sem número de passaporte.");
      if (!internacional() && digitos(dados.cpf).length !== 11 && !dados.passaporte) {
        return recusa("Sem documento: mande o CPF (nacional) ou o passaporte.");
      }
      const cartao = cartoes()[Number(sel.value) - 1];
      const tipo = tipoPelaIdade(dados.nascimento);
      if (cartao && tipo && tipo !== tipoDoCartao(cartao)) {
        return recusa(`Pela data de nascimento esta pessoa é ${tipo}, mas o viajante ${sel.value} é lugar de ${tipoDoCartao(cartao)}. Escolha outro viajante.`);
      }
      try {
        const { falhas, confirmou } = await preencher(Number(sel.value), dados, internacional());
        if (falhas.length) return recusa(`Preenchi, mas NÃO confirmei. Confira: ${falhas.join(" · ")}`);
        res.replaceChildren(aviso("ok", confirmou ? `Viajante ${sel.value} preenchido e confirmado ("Concluir e continuar").`
          : `Viajante ${sel.value} preenchido, mas não achei o "Concluir e continuar": clique você.`));
        return confirmou;
      } catch (e) {
        anotar(`  EXCEÇÃO: ${e.message} | ${(e.stack || "").split("\n").slice(1, 3).join(" ").trim()}`);
        return recusa(e.message);
      }
    };
    caixa.querySelector("button").onclick = () => caixa.executar();
    return caixa;
  }

  $(".ler").onclick = async (ev) => {
    const botao = ev.currentTarget, saida = $(".saida");
    if (!fotos.length && !$("textarea").value.trim()) return saida.replaceChildren(aviso("erro", "Cole uma foto ou escreva os dados."));
    botao.disabled = true; botao.textContent = "Lendo… (até 20 s)";
    try {
      // Só texto simples (nome, CPF, nascimento…): lê aqui mesmo, sem mandar nada ao Google.
      const local = !fotos.length ? lerTextoLocal($("textarea").value) : null;
      const r = local ? { passageiros: local }
        : await chrome.runtime.sendMessage({ tipo: "ler", texto: $("textarea").value, imagens: fotos });
      if (r?.erro) throw new Error(r.erro);
      const lista = r?.passageiros || [];
      if (!lista.length) return saida.replaceChildren(aviso("erro", "Não achei passageiros nos dados."));
      const todos = document.createElement("button");
      todos.className = "acao"; todos.textContent = `Preencher todos (${lista.length}) e confirmar um por um`;
      const caixas = lista.map(cartaoPax);
      // Um viajante de cada vez; para no primeiro problema. No fim para: "Ir para pagamento" é sempre você.
      todos.onclick = async () => {
        todos.disabled = true;
        diario = [];
        const lista = cartoes();
        anotar(`Preenche Passageiros v${chrome.runtime.getManifest().version} | ${new Date().toLocaleDateString("pt-BR")}`);
        anotar(`Página: ${location.pathname} | Navegador: ${navigator.userAgent}`);
        anotar(`Voo: ${internacional() ? "internacional" : "nacional"} | passageiros lidos: ${caixas.length} | ` +
          `cartões na página: ${lista.length} (${lista.map((c, k) => `${k + 1}:${tipoDoCartao(c)}`).join(" ")})`);
        let feitos = 0;
        for (const c of caixas) {
          c.scrollIntoView({ block: "nearest" });
          if (!(await c.executar())) break;
          feitos++;
          await esperar(800);
        }
        anotar(feitos === caixas.length ? `FIM: ${feitos} viajante(s) confirmados. Parei antes do pagamento.`
          : `PAROU no passageiro ${feitos + 1} (${feitos} confirmados antes).`);
        const arquivo = baixarRegistro();
        diario = null;
        todos.disabled = false;
        const registro = document.createElement("p");
        registro.className = "nota";
        registro.textContent = `Registro salvo em Downloads: ${arquivo}. Se algo deu errado, mande esse arquivo (não tem dados pessoais).`;
        todos.after(registro);
        todos.textContent = feitos === caixas.length ? `Pronto: ${feitos} viajante(s) confirmados. Confira e vá para o pagamento você.`
          : `Parei no passageiro ${feitos + 1}: veja o aviso vermelho dele.`;
      };
      const origem = document.createElement("p");
      origem.className = "nota";
      origem.textContent = local ? "Lido aqui no navegador, sem IA (nada foi enviado ao Google)." : "Lido pelo Gemini.";
      saida.replaceChildren(origem, todos, ...caixas);
    } catch (e) {
      saida.replaceChildren(aviso("erro", e.message));
    } finally {
      botao.disabled = false; botao.textContent = "Ler dados";
    }
  };
})();
