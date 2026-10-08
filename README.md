# Preenche Passageiros

Numa emissão com nove viajantes, a tela "Dados dos viajantes" da Smiles pede nove vezes a mesma coisa: nome, último
sobrenome, CPF, nascimento, gênero, e-mail, telefone. É digitação demorada, feita com o cliente esperando, e
uma letra trocada não fica barata: vira custo de remarcação ou passageiro barrado no embarque. Se a demora for grande,
a sessão cai e o site mostra o "Ops, algo deu errado", e aí é refazer tudo.

A Preenche Passageiros faz essa digitação por você. Você cola os dados como o cliente mandou, confere, e ela preenche
os cartões.

## O que você pode colar

O texto do jeito que chegou no atendimento, sem arrumar nada:

```
Ana Paula Souza
12/03/1985
CPF: 529.982.247-25

Bruno Lima, 111.444.777-35, 01/01/1990

ana@email.com
(82) 91234-5678
```

Uma pessoa por bloco ou por linha, com ou sem rótulos como `CPF:`. Um e-mail e um telefone soltos valem para todos.
Esse texto é lido ali mesmo, no seu navegador: nada sai do computador.

Também dá para colar **fotos de documento** (passaporte, RG, CNH). Foto precisa de uma IA para ser lida, e a extensão
usa o **Gemini**, a IA do Google, com uma chave gratuita que cada pessoa cria para si. Só as fotos (e textos que a
extensão não consegue ler sozinha) vão para o Google.

## Como ela preenche

Ela segue as mesmas regras que a equipe segue à mão:

| Campo | Regra |
|---|---|
| Documento, voo nacional | Tipo **"Outro Documento Oficial"**, com o **CPF** como número. RG nunca é usado |
| Documento, voo internacional | **Passaporte obrigatório**: número, vencimento e país emissor. Passaporte vencido para tudo. A extensão percebe sozinha que a tela é internacional |
| Nome | Separados ("Nome: Jose Antonio" / "Sobrenome: Corral Ponce", ou editados no cartão): vão como você informou. Nome corrido: "Nome" leva o primeiro e os do meio, "Último sobrenome" só o último. Sem acentos |
| Gênero | Do documento. Se o documento não diz, pelo primeiro nome, com aviso para conferir. Nome que serve para os dois fica para você escolher |
| E-mail e telefone | Obrigatórios. Um só informado vale para todos |
| Adulto, criança, bebê | A idade tem que bater com o lugar ("Pessoa adulta", "Bebê até 23 meses"); se não bater, ela recusa |

## Até onde ela vai

Na tela "Dados dos viajantes" aparece um botão laranja, **Passageiros**, no canto de baixo. Ele abre o painel da
extensão: você cola o texto ou as fotos e clica em **Ler dados**. Cada passageiro aparece num cartão para conferir,
com aviso amarelo no que vale olhar duas vezes e vermelho no que está faltando.

Depois, **Preencher todos** preenche todos os "Informar viajante", um depois do outro, mesmo que algum dê problema.
Só no fim ela clica em **Concluir e continuar**, e só nos viajantes em que tudo entrou e o site não reclamou de nada.
Os que ficaram com aviso vermelho você confere e confirma à mão. Quando termina, ela para.

**Ir para pagamento** ela nunca clica. Conferir a reserva inteira e pagar é sempre com você.

## Instalar

A extensão não está na loja do Chrome: você baixa daqui e o navegador carrega a pasta direto do seu computador.
Funciona no Chrome, Brave, Opera, Opera GX e Edge (no Firefox, não).

1. Nesta página, clique no botão verde **Code** → **Download ZIP**. Extraia o ZIP numa pasta fixa, por exemplo em
   Documentos, e não apague nem mova essa pasta depois: o navegador lê a extensão de lá.
2. Abra a página de extensões do navegador: `chrome://extensions`, `brave://extensions`, `opera://extensions` ou
   `edge://extensions`.
3. Ligue o **Modo do desenvolvedor** (chave no canto de cima; no Edge, no menu da esquerda). É ele que libera
   instalar extensões que não vieram da loja.
4. Clique em **Carregar sem compactação** e escolha a pasta extraída, a que tem o arquivo `manifest.json` dentro.

### A chave do Gemini

Logo depois de instalar, abre uma tela pedindo a chave. Ela só é necessária para ler fotos; sem ela, o texto continua
funcionando.

1. Abra [aistudio.google.com/apikey](https://aistudio.google.com/apikey) e entre com uma conta Google.
2. Clique em **Create API key** e copie a chave (um texto comprido que começa com `AIza` ou `AQ.`).
3. Cole na tela da extensão e clique em **Salvar**. Ela testa a chave e mostra "Chave salva e testada".

É grátis e não pede cartão. Cada pessoa usa a própria chave: não compartilhe a sua nem mande por chat.

### Versão nova

Baixe o ZIP de novo, troque os arquivos da pasta e clique na setinha de recarregar no cartão da extensão, na página de
extensões. O passo a passo completo, para mandar para quem for instalar, está em [COMO-INSTALAR.txt](COMO-INSTALAR.txt).

## Privacidade (LGPD)

- **Texto simples:** processado só no seu navegador.
- **Fotos de documento:** vão para o Google Gemini com a sua chave. **No plano grátis, o Google pode usar o conteúdo
  enviado para melhorar os produtos dele** (no plano pago, não). Use só com a ciência de quem é dono dos dados.
- A chave fica só no seu navegador (`chrome.storage.local`). Nunca compartilhe a sua chave.
- A extensão só roda em `smiles.com.br` e só fala com `generativelanguage.googleapis.com`.
