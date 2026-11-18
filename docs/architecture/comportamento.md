# Contrato de comportamento (JS/React)

O core é CSS puro. O que o CSS e a plataforma **não** entregam fica a cargo da camada React (`@eds-ui/react`), e — se um dia existir — do pacote de comportamento para quem usa só HTML (decisão em aberto). Este documento lista essas obrigações, levantadas nas auditorias de UX/WCAG 2.2 AA das Fases 2 e 3. O markup de referência de cada componente está em `apps/playground/src/demos/*.tsx`.

## Ações

| Componente | Obrigação                                                                                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button     | Em `loading` (`aria-busy="true"`), ignorar clique **e** Enter/Espaço. Link desabilitado: sem `href` ou `preventDefault`, `tabIndex={-1}`.                                                                                                                                                     |
| Dropdown   | Padrão _disclosure_ (sem `role="menu"`). Sincronizar `aria-expanded` do gatilho pelo evento `toggle` do popover. Menu com `aria-labelledby` = id do gatilho. Itens ativos fecham o menu (`popovertargetaction="hide"`). Setas só quando houver JS de navegação; aí passa a ser `role="menu"`. |

## Formulários

- `data-required` em `.eds-label`/`.eds-legend` é só visual: o controle precisa de `required` ou `aria-required`.
- Erro: `aria-invalid="true"` + `aria-describedby` apontando para `.eds-error`; em grupos, descrever o controle, não o `fieldset` (evita leitura dupla).
- `indeterminate` do checkbox é propriedade DOM (definir via ref).
- Campos de dados pessoais com `autocomplete` adequado (WCAG 1.3.5).

## Superfícies

| Componente     | Obrigação                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modal / Drawer | Abrir com `showModal()` (foco preso, Esc e retorno de foco são nativos). Fechar pelo backdrop **só** se `pointerdown` e `click` ocorreram no próprio `<dialog>` (WCAG 2.5.2). Formulário: `autoFocus` no primeiro campo; informativo: foco no Fechar. Corpo rolável recebe `tabIndex=0` + `role="region"` + `aria-labelledby` **somente** quando rola de fato. Considerar confirmação ao fechar formulário alterado. |
| Card           | Card clicável usa link esticado (`.eds-card-link`), nunca o card como botão. Texto do card fica não selecionável — aceito.                                                                                                                                                                                                                                                                                           |

## Navegação

| Componente                  | Obrigação                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tabs                        | Roving tabindex (`0` na ativa, `-1` nas demais), ←/→, Home/End. Aba indisponível com `aria-disabled="true"` (alcançável por setas, não ativa). Sem JS, não usar o padrão tablist.                      |
| Sidebar (off-canvas mobile) | Popover não é modal: ao abrir, marcar `.eds-app-header` e `.eds-app-main` com `inert`; remover no `toggle` closed. Sincronizar `aria-expanded` do gatilho. Fechar (`hidePopover()`) ao navegar em SPA. |
| Sidebar (colapsar)          | Botão com rótulo fixo, `aria-expanded` + `aria-controls`. Sem `title` no modo expandido.                                                                                                               |
| App shell                   | Um único `<main>` por página.                                                                                                                                                                          |

## Feedback

| Componente         | Obrigação                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast              | Com um `dialog:modal` aberto, a região de toasts é renderizada **dentro** dele (portal); fora disso, na página. `danger`/`warning` não fecham sozinhos; demais: máx(5 s, ~1 s a cada 10 palavras), pausa em hover e foco. Esc fecha o toast focado. Ao fechar um toast com foco, devolver o foco a quem o disparou. `danger` anunciado como `alert`; demais `polite`. Toast nunca é o único canal de informação. |
| Alert fechável     | Ao remover, mover o foco para um elemento lógico seguinte.                                                                                                                                                                                                                                                                                                                                                       |
| Spinner / Skeleton | Região `role="status"` montada vazia desde o início e preenchida ao entrar em loading (live region que nasce preenchida não é anunciada). Skeleton com `aria-hidden`; contêiner com `aria-busy="true"`.                                                                                                                                                                                                          |

## Limitações conhecidas

- **Tooltip da Sidebar compacta**: quando o trilho compacto rola (telas curtas na faixa 768–1023px), o rótulo flutuante fica deslocado na vertical pelo `scrollTop`. A correção limpa é CSS Anchor Positioning, que ainda não tem suporte no Firefox; reavaliar quando tiver.
- **Toast**: ao abrir/fechar um modal a região é remontada e os temporizadores reiniciam; `role="alert"` do toast danger dentro da região polite pode gerar anúncio duplicado em alguns leitores — validar com leitor real antes de fixar no React.
- **Popover da Sidebar**: com os irmãos em `inert`, a devolução nativa de foco falha; o JS devolve o foco ao botão de menu manualmente.

## Ainda não testado

Leitor de tela real (NVDA/VoiceOver), Firefox e Safari reais, `forced-colors` e `prefers-reduced-motion` em execução (só por leitura de código). Planejar na Fase 5/6.
