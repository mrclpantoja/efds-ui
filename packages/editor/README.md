# @efds-ui/editor

Editor de conteúdo do efDS.ui, edição **Básica**, sobre o [ProseMirror](https://prosemirror.net). Parágrafos, títulos 2 a 4, negrito, itálico, sublinhado, tachado, listas, alinhamento, três fontes, link e tabela simples. A saída é HTML limpo, sem `style=`.

> **Versão 0.1.2.** Licença MIT. A API pode mudar até a 1.0. Documentação: https://efds-ui.com.br. As edições Completa (gratuita) e Pro virão em próximas versões.

O visual vem do `@efds-ui/core` (`.eds-editor` e `.eds-prose`); este pacote só liga o comportamento.

## HTML (PHP, Java, .NET...)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@efds-ui/core@0.1.1/dist/index.css" />
<label class="eds-label" for="descricao">Descrição</label>
<textarea
  class="eds-textarea"
  id="descricao"
  name="descricao"
  rows="8"
  data-eds-editor="basic"
></textarea>
<script src="https://cdn.jsdelivr.net/npm/@efds-ui/editor@0.1.1/dist/eds-editor.js" defer></script>
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

## Código-fonte

[github.com/mrclpantoja/efds-ui](https://github.com/mrclpantoja/efds-ui) (MIT). Problemas e sugestões: [issues](https://github.com/mrclpantoja/efds-ui/issues).

## Quem mantém

Desenvolvido e mantido pela [Innovation Tech](https://innovationtech.com.br/).
