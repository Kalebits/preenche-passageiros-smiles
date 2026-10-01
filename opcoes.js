const estado = document.querySelector("#estado");
const mostrar = (texto, bom) => { estado.textContent = texto; estado.className = bom ? "ok" : "ruim"; };
chrome.storage.local.get("chave").then(({ chave }) => chave && mostrar("Chave salva ✓", true));

document.querySelector("#salvar").onclick = async () => {
  const campo = document.querySelector("#chave");
  const chave = campo.value.trim();
  if (!/^[A-Za-z0-9_.-]{20,}$/.test(chave)) return mostrar("Isso não parece uma chave do Gemini. Copie de novo.", false);
  mostrar("Testando a chave…", true);
  // Confere a chave de verdade (lista os modelos: não gasta leitura).
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": chave } })
    .catch(() => null);
  if (!r || !r.ok) return mostrar(r ? "O Google recusou essa chave. Copie de novo." : "Sem internet para testar a chave.", false);
  await chrome.storage.local.set({ chave });
  campo.value = ""; // a chave não fica na tela
  mostrar("Chave salva e testada ✓", true);
};
