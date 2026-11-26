# @efds-ui/editor

Editor de conteúdo do efDS.ui, edição **Básica**, sobre o [ProseMirror](https://prosemirror.net). Parágrafos, títulos 2 a 4, negrito, itálico, sublinhado, tachado, listas, alinhamento, três fontes, link e tabela simples. A saída é HTML limpo, sem `style=`.

> **Versão 0.1.2.** Licença MIT. Documentação: https://efds-ui.com.br. **Componente experimental:** a API pode mudar numa versão menor (veja as [Políticas](https://efds-ui.com.br/comecar/politicas)). As edições Completa (gratuita) e Pro são planejadas para versões futuras.

## Como se encaixa no conjunto

| Pacote                                                                 | O que traz                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`@efds-ui/core`](https://www.npmjs.com/package/@efds-ui/core)         | CSS: tokens, base, layout e componentes                              |
| [`@efds-ui/themes`](https://www.npmjs.com/package/@efds-ui/themes)     | Temas, modo, densidade e forma por atributos `data-*`                |
| [`@efds-ui/behavior`](https://www.npmjs.com/package/@efds-ui/behavior) | JavaScript puro para HTML: modal, abas, toast, tabela, datas, upload |
| [`@efds-ui/react`](https://www.npmjs.com/package/@efds-ui/react)       | Componentes React sobre as classes do core                           |
| [`@efds-ui/icons`](https://www.npmjs.com/package/@efds-ui/icons)       | Ícones SVG para React                                                |
| **`@efds-ui/editor`** (este)                                           | Editor de conteúdo (HTML e React)                                    |

O visual vem do `@efds-ui/core` (`.eds-editor` e `.eds-prose`); este pacote só liga o comportamento. Não depende do `@efds-ui/behavior` nem do `@efds-ui/react`. O React é peer opcional, só para `@efds-ui/editor/react`.

## Acessibilidade e testes

Barra de ferramentas no padrão APG Toolbar (Alt+F10 leva à barra, Esc volta ao texto), comandos sem efeito com `aria-disabled`, modo somente leitura com conteúdo focável, campo `required` que bloqueia o envio vazio com erro visível. Há testes automatizados (Vitest e jsdom). A validação em navegadores reais cobriu só o Chromium; Firefox, Safari e leitor de tela ainda estão pendentes, e por isso o selo experimental.

## HTML (PHP, Java, .NET...)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.2/dist/index.css" />
<label class="eds-label" for="descricao">Descrição</label>
<textarea
  class="eds-textarea"
  id="descricao"
  name="descricao"
  rows="8"
  data-eds-editor="basic"
></textarea>
<script src="https://cdn.jsdelivr.net/npm/@efds-ui/editor@0.1.2/dist/eds-editor.js" defer></script>
```

O script liga os `textarea[data-eds-editor]` (e os que entrarem depois) e mescla a API em `window.EDS.editor`, sem apagar o `window.EDS` do `@efds-ui/behavior`, em qualquer ordem. `data-eds-manual` na tag desliga a ligação automática.

O textarea fica `hidden`, recebe o HTML a cada mudança (150 ms) e no envio do formulário; `reset` restaura o original. Eventos no textarea: `eds:editor-ready`, `eds:editor-change` (`{ html }`), `eds:editor-focus`, `eds:editor-blur`.

## React

```sh
npm install @efds-ui/editor @efds-ui/core
```

```tsx
import { Editor } from '@efds-ui/editor/react';

<Editor label="Descrição" name="descricao" value={html} onChange={setHtml} rows={8} />;
```

## Segurança

**Sanitize o HTML no servidor antes de gravar e de exibir.** A limpeza do navegador (`sanitizeHtml`) não é fronteira de confiança.

## Documentação

- [Editor de conteúdo](https://efds-ui.com.br/componentes/editor)
- [Políticas](https://efds-ui.com.br/comecar/politicas)

## Código-fonte e contribuição

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues). Guia: [CONTRIBUTING.md](https://github.com/mrclpantoja/efds-ui/blob/main/CONTRIBUTING.md). Falhas de segurança: [SECURITY.md](https://github.com/mrclpantoja/efds-ui/blob/main/SECURITY.md).

## Licença

MIT. Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).
