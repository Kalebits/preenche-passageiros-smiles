# Preenche Passageiros (Smiles)

Extensão de navegador que lê os dados dos passageiros (texto colado ou fotos de passaporte, RG e CNH) e preenche a
tela **Dados dos viajantes** do site da Smiles, um viajante por vez. Funciona no **Chrome, Brave, Opera, Opera GX e
Edge**.

- Voo nacional: documento = CPF ("Outro Documento Oficial"). Internacional: passaporte, vencimento e país emissor.
- Texto simples (nome, CPF, nascimento, e-mail, telefone) é lido no próprio navegador, sem IA.
- Fotos de documento são lidas pelo Google Gemini, com uma chave grátis **sua**.
- Confirma cada viajante ("Concluir e continuar") só se estiver tudo certo. **Nunca** clica em "Ir para pagamento".

## Como baixar

1. Nesta página, clique no botão verde **Code** → **Download ZIP**.
2. Extraia o ZIP (botão direito → Extrair tudo) e deixe a pasta num lugar fixo, por exemplo em Documentos.

## Como instalar

1. Abra a página de extensões do navegador:
   `chrome://extensions` · `brave://extensions` · `opera://extensions` · `edge://extensions`
2. Ligue o **Modo do desenvolvedor** (canto superior direito; no Edge, menu da esquerda).
3. Clique em **Carregar sem compactação** (Load unpacked) e escolha a pasta extraída (a que tem o `manifest.json`).
4. A tela de opções abre sozinha: siga o passo a passo para criar a chave do Gemini em
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey) e salve. Sem chave, a extensão ainda lê texto.

O passo a passo completo, com uso e solução de problemas, está em [COMO-INSTALAR.txt](COMO-INSTALAR.txt).

## Como usar

Na Smiles, monte a emissão até **Dados dos viajantes**, clique no botão laranja **Passageiros**, cole o texto ou as
fotos, clique em **Ler dados**, confira e clique em **Preencher todos**. O pagamento é sempre com você.

## Atualizar

Baixe o ZIP de novo, troque os arquivos da pasta e clique em recarregar (setinha circular) no card da extensão.

## Privacidade

- Nada é enviado a servidores próprios. Texto simples é lido no navegador.
- Fotos de documento e texto mais complexo vão para o Google Gemini com a chave de quem usa. No plano grátis do
  Gemini, o Google pode usar o conteúdo enviado para melhorar os produtos dele (LGPD: use com ciência do dono dos dados).
- A chave fica só no navegador de quem usa. O registro de erros que a extensão salva em Downloads não tem dados pessoais.
