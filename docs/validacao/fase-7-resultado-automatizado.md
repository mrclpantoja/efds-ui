# Fase 7: resultado da validação automatizada

Data: 20/11/2026. Roteiro seguido: [`fase-7.md`](fase-7.md). Este arquivo registra o que foi possível verificar por automação. **Não substitui** as sessões com leitor de tela e toque do roteiro, que foram feitas à parte pelo responsável do projeto.

## Resumo

- A suíte do projeto passou: 801 testes em `behavior` e 746 em `react`.
- Foram feitas cerca de 700 verificações por navegador, em Chrome 158, Edge 158 e Firefox 160.
- **Nenhuma falha bloqueante** de teclado, foco ou ARIA nas áreas 2.1 a 2.8, nos três navegadores.
- Foram achadas **5 falhas importantes** e **6 melhorias** (seção "Falhas"). As cinco importantes (F-001 a F-005) foram **corrigidas em 21/11/2026** e reconferidas nos três navegadores (seção "Correções de 21/11/2026"). As melhorias F-006 a F-011 foram **corrigidas em 21/11/2026**, na sequência (mesma seção).
- **Fase 7 concluída em 21/11/2026.** O responsável do projeto fez as sessões manuais do roteiro (NVDA, toque, contraste real do Windows, LibreOffice e Acrobat) e informou que tudo passou, sem falha nova. Este arquivo não traz o detalhe dessas sessões: os pontos "Validar" abaixo registram só o indício da automação.

## Correções de 21/11/2026

Os números das tabelas abaixo são os da rodada de 20/11, antes das correções.

| Falha | O que mudou                                                                                                                                                                                                                                                                                      | Reconferido                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-001 | Nos blocos `forced-colors` de `datepicker.css`, `calendar.css`, `time-picker.css` e `tag.css`, o `::before` do ícone recebe `background-color: ButtonText` (`GrayText` quando desabilitado). Cor de sistema explícita não é trocada pelo navegador, então não foi preciso `forced-color-adjust`. | Chrome e Edge, emulação: nenhum ícone por máscara invisível em 17 rotas (resta só a marca do checkbox desmarcado, invisível de propósito); 4 capturas conferidas a olho       |
| F-002 | `select.css`: em `forced-colors` o Select usa `forced-color-adjust: none` com cores de sistema (`Field`, `FieldText`, `CanvasText`, `GrayText` no desabilitado), o que preserva o gradiente da seta.                                                                                             | Chrome e Edge, emulação: seta presente em todos os Selects da página, captura conferida                                                                                       |
| F-003 | `Field`, `Fieldset`, `Combobox` e `MultiSelect` do React tratam texto vazio em `error` (e `helper`/`success` no `Field`) como ausente.                                                                                                                                                           | Os três navegadores: 9 rotas sem `.eds-error` vazio e sem campo inválido sem mensagem; grupo de datas 108/110, 108/110 e 107/110 (restam F-006 e o `type="month"` do Firefox) |
| F-004 | `gridColumns` (behavior e React) compara o `top` com folga de meia altura do item, e o item levantado volta a contar como da primeira linha.                                                                                                                                                     | Os três navegadores, HTML e React: ↓ anda uma linha na grade de 5 colunas                                                                                                     |
| F-005 | React: sair do item pego para outro controle cancela, mesmo dentro da lista. Nas duas camadas o foco não é mais puxado de volta ao pegador (no HTML o Tab cancelava, mas o foco voltava).                                                                                                        | Os três navegadores, HTML e React: Tab cancela, anuncia e o foco segue; Sortable 36/36                                                                                        |

Cada correção ganhou teste na suíte: `behavior` passou a 803 testes e `react` a 749. Fica igual ao que era: no React, clicar numa área sem foco com o item pego não cancela (o item continua pego até Esc, Espaço ou Tab).

### Melhorias F-006 a F-011

| Falha | O que mudou                                                                                                                                                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-006 | Os exemplos React "Obrigatório e erro" (DatePicker) e "Obrigatório e validação" (DateRangePicker) levam o foco ao primeiro campo vazio depois de um envio recusado.                                                                                                                    |
| F-007 | O exemplo HTML da tabela deixou de mostrar o contador fixo "1 selecionado"; a barra traz um título e um comentário explica que a contagem visível é do código do app (`eds:table-select-change`, `detail.count`). O anúncio da seleção já vinha da região de status.                   |
| F-008 | O exemplo React de busca local passou a usar `useTableFilter` e `<Table status>`: mesmo atraso do HTML e "Filtro removido. N linhas." no Esc.                                                                                                                                          |
| F-009 | O texto "Última mudança" do exemplo React da árvore editável perdeu o `aria-live`; quem anuncia é a região de status da Tree.                                                                                                                                                          |
| F-010 | `Combobox` do React: texto sem escolha vira erro visível (`p.eds-error`, `aria-invalid`, `aria-describedby`, anúncio) ao sair do campo, no Enter ou num envio recusado, e some quando o campo volta a ser válido. Erro vindo do `Field` prevalece. Teste novo na suíte (`react`: 750). |
| F-011 | `favicon.svg` (a marca do site) em `apps/docs/public` e `apps/playground/public`, ligado nos dois `index.html`.                                                                                                                                                                        |

## Como foi feito

- Chrome e Edge reais dirigidos por Playwright; Firefox real dirigido por Puppeteer (WebDriver BiDi). Todos sem interface, janela de 1280 × 800.
- Teclado e mouse reais do navegador (eventos confiáveis), não eventos sintéticos. Exceções: colar e soltar arquivos usaram eventos montados em script.
- A "fala" foi substituída por dois indícios: os atributos ARIA de cada controle e um observador que registra toda mudança de texto em regiões vivas (`role="status"`, `role="alert"`, `aria-live`).
- Alto contraste, animação reduzida, zoom 200% e 320px foram emulados pelo navegador, não pelo Windows.
- Os scripts ficaram fora do repositório. Só dados fictícios dos exemplos foram usados.

### Limites

| Não verificado                                                | Por quê                                  | Onde fica no roteiro                                  |
| ------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| O que o NVDA e o VoiceOver realmente falam                    | Não há como ouvir o leitor por automação | Seção 2 inteira, pontos "Validar"                     |
| Toque em celular ou tablet                                    | Exige aparelho                           | 2.11 itens 12 a 14, 2.12 item 16, 2.14 item 7         |
| Tema de contraste do Windows                                  | Só a emulação foi usada                  | 4.1                                                   |
| Seletor de arquivos do Windows e arrastar do Explorador       | Fora do navegador                        | 2.1b itens 2 e 3, 2.1c itens 2 e 3                    |
| LibreOffice, Acrobat e Safari                                 | Não instalados                           | 2.13 itens 4 e 5, coluna Safari                       |
| Arrastar com o mouse na Tree e rolagem automática ao arrastar | Não automatizado                         | 2.11 item 10, 2.12 itens 13 e 14                      |
| Combobox, MultiSelect e DatePicker dentro de Modal            | Não há exemplo no site                   | 2.1 item 15, 2.1d item 11, 2.1f item 11, 2.1g item 11 |
| Seleção com filtro ativo na tabela                            | Exemplo não localizado                   | 2.5 item 12                                           |

## Resultado por seção

"ok/total" conta só verificações com resultado certo ou errado. As falhas da coluna estão detalhadas adiante.

| Seção do roteiro                                                  | Chrome           | Edge       | Firefox                        | Falhas              |
| ----------------------------------------------------------------- | ---------------- | ---------- | ------------------------------ | ------------------- |
| 2.1 Combobox, 2.1d MultiSelect, 2.6 Tabs                          | 113/113          | 113/113    | 113/113                        | —                   |
| 2.2 PageLoader, 2.3 Modal e Drawer, 2.4 Toast, 2.10 Diálogos      | 123/123          | 123/123    | 123/123                        | —                   |
| 2.5 Table, 2.7 Sidebar, 2.8 Formulário, 2.9 Resto, 2.1b FileInput | 91/94            | 92/94      | 92/94                          | F-007, F-008        |
| 2.1e Data nativa, 2.1f DatePicker, 2.1g DateRangePicker           | 106/109          | 106/109    | 106/110                        | F-003, F-006        |
| 2.1c FileUpload, 2.11 Sortable, 2.12 Tree                         | 118/124          | 118/124    | 118/124                        | F-004, F-005, F-009 |
| 2.13 Exportação, 2.14 Máscara                                     | 94/94            | 94/94      | 94/94                          | —                   |
| 3 Matriz, 4.3 Zoom 200%, 4.4 320px                                | 85/85            | 85/85      | 84/85                          | —                   |
| 4.1 Alto contraste (emulado)                                      | ver F-001, F-002 | não rodado | sem falha na captura conferida | F-001, F-002        |
| 4.2 Animação reduzida (emulada)                                   | 10/10            | não rodado | 10/10                          | —                   |

Observações sobre a tabela:

- A falha a mais do Firefox em datas é o `type="month"`, que o Firefox não implementa (vira campo de texto). É limitação do navegador.
- A falha do Firefox em 4.4 não se repetiu ao testar isolado (o link "Pular para o conteúdo" fica visível e clicável a 320px).
- Em 4.1 o critério automático de "borda" deu falso positivo (a tabela tem borda nas células). O resultado veio de medir a cor dos ícones e de quatro capturas de tela conferidas a olho: Modal, DatePicker e listagem no Chrome, DatePicker no Firefox. As demais telas da lista 4.1 foram capturadas, mas não revisadas uma a uma.

### O que passou e merece registro

- **Firefox, FileUpload:** soltar arquivos preenche `input.files` via `DataTransfer`; desabilitado cancela `dragover` e `drop`, então o navegador não abre o arquivo.
- **Exportação:** os quatro formatos baixam com o nome certo nos três navegadores.
  - CSV: BOM UTF-8, ponto e vírgula, acentos corretos. O Excel abre com colunas separadas e Total numérico.
  - XLSX: o Excel abre sem pedir reparo; cabeçalho em negrito e congelado, filtro, Total em `R$ #.##0,00`, Entrega como data, soma funciona.
  - PDF: uma página com título, subtítulo, "Gerado em", cabeçalho, totais à direita e "Página 1 de 1" (conferido pelas coordenadas do texto).
  - CPF: ausente nos arquivos do exemplo HTML; `***.***.***-NN` no React. Nenhum arquivo traz CPF inteiro.
- **Máscaras:** telefone, CPF, CNPJ alfanumérico, CPF/CNPJ, moeda e saldo com sinal, cursor no meio, Backspace sobre literal e colar; iguais nos três navegadores.
- **Reflow:** sem rolagem horizontal da página a 640px e a 320px em 12 rotas; nenhum alvo menor que 24px; calendário, popup do Combobox, Modal e diálogos cabem na tela.
- **Animação reduzida:** Modal, Drawer, Toast e diálogos abrem sem nenhuma animação em curso; Spinner e Skeleton ficam estáticos e visíveis; sem rolagem suave.

## Falhas

Modelo da seção 6 do roteiro. Tema padrão (blue, claro, densidade padrão), salvo indicação.

### F-001

- **Situação: corrigida em 21/11/2026** (ver "Correções de 21/11/2026"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/date-picker`, `#/componentes/date-range-picker`, `#/componentes/time-picker`, `#/componentes/tag`
- Navegador e versão: Chrome 158 e Edge 158. No Firefox 160 os ícones aparecem.
- Leitor / modo: sem leitor
- Item do roteiro: 4.1 (ícones não somem; botão de calendário visível), 2.1f item 13
- Passo a passo:
  1. Ligar um tema de contraste (ou emular `forced-colors: active`).
  2. Abrir o calendário do exemplo "Básico".
- Esperado: ícone do botão de calendário e setas de mês visíveis.
- Obtido: os botões aparecem como quadrados vazios. O ícone é um `::before` com `background-color: currentColor` e `mask`; em cores forçadas o navegador troca o `background-color` pela cor de fundo do sistema e o ícone fica da cor do fundo.
- Evidência: `packages/core/src/components/datepicker.css:70-76` e bloco em `:163`; `calendar.css:120-127` e bloco em `:357`. O mesmo padrão existe em `time-picker.css` e `tag.css` (medido, não conferido por captura).
- Correção sugerida: no bloco `forced-colors`, dar ao `::before` `forced-color-adjust: none` e `background-color: ButtonText`.
- Frequência: sempre
- Severidade sugerida: importante (o botão tem nome acessível, mas quem enxerga não vê o ícone)

### F-002

- **Situação: corrigida em 21/11/2026** (ver "Correções de 21/11/2026"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/select` e qualquer tela com `.eds-select`
- Navegador e versão: Chrome 158 e Edge 158
- Leitor / modo: sem leitor
- Item do roteiro: 4.1 ("nada some: … seta do Select")
- Passo a passo:
  1. Ligar um tema de contraste.
  2. Olhar qualquer Select.
- Esperado: seta do Select visível.
- Obtido: a seta some. Ela é desenhada com dois `linear-gradient` em `background-image`, que em cores forçadas é calculado como `none`.
- Evidência: `packages/core/src/components/select.css:25-26`; o bloco em `:100-103` só troca a cor da seta.
- Frequência: sempre
- Severidade sugerida: importante

### F-003

- **Situação: corrigida em 21/11/2026** (ver "Correções de 21/11/2026"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/date-picker` (exemplo "Obrigatório e erro", aba React) e `#/componentes/date-range-picker` (exemplo "Obrigatório e validação", aba React)
- Navegador e versão: os três
- Leitor / modo: sem leitor
- Item do roteiro: 2.1f item 8, 2.1g itens 8 e 9
- Passo a passo:
  1. Abrir a aba React do exemplo, sem tocar em nada.
  2. Inspecionar os campos.
  3. No período, digitar `10/03/2026` e `05/03/2026` e sair do campo.
- Esperado: campos válidos ao carregar; no passo 3, a mensagem "A data final deve ser igual ou posterior à inicial." como texto.
- Obtido: os campos já nascem com `aria-invalid="true"` e há um `<p class="eds-error">` vazio. No passo 3 nenhum texto aparece: só a borda de erro.
- Causa: `packages/react/src/components/Field/Field.tsx:47` trata `error=""` como erro (`error != null && error !== false`). Os dois exemplos guardam o erro em `useState('')`. Com erro externo, o componente suprime a própria mensagem.
- Correção sugerida: tratar string vazia como "sem erro" no `Field`, ou os exemplos passarem `undefined`.
- Frequência: sempre
- Severidade sugerida: importante (o leitor anuncia "inválido" sem motivo e o erro fica só na cor)

### F-004

- **Situação: corrigida em 21/11/2026** (ver "Correções de 21/11/2026"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/sortable`, exemplo "Grade", abas HTML e React
- Navegador e versão: os três
- Leitor / modo: sem leitor
- Item do roteiro: 2.11 item 6
- Passo a passo:
  1. Tab até o primeiro item da grade (5 colunas a 1280px).
  2. Espaço.
  3. ↓.
- Esperado: o item desce uma linha.
- Obtido: o item anda uma posição ("Posição 2 de 6."), como se a grade tivesse uma coluna.
- Causa: `gridColumns` em `packages/behavior/src/components/sortable.ts:136-141` conta os itens com o mesmo `top` do primeiro, com tolerância de 2px. O item pego recebe `translate` de 4px para cima (`packages/core/src/components/sortable.css:120`), então deixa de alinhar com os vizinhos e a contagem dá 1.
- Frequência: sempre
- Severidade sugerida: importante

### F-005

- **Situação: corrigida em 21/11/2026** (ver "Correções de 21/11/2026"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/sortable`, exemplo "Com pegador (handle)", aba React
- Navegador e versão: os três
- Leitor / modo: sem leitor
- Item do roteiro: 2.11 item 3
- Passo a passo:
  1. Tab até o pegador do primeiro item.
  2. Espaço.
  3. ↓.
  4. Tab.
- Esperado: o movimento é cancelado, o item volta e sai "Movimento cancelado." (é o que a aba HTML faz).
- Obtido: o foco vai ao próximo pegador, o item continua deslocado e o pegador anterior continua com `aria-pressed="true"`. Nenhum anúncio.
- Causa provável: o `focusout` que cancela existe só no `@efds-ui/behavior` (`sortable.ts:411`).
- Frequência: sempre
- Severidade sugerida: importante

### F-006

- **Situação: corrigida em 21/11/2026** (ver "Melhorias F-006 a F-011"). O texto abaixo descreve o estado anterior.
- Rota: os mesmos dois exemplos React de F-003
- Item do roteiro: 2.1f item 8, 2.1g item 9
- Passo a passo:
  1. Com o campo vazio, Tab até "Salvar" (ou "Solicitar").
  2. Enter.
- Esperado: foco no primeiro campo com erro (a aba HTML faz isso pela validação nativa).
- Obtido: a mensagem aparece, mas o foco fica no botão.
- Frequência: sempre
- Severidade sugerida: melhoria (é dos exemplos, que usam `noValidate`)

### F-007

- **Situação: corrigida em 21/11/2026** (ver "Melhorias F-006 a F-011"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/table`, exemplo "Ordenação, seleção e paginação", aba HTML
- Item do roteiro: 2.5 item 4
- Passo a passo:
  1. Marcar e desmarcar linhas.
- Esperado: o contador visível da barra acompanha a seleção.
- Obtido: a barra mostra sempre "1 selecionado" (texto fixo no HTML). A região de status anuncia certo ("2 itens selecionados.").
- Frequência: sempre
- Severidade sugerida: melhoria

### F-008

- **Situação: corrigida em 21/11/2026** (ver "Melhorias F-006 a F-011"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/table`, exemplo "Busca local (filtro de linhas)", aba React
- Item do roteiro: 2.5 itens 9 e 11
- Passo a passo:
  1. Digitar `clin`.
  2. Esc.
- Esperado: anúncio depois de uma pausa; no Esc, "Filtro removido. N linhas.".
- Obtido: o anúncio sai 150 ms depois da tecla, o que na digitação normal vira quase um anúncio por tecla. No Esc as linhas voltam, sem anúncio.
- Evidência: `apps/docs/src/examples/table/filtro.tsx:56-62`.
- Frequência: sempre
- Severidade sugerida: melhoria

### F-009

- **Situação: corrigida em 21/11/2026** (ver "Melhorias F-006 a F-011"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/tree`, exemplo "Árvore editável", aba React
- Item do roteiro: 2.12 itens 5, 7 e 8 ("anúncio único")
- Obtido: o exemplo tem um texto visível "Última mudança: …" com `aria-live="polite"`. Cada ação muda essa região e também a região de status do componente, então o leitor tende a falar duas vezes.
- Severidade sugerida: melhoria (confirmar no NVDA)

### F-010

- **Situação: corrigida em 21/11/2026** (ver "Melhorias F-006 a F-011"). O texto abaixo descreve o estado anterior.
- Rota: `#/componentes/combobox`, exemplo "Lista local", aba React
- Item do roteiro: 2.1 item 8
- Passo a passo:
  1. Digitar `Por`.
  2. Esc.
  3. Enter.
- Esperado: campo inválido com a mensagem "Escolha uma das opções da lista." (a aba HTML marca `aria-invalid` e descreve o erro).
- Obtido: só a validade nativa é definida (`validationMessage`). Sem `aria-invalid` e sem texto até um envio de formulário com validação nativa.
- Severidade sugerida: melhoria (diferença de paridade)

### F-011

- **Situação: corrigida em 21/11/2026** (ver "Melhorias F-006 a F-011"). O texto abaixo descreve o estado anterior.
- Rota: todas, no site de documentação e no playground
- Obtido: `GET /favicon.ico` responde 404 e aparece como erro no console do Chrome e do Edge a cada carga.
- Severidade sugerida: melhoria

## Pontos "Validar" do critério de saída

Indício automático de cada ponto. Todos ainda precisam ser ouvidos no NVDA.

| Ponto                                  | O que a automação viu                                                                                                                            | Risco                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Toast `danger` falado duas vezes       | O toast tem `role="alert"` e é inserido uma vez numa região `aria-live="polite"`                                                                 | Aberto: dois mecanismos de anúncio no mesmo nó |
| Toasts relidos ao abrir e fechar modal | Com um toast visível, fechar e reabrir o modal não causou nenhuma mudança em região viva; o toast continuou clicável                             | Baixo                                          |
| Anúncio do PageLoader                  | `<dialog>` modal com `aria-labelledby` e `aria-describedby`; aparece após ~300 ms; nenhuma mudança de região viva ao fechar; foco volta ao botão | Baixo                                          |
| `aria-activedescendant` do Combobox    | Muda a cada seta, aponta para a opção com `aria-selected="true"`, foco continua no campo, sem anúncio de contagem ao navegar                     | Baixo                                          |
| Status de ordenação da tabela          | Uma única atualização: "Ordenado por Cliente, crescente."; `aria-sort` certo nas três colunas                                                    | Baixo                                          |
| Reabertura de modal                    | Nome e foco corretos em três aberturas seguidas; um evento de abrir e um de fechar por ciclo                                                     | Baixo                                          |

Outros indícios úteis para a sessão com NVDA:

- **Etiquetas do MultiSelect:** a lista usa `display: contents` nas abas HTML e React. É o item 2.1d-8 a ouvir no Firefox.
- **Sortable sem pegador:** o foco fica no `<li>`, sem `role` e sem estado "pego" exposto (2.11 item 5).
- **Diálogo `danger`:** nome "Atenção: Excluir pedido", com o prefixo uma vez.

## Textos do roteiro que diferem do que o sistema fala

Não são falhas; servem para atualizar o roteiro ou `comportamento.md`.

| Item         | Roteiro                                  | Sistema                                                                        |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------ |
| 2.12 item 5  | "{nome} renomeado."                      | "Item renomeado: {nome}."                                                      |
| 2.12 item 7  | "{nome} adicionado. Nível N…"            | "Item adicionado: {nome}. Nível N, posição P de T."                            |
| 2.12 item 15 | "Não foi possível carregar a árvore."    | "Não foi possível carregar os itens de {nó}. Pressione → para tentar de novo." |
| 2.1d item 3  | "{opção} selecionado" e "2 selecionados" | "{opção}: selecionado. 2 itens selecionados."                                  |
| 2.5 item 4   | "N selecionados"                         | "N itens selecionados." (HTML), "N pedidos selecionados." (React)              |
| 2.1f item 1  | "Escolher data, botão"                   | Depois de escolher, o botão passa a "Escolher data. Atual: dd/mm/aaaa"         |

## Notas menores

- **DatePicker, clicar fora:** o calendário fecha, mas o foco vai para o `<main>` (que é focável por script) em vez de ficar onde estava. O roteiro (2.1f item 10) espera "sem mover o foco".
- **Diálogo nativo:** em Chrome e Edge, Tab depois do último controle de um Modal leva o foco à interface do navegador antes de voltar; nunca à página de trás. É o comportamento do `<dialog>`.
- **Skeleton:** o exemplo "formas" não tem contêiner com `aria-busy`; o exemplo "região" tem.
- **Formulário de referência:** o `textarea` "Observações" não tem `autocomplete="off"` (2.8 item 6); os campos de texto têm.
- **Resumo de erros do formulário:** recebe foco (`role="group"`, `tabindex="-1"`) e não usa região viva; a leitura depende do foco.

## Próximos passos

Nenhum nesta fase: as correções F-001 a F-011 estão aplicadas e as sessões manuais foram concluídas. O que falta para a 0.1.0 está nas notas do projeto (nome no npm e publicação).
