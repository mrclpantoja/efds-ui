# Fase 7: roteiro de validação manual

Objetivo: verificar em ambiente real o que só foi checado por leitura de código e jsdom (leitor de tela, Firefox, `forced-colors`, `prefers-reduced-motion`, zoom 200%). Tempo estimado: cerca de 2 h. Origem dos pontos: `docs/architecture/comportamento.md` ("Limitações conhecidas" e "Ainda não testado") e `docs/architecture/behavior.md`.

Use **somente os dados fictícios** do site. Não digite dados reais em nenhum campo.

## Como usar

- Marque `[x] ok` ou `[x] falhou` em cada item. Em falha, preencha o modelo da seção 6 (copie o bloco).
- Faça a seção 2 inteira primeiro com **NVDA + Firefox**. Depois repita só os itens marcados com (C) em Chrome ou Edge.
- Na fala, o "esperado" é aproximado: o que importa é a informação (nome, papel, estado), não a palavra exata. O NVDA fala "botão", "caixa de combinação", "alerta" etc.
- Nos itens marcados "Validar", anote também se o anúncio saiu duplicado, ausente ou tardio, mesmo que o resultado pareça aceitável.

## 1. Preparação (cerca de 15 min)

### 1.1 Servidores

No terminal, na raiz do projeto:

```
pnpm docs:dev
```

Site em `http://localhost:5173` (ou `5199` se já houver outro servidor; leia a porta que o terminal mostrar). As rotas usam hash: `http://localhost:5173/#/componentes/combobox`.

Em outro terminal:

```
pnpm dev
```

Playground com as telas de referência: `#/dashboard`, `#/listagem`, `#/formulario` (use a porta mostrada). Anote as duas portas:

- Docs: `________`
- Playground: `________`

Nas páginas de componente do site cada exemplo tem duas abas: **HTML** (usa `@eds-ui/behavior`) e **React** (usa `@eds-ui/react`). Os itens da seção 2 valem para as duas; teste primeiro o HTML e faça só uma conferência rápida do React nos itens marcados (R).

### 1.2 NVDA (leitor de tela gratuito, Windows)

1. Baixe em `nvaccess.org` (Download) e instale. Aceite o idioma padrão (português do Brasil).
2. Ligar: Ctrl+Alt+N. Desligar: Insert+Q (confirmar).
3. Ative o visualizador de fala, que mostra na tela o que o NVDA fala (muito útil para quem está começando): menu NVDA (Insert+N) > Ferramentas > Visualizador de fala. Deixe-o numa janela ao lado.
4. Tecla NVDA = **Insert** (ou CapsLock, se escolheu o layout de notebook).

Comandos essenciais:

| Tecla           | O que faz                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------- |
| Ctrl            | Para a fala imediatamente                                                                 |
| Insert+Espaço   | Alterna modo **navegação** (setas leem a página) e modo **foco** (teclas vão ao controle) |
| Tab / Shift+Tab | Próximo / anterior controle focável                                                       |
| Setas ↑ ↓       | Em navegação: linha anterior / seguinte. Em foco: vão ao controle (ex.: lista)            |
| H / Shift+H     | Próximo / anterior título (só em modo navegação)                                          |
| D               | Próximo marco (região, `nav`, `main`)                                                     |
| T / B / F / K   | Próxima tabela / botão / campo de formulário / link                                       |
| Ctrl+Alt+setas  | Navegar célula a célula em tabela                                                         |
| Insert+Tab      | Fala o elemento com foco                                                                  |
| Insert+F7       | Lista de elementos (links, títulos, marcos): confira nomes                                |
| Insert+↓        | Ler continuamente a partir do ponto atual                                                 |

O NVDA alterna sozinho para modo foco ao entrar em campos de texto e combobox, e volta ao sair. Se a seta "não faz nada" ou o `H` digita no campo, confira o modo com Insert+Espaço (um som diferente toca em cada modo).

### 1.3 Navegadores e Windows

- Instale o **Firefox** (mozilla.org). Tenha também Chrome e Edge.
- **Alto contraste**: Configurações > Acessibilidade > Temas de contraste. Escolha "Aquático" ou "Crepúsculo" e clique em Aplicar. Atalho para ligar/desligar: Alt esquerdo + Shift esquerdo + PrtScn. **Deixe desligado até a seção 4.**
- **Animação reduzida**: Configurações > Acessibilidade > Efeitos visuais > Efeitos de animação **desligado** (só na seção 4; religue depois).
- **Zoom 200%**: no navegador, Ctrl e `+` até 200%. Reset: Ctrl+0.
- **320px**: DevTools (F12) > modo dispositivo (Ctrl+Shift+M), largura 320.

### 1.4 Safari / VoiceOver (opcional)

Só se tiver Mac ou iPhone. Mac: Cmd+F5 liga o VoiceOver; VO = Ctrl+Option. Repita apenas os itens marcados (S) da seção 2. iPhone: Ajustes > Acessibilidade > VoiceOver; deslize para a direita/esquerda para navegar, toque duplo ativa. Registre falhas com "leitor: VoiceOver".

## 2. Checklists por componente (cerca de 75 min)

Ordem por risco. Comece com NVDA ligado, Firefox, modo navegação. A coluna "Esperado" descreve o que deve ocorrer na tela e ser falado.

### 2.1 Combobox (cerca de 15 min)

Rota: `#/componentes/combobox`. (R) (C) (S)

| #   | O que fazer                                                       | Esperado                                                                                                                                                | Resultado           |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até o campo do exemplo de lista local.                        | Fala o rótulo e "caixa de combinação" (recolhido/editável). Não abre sozinho.                                                                           | [ ] ok / [ ] falhou |
| 2   | Digite 2 letras de um item conhecido.                             | Lista abre e filtra. Cerca de 0,5 s depois fala "N resultados disponíveis". Nada falado a cada tecla.                                                   | [ ] ok / [ ] falhou |
| 3   | Pressione ↓ duas vezes.                                           | **Foco continua no campo.** A cada seta o NVDA fala o nome da opção (e posição, "N de M"). Destaque visual acompanha. Nenhum "N resultados" ao navegar. | [ ] ok / [ ] falhou |
| 4   | Validar `aria-activedescendant`: o NVDA fala a opção a cada seta? | Uma fala por seta, sem silêncio e sem repetir. Anote se alguma seta ficou muda.                                                                         | [ ] ok / [ ] falhou |
| 5   | Enter na opção destacada.                                         | Lista fecha, campo mostra o rótulo, fala "{opção} selecionado."                                                                                         | [ ] ok / [ ] falhou |
| 6   | Digite algo sem resultado (ex.: `zzz`).                           | Fala "Nenhum resultado." e a lista mostra a mensagem de vazio.                                                                                          | [ ] ok / [ ] falhou |
| 7   | Digite uma opção, Esc; Esc de novo.                               | 1º Esc fecha a lista (texto fica). 2º Esc limpa o texto.                                                                                                | [ ] ok / [ ] falhou |
| 8   | Digite texto parcial que não é opção e tente enviar (Enter).      | Não envia; "Escolha uma das opções da lista." é mostrada/falada.                                                                                        | [ ] ok / [ ] falhou |
| 9   | Alt+↓ e Alt+↑.                                                    | Abre sem mover o destaque; fecha.                                                                                                                       | [ ] ok / [ ] falhou |
| 10  | Tab com a lista aberta.                                           | Fecha sem escolher; foco vai ao próximo controle.                                                                                                       | [ ] ok / [ ] falhou |
| 11  | Opção desabilitada ("Potiraguá"): ↓ passa por ela?                | É pulada.                                                                                                                                               | [ ] ok / [ ] falhou |
| 12  | Mouse: clique numa opção.                                         | Seleciona; foco permanece no campo.                                                                                                                     | [ ] ok / [ ] falhou |
| 13  | Fonte remota (aba React de "Fonte remota"): digite 2+ letras.     | "Carregando…" só se demorar; depois resultados; **o PageLoader não aparece**.                                                                           | [ ] ok / [ ] falhou |
| 14  | Role a página ou estreite a janela com a lista aberta.            | Popup acompanha o campo; vai para cima se não cabe embaixo.                                                                                             | [ ] ok / [ ] falhou |
| 15  | Combobox dentro de Modal (se houver): Esc com a lista aberta.     | Fecha só a lista, **não o modal**.                                                                                                                      | [ ] ok / [ ] falhou |

### 2.1b FileInput (cerca de 5 min)

Rota: `#/componentes/file-input`. (R) (C) (S)

| #   | O que fazer                  | Esperado                                                                                                                                              | Resultado           |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até o campo.             | Fala o rótulo, "botão" de escolher arquivo e a descrição (dica de formato/tamanho). Foco visível.                                                     | [ ] ok / [ ] falhou |
| 2   | Enter ou Espaço.             | Abre o seletor de arquivos do Windows. Cancele com Esc: foco volta ao campo.                                                                          | [ ] ok / [ ] falhou |
| 3   | Escolha um arquivo fictício. | O nome do arquivo é mostrado e falado ao voltar o foco. O texto nativo ("Nenhum arquivo...") segue o idioma do navegador: anote só se ficar ilegível. | [ ] ok / [ ] falhou |
| 4   | Exemplo com erro.            | Fala "inválido" e a mensagem de erro como descrição; erro também visível por ícone/texto, não só cor.                                                 | [ ] ok / [ ] falhou |
| 5   | Exemplo desabilitado.        | Falado como "indisponível"; Tab não entra; aparência distinta sem depender de cor.                                                                    | [ ] ok / [ ] falhou |

### 2.1c FileUpload (cerca de 15 min)

Rota: `#/componentes/file-upload`. (R) (C) (S) Prepare no Explorador do Windows uma pasta de teste com: 3 arquivos pequenos fictícios de tipo permitido, 1 arquivo maior que o limite do exemplo, 1 de tipo não permitido (ex.: `.exe` renomeado ou `.zip`) e uma cópia de um dos pequenos (mesmo nome). Deixe o Explorador ao lado do navegador.

| #   | O que fazer                                                                                                           | Esperado                                                                                                                                                                                 | Resultado           |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até a dropzone.                                                                                                   | Fala o nome e a descrição (formatos, tamanho, limite). Anel de foco visível na dropzone.                                                                                                 | [ ] ok / [ ] falhou |
| 2   | Enter; depois Espaço.                                                                                                 | Cada um abre o seletor de arquivos. Escolha 2 arquivos: a lista mostra os dois e o NVDA fala "{nome} adicionado" (uma fala por arquivo ou um resumo, sem repetir).                       | [ ] ok / [ ] falhou |
| 3   | **Arraste** 3 arquivos válidos do Explorador para a dropzone.                                                         | A área muda de aparência ao arrastar (sem depender só de cor); ao soltar, os 3 entram na lista e são anunciados.                                                                         | [ ] ok / [ ] falhou |
| 4   | Arraste o arquivo grande demais.                                                                                      | Não entra como válido; mostra erro por arquivo; fala "arquivo maior que o permitido" (texto equivalente).                                                                                | [ ] ok / [ ] falhou |
| 5   | Arraste o arquivo de tipo errado.                                                                                     | Fala "tipo não permitido"; não entra na lista de envio.                                                                                                                                  | [ ] ok / [ ] falhou |
| 6   | Arraste de novo um arquivo já adicionado (mesmo nome).                                                                | Fala "já foi adicionado"; lista sem duplicata.                                                                                                                                           | [ ] ok / [ ] falhou |
| 7   | Exceda o limite de quantidade (exemplo com limite).                                                                   | Fala o aviso de limite; os que passam do limite não entram.                                                                                                                              | [ ] ok / [ ] falhou |
| 8   | Anote: os anúncios saem na região de status sem repetir e sem silêncio?                                               | **Validar**: uma fala por evento, na ordem; nada de fala duplicada ao adicionar vários de uma vez.                                                                                       | [ ] ok / [ ] falhou |
| 9   | Exemplo desabilitado: arraste um arquivo para a área.                                                                 | **Nada acontece e o navegador NÃO abre o arquivo** na aba. Se o arquivo abrir, é falha bloqueante (perde-se a página).                                                                   | [ ] ok / [ ] falhou |
| 10  | Solte um arquivo fora da dropzone (em qualquer parte da página).                                                      | Comportamento padrão do navegador, mas sem erro de script (console F12 limpo). Anote o que ocorreu.                                                                                      | [ ] ok / [ ] falhou |
| 11  | Tab até "Remover" de um item no meio; Enter.                                                                          | O item sai, o NVDA fala "{nome} removido", e **o foco vai para o próximo** item/Remover (no último, o anterior; sem itens, a dropzone). Nunca para o `body`.                             | [ ] ok / [ ] falhou |
| 12  | Botões "Remover": o nome falado identifica o arquivo?                                                                 | "Remover {nome do arquivo}", não só "Remover".                                                                                                                                           | [ ] ok / [ ] falhou |
| 13  | Modo **imediato** (aba React do exemplo imediato): adicione arquivos.                                                 | Barra de progresso visível, **mas o NVDA não fala o percentual continuamente**; fala só início e conclusão ("enviado").                                                                  | [ ] ok / [ ] falhou |
| 14  | No exemplo imediato (aba React), envie um arquivo com “erro” no nome: falha na 1ª tentativa.                          | Item mostra erro por ícone e texto; o botão "Tentar de novo {nome}" fala o nome; ao ativar, reenvia.                                                                                     | [ ] ok / [ ] falhou |
| 15  | Com envio em andamento, tente enviar o formulário.                                                                    | Bloqueado; fala "Aguarde o envio dos arquivos."; o foco vai a um ponto lógico (dropzone ou resumo).                                                                                      | [ ] ok / [ ] falhou |
| 16  | Com um arquivo falhado pendente, tente enviar o formulário.                                                           | Também bloqueado, com mensagem que diz o que fazer (tentar de novo ou remover).                                                                                                          | [ ] ok / [ ] falhou |
| 17  | Largura 320px, arquivo de nome muito longo.                                                                           | Nome quebra em até 2 linhas (com reticências depois), sem rolagem horizontal; botão Remover continua visível e com alvo de 24px ou mais.                                                 | [ ] ok / [ ] falhou |
| 18  | **Opcional**: formulário real contra servidor PHP/Java local, `name="documentos[]"`, `enctype="multipart/form-data"`. | O servidor recebe todos os arquivos adicionados (e só eles; os removidos não vão). Em Firefox, confira que `input.files` foi preenchido (via `DataTransfer`). Use só arquivos fictícios. | [ ] ok / [ ] falhou |

### 2.1d MultiSelect (cerca de 12 min)

Rota: `#/componentes/multi-select`. (R) (C) (S)

| #   | O que fazer                                                               | Esperado                                                                                                                                                  | Resultado           |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até o campo; ↓ para abrir.                                            | Fala rótulo, "caixa de combinação" e "recolhido/expandido"; lista abre; foco permanece no campo.                                                          | [ ] ok / [ ] falhou |
| 2   | ↓ e ↑ pelas opções.                                                       | Fala a opção a cada seta (como no Combobox, `aria-activedescendant`) com seu estado (selecionada ou não).                                                 | [ ] ok / [ ] falhou |
| 3   | Enter numa opção.                                                         | Alterna a seleção e **mantém a lista aberta**. Fala "{opção} selecionado" e a contagem ("2 selecionados"). Enter de novo: "removido".                     | [ ] ok / [ ] falhou |
| 4   | **Validar** anúncios: "selecionado"/"removido" e contagem.                | Uma fala por ação, sem duplicar e sem silêncio.                                                                                                           | [ ] ok / [ ] falhou |
| 5   | Digite texto para filtrar; Enter.                                         | Filtra, fala "N resultados disponíveis" após pausa; Enter seleciona a destacada; o texto é limpo ou mantido conforme o exemplo (anote).                   | [ ] ok / [ ] falhou |
| 6   | Com o texto vazio, Backspace.                                             | Remove a última etiqueta e fala "{opção} removido". Com texto, Backspace só apaga letra.                                                                  | [ ] ok / [ ] falhou |
| 7   | Tab a partir do campo.                                                    | Passa pelos botões "Remover {opção}" de cada etiqueta, um por parada, com nome completo. Enter remove e o foco vai a um ponto lógico.                     | [ ] ok / [ ] falhou |
| 8   | Em navegação (setas), leia as etiquetas selecionadas.                     | São anunciadas como **lista** ("lista com N itens"). **Repita no Firefox** (as etiquetas usam `display: contents`, que pode perder a semântica de lista). | [ ] ok / [ ] falhou |
| 9   | Exemplo com limite: selecione até o limite e tente mais um.               | Fala "Limite de N itens atingido."; a opção extra não entra; opções restantes ficam indisponíveis ou ignoradas.                                           | [ ] ok / [ ] falhou |
| 10  | Exemplo obrigatório: envie sem selecionar.                                | Não envia; fala "obrigatório"/"inválido" e a mensagem de erro; foco no campo.                                                                             | [ ] ok / [ ] falhou |
| 11  | Dentro de modal (se houver): Esc com a lista aberta; Esc com ela fechada. | 1º Esc fecha só a lista; o 2º fecha o modal.                                                                                                              | [ ] ok / [ ] falhou |
| 12  | Tab com a lista aberta; clique numa opção com o mouse.                    | Tab fecha sem alterar a seleção; clique alterna e o foco permanece no campo.                                                                              | [ ] ok / [ ] falhou |
| 13  | Largura 320px com muitas etiquetas.                                       | Etiquetas quebram de linha; sem rolagem horizontal; foco não fica coberto.                                                                                | [ ] ok / [ ] falhou |

### 2.1e Data nativa (cerca de 6 min)

Rota: `#/componentes/date-input`. (R) (C)

| #   | O que fazer                                                                                          | Esperado                                                                                                                                                                         | Resultado           |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até cada campo (data, hora, data e hora, mês); use as setas e dígitos.                           | Fala rótulo, tipo ("editor de data" ou equivalente) e a parte em foco (dia, mês, ano). Foco visível no campo todo; o ícone do seletor aparece com cor legível em claro e escuro. | [ ] ok / [ ] falhou |
| 2   | Abra o seletor nativo (botão ou Alt+↓) e feche com Esc.                                              | O calendário é do navegador (anote só se ficar ilegível); o foco volta ao campo.                                                                                                 | [ ] ok / [ ] falhou |
| 3   | Exemplo com limites: digite uma data de 2025 e envie.                                                | O navegador bloqueia o envio e explica (min/max); campo obrigatório vazio também bloqueia.                                                                                       | [ ] ok / [ ] falhou |
| 4   | Exemplo de erro e desabilitado.                                                                      | Erro: fala "inválido" e a mensagem como descrição, visível por texto além da cor. Desabilitado: Tab não entra, aparência distinta.                                               | [ ] ok / [ ] falhou |
| 5   | Compare a altura e o texto do campo de data com um Input de texto ao lado (Chrome, Firefox, Safari). | Mesma altura, borda e alinhamento do texto; sem desalinhamento vertical.                                                                                                         | [ ] ok / [ ] falhou |

### 2.1f DatePicker (cerca de 18 min)

Rota: `#/componentes/date-picker`. (R) (C) (S)

| #   | O que fazer                                                                                   | Esperado                                                                                                                                                                                                                                                  | Resultado           |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até o botão de calendário; Enter ou Espaço. Repita com Alt+↓ no campo.                    | Fala "Escolher data, botão, recolhido" e, aberto, "expandido". O diálogo abre (nomeado "Escolher data") com o foco no dia escolhido ou em hoje.                                                                                                           | [ ] ok / [ ] falhou |
| 2   | Na grade, ←/→, ↑/↓, Home/End, PageUp/PageDown e Shift+PageUp/PageDown.                        | **Validar**: cada tecla fala a **data completa** ("15 de março de 2026, domingo", com hoje/selecionado/indisponível quando for o caso) uma vez só. PageUp/PageDown mudam o mês e Shift+PageUp/PageDown o ano, mantendo o dia (29/02 vira 28/02).          | [ ] ok / [ ] falhou |
| 3   | Mude de mês pelas setas do cabeçalho, pelos selects e pelo teclado.                           | **Validar**: o NVDA fala o novo título ("abril de 2026") sem repetir; não fala duas vezes nem fica em silêncio.                                                                                                                                           | [ ] ok / [ ] falhou |
| 4   | Enter ou Espaço num dia.                                                                      | Fecha, o foco volta ao botão, o campo mostra dd/mm/aaaa e o NVDA fala a data escolhida (status). Esc: fecha sem mudar a data e devolve o foco ao botão.                                                                                                   | [ ] ok / [ ] falhou |
| 5   | Digite `15032026` no campo; depois cole `2026-03-15` e `15/03/2026`.                          | A máscara põe as barras (15/03/2026) e preserva o cursor; os dois formatos colados são aceitos.                                                                                                                                                           | [ ] ok / [ ] falhou |
| 6   | Digite `31/02/2026`, uma data parcial (`15/03`) e uma fora do intervalo; saia do campo (Tab). | Fala "inválido" e a mensagem ("Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026)." / "Escolha uma data entre 01/01/2026 e 31/12/2026."); a mensagem visível aparece como texto, não só pela borda. Enviar o formulário é bloqueado. | [ ] ok / [ ] falhou |
| 7   | Exemplo de bloqueios: navegue até um fim de semana e a um feriado listado.                    | O foco **chega** ao dia, que aparece riscado e é falado como indisponível; Enter não escolhe e avisa "data indisponível". Digitar uma data bloqueada dá erro.                                                                                             | [ ] ok / [ ] falhou |
| 8   | Exemplo obrigatório: envie vazio.                                                             | Não envia; fala "obrigatório"/"inválido" e a mensagem; foco no campo.                                                                                                                                                                                     | [ ] ok / [ ] falhou |
| 9   | Tab dentro do diálogo aberto (e Shift+Tab).                                                   | Circula: mês anterior, selects, próximo mês, grade, Hoje, Fechar; nunca sai para a página de trás.                                                                                                                                                        | [ ] ok / [ ] falhou |
| 10  | Botão Hoje; clique fora do calendário.                                                        | Hoje escolhe e fecha (ou avisa indisponível). Clicar fora fecha **sem mover o foco**.                                                                                                                                                                     | [ ] ok / [ ] falhou |
| 11  | Dentro de Modal (se houver): Esc com o calendário aberto; Esc com ele fechado.                | 1º Esc fecha só o calendário; o 2º fecha o modal.                                                                                                                                                                                                         | [ ] ok / [ ] falhou |
| 12  | Largura 320px; abra o calendário.                                                             | As 7 colunas cabem sem rolagem horizontal; o calendário não é cortado nas bordas; alvos de 24px ou mais; o topo do calendário não cobre o foco.                                                                                                           | [ ] ok / [ ] falhou |
| 13  | Alto contraste ligado.                                                                        | Hoje, escolhido, foco e indisponível distinguíveis sem cor; borda do calendário e do botão visíveis.                                                                                                                                                      | [ ] ok / [ ] falhou |

### 2.1g DateRangePicker (cerca de 15 min)

Rota: `#/componentes/date-range-picker`. (R) (C) (S)

| #   | O que fazer                                                                                            | Esperado                                                                                                                                   | Resultado           |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 1   | Tab até o campo inicial, depois o final e o botão; Alt+↓ no campo.                                     | Cada campo fala "Data inicial" / "Data final" dentro do grupo nomeado ("Período do relatório"). O calendário abre com o foco no dia certo. | [ ] ok / [ ] falhou |
| 2   | Enter num dia (início).                                                                                | Fala "Início: 03/03/2026. Escolha a data final." (status). O calendário **continua aberto**; o dia fala "início do período".               | [ ] ok / [ ] falhou |
| 3   | Mova as setas e o mouse para outros dias.                                                              | A prévia da faixa acompanha o foco e o ponteiro; faixa contínua, início e fim em cor de ação e meio distinto (sem depender só de cor).     | [ ] ok / [ ] falhou |
| 4   | Enter em um dia depois do início (fim).                                                                | Fala "Período: 03/03/2026 a 15/03/2026."; fecha; foco volta ao botão; os dois campos mostram as datas.                                     | [ ] ok / [ ] falhou |
| 5   | Escolha um 2º dia **antes** do início.                                                                 | Vira o novo início (não fecha), com o aviso de início.                                                                                     | [ ] ok / [ ] falhou |
| 6   | Esc no meio da escolha (só o início escolhido).                                                        | Descarta a escolha e mantém o período anterior; devolve o foco ao botão.                                                                   | [ ] ok / [ ] falhou |
| 7   | Exemplo de período máximo: escolha o início e navegue além do limite.                                  | Dias além do máximo ficam indisponíveis, o foco chega e fala indisponível; digitar um fim além dele dá "O período máximo é de 7 dias.".    | [ ] ok / [ ] falhou |
| 8   | Digite um fim anterior ao início, uma data inválida e deixe só um campo preenchido (exemplo opcional). | Fala "inválido" e a mensagem ("A data final deve ser igual ou posterior à inicial."); envio bloqueado; mensagem visível como texto.        | [ ] ok / [ ] falhou |
| 9   | Exemplo obrigatório: envie vazio.                                                                      | Bloqueia o envio e leva ao primeiro campo vazio, falando "obrigatório".                                                                    | [ ] ok / [ ] falhou |
| 10  | Máscara e colar nos dois campos (`03032026`, `2026-03-15`).                                            | Barras automáticas; os dois formatos aceitos; o hidden recebe ISO.                                                                         | [ ] ok / [ ] falhou |
| 11  | Esc dentro de Modal (se houver).                                                                       | 1º Esc fecha só o calendário; o 2º fecha o modal.                                                                                          | [ ] ok / [ ] falhou |
| 12  | Largura 320px; abra o calendário.                                                                      | Os dois campos quebram em linhas sem estourar; 7 colunas cabem; sem rolagem horizontal.                                                    | [ ] ok / [ ] falhou |
| 13  | Alto contraste ligado.                                                                                 | Faixa do período, início, fim e prévia distinguíveis sem cor; foco visível.                                                                | [ ] ok / [ ] falhou |

### 2.2 PageLoader (cerca de 8 min)

Rota: `#/componentes/page-loader`. (C)

| #   | O que fazer                                                               | Esperado                                                                                                                               | Resultado           |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Dispare o exemplo de espera (mais de 1 s).                                | Aparece só depois de cerca de 300 ms. **Validar**: o NVDA anuncia o diálogo com título ("Carregando…") e texto descritivo, uma vez só. | [ ] ok / [ ] falhou |
| 2   | Tab e Shift+Tab com o loader aberto; clique atrás dele.                   | Foco não chega à página de trás; clique não faz nada.                                                                                  | [ ] ok / [ ] falhou |
| 3   | Em navegação (setas), tente ler a página atrás do loader.                 | O conteúdo de trás não é lido (página inerte).                                                                                         | [ ] ok / [ ] falhou |
| 4   | Pressione Esc (uma e duas vezes).                                         | Não fecha. Se o Chrome/Edge fechar no 2º Esc, deve reabrir.                                                                            | [ ] ok / [ ] falhou |
| 5   | Quando fecha: onde está o foco? O NVDA fala algo extra?                   | Foco volta ao botão que disparou; **sem anúncio extra**.                                                                               | [ ] ok / [ ] falhou |
| 6   | Espera curta (menos de 300 ms) e espera que termina logo depois de abrir. | Curta: nunca aparece. Já aberto: fica no mínimo 400 ms (não pisca).                                                                    | [ ] ok / [ ] falhou |
| 7   | Espera longa (exemplo de 20 s, se existir).                               | Texto vira "Está demorando mais que o esperado." com "Fechar" e "Continuar aguardando"; foco em "Continuar aguardando".                | [ ] ok / [ ] falhou |
| 8   | Clique "Fechar".                                                          | Libera a página; não reabre enquanto a pendência continua.                                                                             | [ ] ok / [ ] falhou |
| 9   | DevTools > inspecionar o `main`.                                          | `aria-busy="true"` só enquanto o loader está aberto.                                                                                   | [ ] ok / [ ] falhou |

### 2.3 Modal e Drawer (cerca de 10 min)

Rotas: `#/componentes/modal` e `#/componentes/drawer`. (R) (C) (S)

| #   | O que fazer                                                       | Esperado                                                                                               | Resultado           |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------- |
| 1   | Tab até o botão que abre o modal; Enter.                          | Fala o título e "diálogo"; foco no primeiro campo (formulário) ou em Fechar (informativo).             | [ ] ok / [ ] falhou |
| 2   | Tab e Shift+Tab repetidos.                                        | Foco circula só dentro do diálogo.                                                                     | [ ] ok / [ ] falhou |
| 3   | Em navegação (setas), tente ler fora do diálogo.                  | O fundo **não** é lido.                                                                                | [ ] ok / [ ] falhou |
| 4   | Esc.                                                              | Fecha; foco volta ao botão de origem; o NVDA fala o botão.                                             | [ ] ok / [ ] falhou |
| 5   | Reabra o mesmo modal várias vezes seguidas.                       | **Validar**: título anunciado em toda abertura; sem silêncio e sem fala repetida da abertura anterior. | [ ] ok / [ ] falhou |
| 6   | Mouse: pressione dentro do conteúdo, arraste e solte no backdrop. | Não fecha (só fecha se pressionar e soltar no backdrop).                                               | [ ] ok / [ ] falhou |
| 7   | Corpo rolável (reduza a altura da janela).                        | O corpo recebe foco por Tab, é lido como "região" com o nome do título; setas rolam.                   | [ ] ok / [ ] falhou |
| 8   | Drawer: repita 1, 2 e 4.                                          | Mesmo comportamento do modal.                                                                          | [ ] ok / [ ] falhou |

### 2.4 Toast (cerca de 12 min)

Rota: `#/componentes/toast`. (R) (C) (S)

| #   | O que fazer                                                                                                | Esperado                                                                                                                                                   | Resultado           |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Dispare um toast `success` ou `info`.                                                                      | Fala uma vez ("Sucesso: {mensagem}" quando não há título). Some sozinho em 5 s ou mais. Não rouba o foco.                                                  | [ ] ok / [ ] falhou |
| 2   | Dispare um toast `danger`.                                                                                 | **Validar**: fala uma vez (`role="alert"` dentro de região `polite`). Anote se falou **duas vezes** ou nenhuma. Não fecha sozinho.                         | [ ] ok / [ ] falhou |
| 3   | Dispare `warning`.                                                                                         | Não fecha sozinho; anunciado de forma educada (polite).                                                                                                    | [ ] ok / [ ] falhou |
| 4   | Passe o mouse sobre um toast `info`; depois Tab para dentro dele.                                          | A contagem pausa em hover e em foco; ao sair, retoma.                                                                                                      | [ ] ok / [ ] falhou |
| 5   | Foco no botão Fechar do toast; Enter. Repita com Esc.                                                      | Fecha; foco volta a quem disparou.                                                                                                                         | [ ] ok / [ ] falhou |
| 6   | Dispare 4 toasts rapidamente.                                                                              | No máximo 3 visíveis; o restante espera.                                                                                                                   | [ ] ok / [ ] falhou |
| 7   | Com um modal aberto (se o exemplo permitir), dispare um toast; feche e reabra o modal com toasts visíveis. | O toast aparece dentro do modal e é lido. **Validar**: ao abrir/fechar o modal, os toasts visíveis **não** são relidos (a região remonta). Anote se forem. | [ ] ok / [ ] falhou |
| 8   | Role a página com toasts persistentes; Tab pelo conteúdo.                                                  | O foco nunca fica escondido atrás de um toast.                                                                                                             | [ ] ok / [ ] falhou |
| 9   | Ordem de Tab: os toasts são os últimos?                                                                    | Sim (limitação conhecida). Anote se atrapalhou.                                                                                                            | [ ] ok / [ ] falhou |

### 2.5 Table (cerca de 12 min)

Rotas: `#/componentes/table` e, no playground, `#/listagem`. (R) (C)

| #   | O que fazer                                                            | Esperado                                                                                                                           | Resultado           |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Em navegação, tecle T e depois Ctrl+Alt+→ / ↓.                         | Fala a legenda, "tabela com N colunas e M linhas"; cada célula vem com o cabeçalho da coluna.                                      | [ ] ok / [ ] falhou |
| 2   | Tab até o botão de ordenar um cabeçalho; Enter.                        | **Validar**: fala "Ordenado por {coluna}, crescente." (região de status), uma vez.                                                 | [ ] ok / [ ] falhou |
| 3   | Enter de novo; depois em outra coluna.                                 | "decrescente"; na outra coluna "crescente". `aria-sort` do cabeçalho muda (DevTools).                                              | [ ] ok / [ ] falhou |
| 4   | Marque uma linha com Espaço; marque outras; marque "Selecionar todos". | Fala "Selecionar {id}, marcado"; status "N selecionados" com plural correto. O "todos" fica "parcialmente marcado" quando parcial. | [ ] ok / [ ] falhou |
| 5   | Limpe a seleção ou exclua em massa (se houver).                        | Foco vai para um controle habilitado, nunca um desabilitado; o status avisa.                                                       | [ ] ok / [ ] falhou |
| 6   | Em `#/listagem`, busque algo que não existe.                           | Fala "Nenhum ... encontrado." uma vez, depois de uma pausa; estado vazio visível com a ação "Limpar busca e filtros".              | [ ] ok / [ ] falhou |
| 7   | Paginação: ative "próxima".                                            | Foco permanece no controle; status fala "Mostrando X–Y de N"; página atual falada como atual.                                      | [ ] ok / [ ] falhou |
| 8   | Reduza a largura (ou zoom 200%) até a tabela rolar.                    | A região da tabela recebe foco por Tab, é lida como região nomeada; setas rolam na horizontal; foco visível.                       | [ ] ok / [ ] falhou |

### 2.6 Tabs (cerca de 5 min)

Rota: `#/componentes/tabs`. (R) (C) (S)

| #   | O que fazer                                    | Esperado                                                 | Resultado           |
| --- | ---------------------------------------------- | -------------------------------------------------------- | ------------------- |
| 1   | Tab até a lista de abas.                       | Fala "{aba}, guia, selecionada, 1 de N".                 | [ ] ok / [ ] falhou |
| 2   | ← e → (passando da última/primeira); Home/End. | Troca e ativa a aba, volta ao início/fim; o painel muda. | [ ] ok / [ ] falhou |
| 3   | Aba desabilitada (se houver).                  | Recebe foco, fala "indisponível", **não** ativa.         | [ ] ok / [ ] falhou |
| 4   | Tab a partir da aba ativa.                     | Foco vai ao painel/conteúdo, não à próxima aba.          | [ ] ok / [ ] falhou |

### 2.7 Sidebar off-canvas (cerca de 8 min)

Rotas: `#/componentes/sidebar` e `#/componentes/app-shell`, com largura abaixo de 768px (modo dispositivo). (R) (C)

| #   | O que fazer                                                      | Esperado                                                                                                | Resultado           |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | Tab até o botão de menu; Enter.                                  | Fala "expandido"; foco vai para o item da página atual (ou o primeiro).                                 | [ ] ok / [ ] falhou |
| 2   | Tente Tab e leitura em navegação com o menu aberto.              | Cabeçalho e conteúdo atrás estão inertes (não focam e não são lidos).                                   | [ ] ok / [ ] falhou |
| 3   | Esc.                                                             | Fecha; foco volta ao botão de menu (devolução manual de foco).                                          | [ ] ok / [ ] falhou |
| 4   | Abra de novo e ative um link.                                    | Fecha; foco no conteúdo principal; o título da página é falado.                                         | [ ] ok / [ ] falhou |
| 5   | Largura de 768 a 1023px: sidebar compacta; foco/hover num ícone. | Ícones têm nome falado; tooltip aparece. Se o trilho rolar, anote o deslocamento (limitação conhecida). | [ ] ok / [ ] falhou |
| 6   | Botão de colapsar (1024px ou mais).                              | Fala o rótulo fixo com estado expandido/recolhido; o rótulo não muda.                                   | [ ] ok / [ ] falhou |

### 2.8 Formulário com validação (cerca de 10 min)

Rota: `#/formulario` (playground). (R) (C)

| #   | O que fazer                                                                 | Esperado                                                                              | Resultado           |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------- |
| 1   | Navegue pelos campos com Tab.                                               | Cada campo fala rótulo, tipo e "obrigatório" quando for; dicas lidas como descrição.  | [ ] ok / [ ] falhou |
| 2   | Envie com obrigatórios vazios.                                              | Foco vai ao resumo de erros; ele é falado e lista links.                              | [ ] ok / [ ] falhou |
| 3   | Enter num link do resumo.                                                   | Foco vai ao campo; fala "{rótulo}, inválido, {mensagem}". O endereço (hash) não muda. | [ ] ok / [ ] falhou |
| 4   | Grupo (radio/checkbox) com erro.                                            | O erro é falado **uma vez**, não duplicado pelo fieldset e pelo controle.             | [ ] ok / [ ] falhou |
| 5   | Corrija e envie.                                                            | Foco no alerta de sucesso, que é falado.                                              | [ ] ok / [ ] falhou |
| 6   | Cadastro de terceiros: o navegador oferece preencher com dados do operador? | Não (`autocomplete="off"`).                                                           | [ ] ok / [ ] falhou |
| 7   | Troque de rota (`#/dashboard`, `#/listagem`) com o leitor.                  | O título da aba muda; foco no h1 da nova tela; o NVDA fala o título.                  | [ ] ok / [ ] falhou |

### 2.9 Resto (cerca de 10 min, rápido)

| Componente                | Rota                                              | O que fazer e esperado                                                                                     | Resultado           |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------- |
| Button / Button Group     | `#/componentes/button`                            | Botão só ícone fala o nome; `loading` fala "ocupado" e ignora Enter/Espaço; grupo anuncia o nome.          | [ ] ok / [ ] falhou |
| Dropdown                  | `#/componentes/dropdown`                          | Gatilho fala recolhido/expandido; itens por Tab; Tab para fora fecha; Esc fecha e devolve foco ao gatilho. | [ ] ok / [ ] falhou |
| Alert fechável            | `#/componentes/alert`                             | Fechar move o foco ao próximo focável (ou `main`); severidade falada no início.                            | [ ] ok / [ ] falhou |
| Spinner / Skeleton        | `#/componentes/spinner`, `#/componentes/skeleton` | Spinner fala "Carregando" **ao entrar** em loading; Skeleton não é lido e o contêiner fica "ocupado".      | [ ] ok / [ ] falhou |
| Checkbox / Radio / Switch | `#/componentes/checkbox`, `radio`, `switch`       | Estado falado; Radio com setas no grupo e legenda; Switch fala "interruptor, ligado/desligado".            | [ ] ok / [ ] falhou |
| Select / Input / Textarea | `#/componentes/select`, `input`, `textarea`       | Rótulo e descrição lidos; erro falado com "inválido".                                                      | [ ] ok / [ ] falhou |
| Breadcrumb / Pagination   | `#/componentes/breadcrumb`, `pagination`          | Marcos "Trilha" e "Paginação"; item atual falado como atual.                                               | [ ] ok / [ ] falhou |
| Navbar / App shell        | `#/componentes/navbar`, `app-shell`               | Skip link é o 1º Tab e funciona; um único `main`.                                                          | [ ] ok / [ ] falhou |
| Empty State               | `#/componentes/empty-state`                       | Título no nível certo; ação com nome completo.                                                             | [ ] ok / [ ] falhou |
| Card clicável             | `#/componentes/card`                              | Um único link por card, com nome claro; foco visível no card todo.                                         | [ ] ok / [ ] falhou |

## 3. Matriz navegador × verificação (cerca de 10 min)

Sem leitor de tela (só teclado e olhos), em `#/componentes/modal`, `#/componentes/combobox`, `#/componentes/date-picker`, `#/componentes/date-range-picker` e `#/listagem`. Marque `ok`, `X` (falhou, com modelo da seção 6) ou `-` (não testado).

| Verificação                                                                                                              | Chrome | Edge | Firefox | Safari (opc.) |
| ------------------------------------------------------------------------------------------------------------------------ | ------ | ---- | ------- | ------------- |
| Modal: abre, Tab preso, Esc fecha, foco volta ao gatilho                                                                 |        |      |         |               |
| Dropdown e Combobox: popup sobre tudo, posição certa, Esc fecha                                                          |        |      |         |               |
| Foco visível em todos os controles (anel nítido, não cortado)                                                            |        |      |         |               |
| Aparência de Switch, Radio, Checkbox e Select (sem quebra)                                                               |        |      |         |               |
| Tabs: ← → Home End                                                                                                       |        |      |         |               |
| FileUpload: arrastar arquivos do Explorador, listar, remover (Firefox: drag-and-drop e `input.files` via `DataTransfer`) |        |      |         |               |
| FileInput: escolher arquivo, nome mostrado, foco visível                                                                 |        |      |         |               |
| MultiSelect: Enter alterna e mantém aberta, Backspace remove, etiquetas como lista (Firefox: `display: contents`)        |        |      |         |               |
| Data nativa: campo igual ao Input (altura, alinhamento, ícone do seletor em claro e escuro)                              |        |      |         |               |
| DatePicker: abre, setas/PageUp/Enter/Esc, máscara e colar, popup sobre tudo e posição certa (Safari: `popover`)          |        |      |         |               |
| DateRangePicker: dois cliques, prévia da faixa, máximo de dias, Esc fecha só o calendário                                |        |      |         |               |
| Tooltip da Sidebar compacta (Firefox: limitação conhecida, só anote)                                                     |        |      |         |               |
| Tema `green` e modo escuro mudam sem recarregar; a aparência persiste ao recarregar                                      |        |      |         |               |
| Linha selecionada (barra lateral, `:has()`) e Grid responsivo ao contêiner                                               |        |      |         |               |
| Toast: canto inferior, não cobre o foco                                                                                  |        |      |         |               |
| PageLoader: diálogo modal aparece e bloqueia a página                                                                    |        |      |         |               |

## 4. Alto contraste, animação reduzida, zoom e 320px (cerca de 20 min)

Use `#/componentes/button`, `modal`, `toast`, `table`, e no playground `#/formulario` e `#/dashboard`. Teste claro e escuro (alternador de aparência do site) e **um tema não azul** (green).

### 4.1 Alto contraste (`forced-colors`)

Ligue um tema de contraste (seção 1.3). Em Edge ou Chrome e em Firefox, em cada rota:

- [ ] Texto legível em todos os componentes; nada some (ícones, seta do Select, marca de Checkbox/Radio/Switch).
- [ ] **Foco** visível em botões, campos, abas, linhas e links.
- [ ] Bordas de campos, Card, Table e Modal visíveis (sem depender de sombra).
- [ ] Estado selecionado/ativo distinguível sem cor: aba selecionada, item de menu atual, linha selecionada, página atual, ordenação.
- [ ] Erro e sucesso continuam com ícone ou texto além da cor.
- [ ] Desabilitado se distingue de habilitado; Switch ligado × desligado se distingue.
- [ ] Badge, Alert e Toast: severidade legível pelo texto/ícone.
- [ ] Skeleton e Spinner visíveis.
- [ ] FileInput e FileUpload: dropzone com borda visível, foco e estado de arrasto distinguíveis; erro por arquivo e barra de progresso legíveis; desabilitado distinguível.
- [ ] DatePicker e DateRangePicker: dia de hoje, dia escolhido, dia indisponível, foco da grade e faixa do período (início, meio, fim e prévia) distinguíveis sem cor; botão de calendário e borda do popup visíveis.
- [ ] MultiSelect: etiquetas com borda, botão "Remover" visível e com foco; opção destacada e opção selecionada distinguíveis sem cor.
- [ ] Backdrop do Modal/Drawer não esconde o conteúdo do diálogo.

### 4.2 Animação reduzida (`prefers-reduced-motion`)

Desligue "Efeitos de animação" no Windows e recarregue a página.

- [ ] Modal, Drawer, Dropdown, Toast, Sidebar aparecem e saem sem deslizar/esmaecer longamente.
- [ ] Spinner e Skeleton sem giro/brilho contínuo, ou reduzidos a algo ainda perceptível (o Spinner continua dizendo "Carregando").
- [ ] Sem rolagem suave ao ir para âncora ou pular para o conteúdo.
- [ ] Nada quebra: o estado final aparece completo (nada preso em opacidade 0).

### 4.3 Zoom 200%

Ctrl e `+` até 200% (janela de 1280px equivale a cerca de 640 px CSS).

- [ ] Sem rolagem horizontal da página (exceto Table, que rola na própria região).
- [ ] Nenhum texto cortado ou sobreposto; botões quebram linha, não estouram.
- [ ] Navbar e Sidebar passam ao modo estreito; o menu continua alcançável.
- [ ] Modal e Drawer cabem; o corpo rola e o rodapé fica alcançável.
- [ ] Toast não cobre o foco ao tabular (2.4.11).
- [ ] Foco nunca fica sob um cabeçalho fixo.

### 4.4 Largura 320px (reflow, 1.4.10)

- [ ] Sem rolagem horizontal da página em `#/dashboard`, `#/listagem`, `#/formulario`.
- [ ] Linhas de botões/campos quebram em vez de estourar.
- [ ] Table rola só no próprio contêiner; Pagination estreita ("Página X de Y") legível.
- [ ] Alvos de toque de pelo menos 24 px; na densidade `compact`, nenhum botão menor que isso.
- [ ] DatePicker e DateRangePicker abertos: 7 colunas cabem, sem rolagem horizontal; os dois campos do período quebram em linhas.
- [ ] Dropdown e Combobox abertos cabem na tela e não são cortados nas bordas.

## 5. Encerramento (cerca de 5 min)

- [ ] NVDA fechado (Insert+Q); contraste do Windows e efeitos de animação restaurados; zoom em 100%.
- [ ] Servidores parados (Ctrl+C nos dois terminais).
- [ ] Falhas registradas na seção 6, uma por bloco, numeradas. Entregue a lista ao gerente do projeto para priorizar (bloqueante: impede uso por teclado/leitor de tela ou falha de contraste em texto).

## 6. Modelo para registrar falha

Copie o bloco para cada falha. Use apenas os dados fictícios do site; nunca cole nomes, documentos ou e-mails reais.

```
### F-00N
- Rota: #/...
- Navegador e versão: (ex.: Firefox 1xx)
- Leitor / modo: (ex.: NVDA 20xx.x, modo navegação) ou "sem leitor"
- Item do roteiro: (ex.: 2.4 item 2)
- Tema / modo / densidade: (ex.: green, escuro, compact)
- Passo a passo (teclas exatas):
  1.
  2.
- Esperado:
- Obtido: (cole o texto do Visualizador de fala, se for leitor)
- Frequência: sempre | às vezes
- Severidade sugerida: bloqueante | importante | melhoria
- Captura de tela (opcional, sem dados reais):
```

### Critério de saída da Fase 7

- Nenhum item **bloqueante** aberto nas áreas 2.1 a 2.8 (incluindo 2.1b a 2.1d) com NVDA + Firefox.
- Os pontos marcados "Validar" (toast danger duplicado, reanúncio de toasts ao abrir/fechar modal, anúncio do PageLoader, `aria-activedescendant` do Combobox, status de ordenação da tabela, reabertura de modal) têm resultado registrado, mesmo quando aceitável, para atualizar `docs/architecture/comportamento.md`.
- Alto contraste, animação reduzida, zoom 200% e 320px sem perda de conteúdo.
