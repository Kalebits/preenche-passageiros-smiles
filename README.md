# Preenche Passageiros (Smiles)

Extensão de navegador que lê os dados dos passageiros, de **texto colado** ou de **fotos de documento**
(passaporte, RG, CNH), e preenche a tela **"Dados dos viajantes"** do site da Smiles.

Funciona no **Chrome, Brave, Opera, Opera GX e Edge**. Não funciona no Firefox.

> Projeto independente, sem ligação com a Smiles ou a GOL. Use por sua conta e confira sempre os dados antes de pagar.

## O que ela faz

- **Lê os dados:**
  - **Texto simples** (nome, CPF ou passaporte, nascimento, e-mail, telefone): lido no próprio navegador, **sem IA e sem
    enviar nada para fora**. Aceita uma pessoa por linha, blocos separados por linha em branco e rótulos como `CPF:`.
  - **Fotos de documento**: lidas pelo Google Gemini, com a **sua** chave (grátis). No passaporte, confere também as
    linhas `<<<` (zona de leitura mecânica).
- **Mostra cada passageiro para conferir** antes de preencher. Aviso amarelo = conferir; vermelho = falta algo.
- **Preenche cada "Informar viajante N"**: abre o cartão, preenche e clica em **"Concluir e continuar"** só se tudo entrou
  e o site não mostrou erro.
- **"Preencher todos"**: um viajante por vez; para no primeiro problema e **para no fim**.
  **Nunca clica em "Ir para pagamento"**: o pagamento é sempre seu.

### Regras de preenchimento

| Situação | Como preenche |
|---|---|
| Voo nacional | Tipo de documento **"Outro Documento Oficial"** com o **CPF** (ou Passaporte, se não houver CPF) |
| Voo internacional (detectado pela própria tela) | **Passaporte obrigatório**: número, vencimento e país emissor. Passaporte vencido: não confirma |
| Nome | "Nome" = nomes + nomes do meio; "Último sobrenome" = só o último. Sem acentos |
| Gênero | Do documento; se não houver, pelo primeiro nome (aviso "confira"). Nome que serve para os dois: você escolhe |
| E-mail e telefone | Obrigatórios. Um único e-mail ou celular informado vale para todos os passageiros |
| Adulto / criança / bebê | Confere a idade com o tipo do lugar ("Pessoa adulta", "Bebê até 23 meses"...) e recusa se não bater |

## Instalação

Passo a passo completo em [COMO-INSTALAR.txt](COMO-INSTALAR.txt). Resumo:

1. Baixe este repositório: botão verde **Code → Download ZIP** e extraia numa pasta fixa (não apague depois).
2. Abra `chrome://extensions` (Brave: `brave://extensions`, Opera: `opera://extensions`, Edge: `edge://extensions`).
3. Ligue o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e escolha a pasta que tem o `manifest.json`.
5. Na tela de opções que abre, cole a sua **chave do Gemini** (só para ler fotos):
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → "Create API key" → copiar → colar → Salvar.

Para atualizar: baixe a versão nova, troque os arquivos da pasta e clique na setinha de recarregar no card da extensão.

## Uso

1. Na Smiles, monte a emissão até a tela **Dados dos viajantes**.
2. Clique no botão laranja **"Passageiros"** (canto inferior direito).
3. Cole o texto ou as fotos e clique em **"Ler dados"**.
4. Confira cada passageiro e clique em **"Preencher todos"** (ou "Preencher" em um).
5. Confira tudo e clique em **"Ir para pagamento"** você mesmo.

## Privacidade (LGPD)

- **Texto simples:** processado só no seu navegador.
- **Fotos de documento:** vão para o Google Gemini com a sua chave. **No plano grátis, o Google pode usar o conteúdo
  enviado para melhorar os produtos dele** (no plano pago, não). Use só com a ciência de quem é dono dos dados.
- A chave fica só no seu navegador (`chrome.storage.local`). Nunca compartilhe a sua chave.
- A extensão só roda em `smiles.com.br` e só fala com `generativelanguage.googleapis.com`.

## Se der erro

Cada "Preencher todos" salva em **Downloads** um arquivo `preenche-passageiros-registro-AAAA-MM-DD-HHMM.txt` com o
passo a passo do que aconteceu, **sem dados pessoais** (os valores aparecem só como "preenchido" / "sem dado").
Abra uma *issue* aqui no GitHub e anexe esse arquivo.

| Mensagem | O que fazer |
|---|---|
| "Gemini sobrecarregado (erro 503)" | A extensão já tenta de novo e usa um modelo reserva; espere um minuto e leia de novo |
| "Acabou a cota grátis do Gemini" | Espere algumas horas ou cole os dados em texto |
| "A chave do Gemini não foi aceita" | Gere outra chave e salve nas opções |
| Antivírus reclamou ao baixar (ex.: "JS:LockyDownloader") | Alarme genérico para arquivo `.js` dentro de compactado. Baixe direto daqui do GitHub |

## Arquivos

| Arquivo | Papel |
|---|---|
| `manifest.json` | Configuração da extensão (Manifest V3) |
| `painel.js` | Painel dentro da Smiles: leitura local de texto, conferência, preenchimento e registro |
| `background.js` | Chamada ao Gemini (com novas tentativas e modelo reserva) |
| `nomes.js` | Primeiros nomes sem dúvida de gênero, usados quando o documento não diz |
| `opcoes.html`, `opcoes.js` | Tela da chave do Gemini, com o passo a passo |
| `COMO-INSTALAR.txt` | Guia de instalação para quem recebe a extensão |
