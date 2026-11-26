# Como contribuir com o efDS.ui

Obrigado por querer ajudar. Este guia diz como preparar o ambiente, o que verificar antes de abrir um pull request e quais regras o projeto não negocia.

Para dúvidas, defeitos e propostas, use as [issues](https://github.com/mrclpantoja/efds-ui/issues). Falhas de segurança **não** vão para issue pública: veja [SECURITY.md](SECURITY.md).

## Ambiente

Requer Node 20 ou mais recente e pnpm (a versão está fixada em `packageManager` no `package.json`).

```sh
pnpm install
pnpm dev         # playground
pnpm docs:dev    # site de documentação
```

Estrutura do repositório e dependências entre pacotes: [README.md](README.md).

## Antes de abrir o pull request

Rode, na raiz, e confirme que tudo passa:

```sh
pnpm tokens:check
pnpm format:check   # pnpm format corrige
pnpm lint
pnpm build          # o typecheck dos apps resolve os pacotes pelo dist/
pnpm typecheck
pnpm test
pnpm docs:check     # proíbe style= e cor literal na documentação
pnpm pack:check     # valida os tarballs (no Windows, use o PowerShell)
```

O CI roda a mesma sequência. Mudança de comportamento leva teste. Componente novo leva exemplo HTML, wrapper React, testes e página na documentação.

## Regras do projeto

1. **`@efds-ui/core` é CSS e HTML puros.** Sem JavaScript, sem dependência de runtime, sem conhecer o React.
2. **Nenhum componente React tem aparência própria.** Só aplica as classes `.eds-*` do core e atributos HTML/ARIA.
3. **Só tokens semânticos.** Componentes usam `--eds-*` semânticos; nenhum valor literal de cor, espaçamento, raio ou altura. Os tokens vêm do JSON (`pnpm tokens`): não edite os CSS gerados.
4. **Tema, modo, densidade e forma mudam tokens**, nunca componentes, por atributos (`data-theme`, `data-mode`, `data-density`, `data-shape`).
5. **API pequena e semântica** (`variant`, `size`). Não exponha aparência por prop.
6. **Acessibilidade WCAG 2.2 AA:** HTML semântico antes de ARIA, teclado completo, foco visível, e a cor nunca sozinha para informar.
7. **Plataforma primeiro:** `<dialog>`, Popover API e inputs nativos antes de JavaScript.
8. **Poucas dependências.** Não adicione dependência de runtime sem discutir antes numa issue.
9. **Dados fictícios.** Exemplos, testes e capturas nunca usam dados reais de pessoas (CPF, nomes, endereços), por causa da LGPD.
10. **Prefixos:** tokens `--eds-*`, classes `.eds-*`, atributos `data-eds-*`, eventos `eds:<componente>-<ação>`.

## Commits e pull requests

- Mensagens de commit **em português**, no estilo `tipo(escopo): resumo no presente`, como no histórico (`feat(core): ...`, `fix(react): ...`, `docs: ...`).
- Um assunto por pull request. Descreva o que mudou, por que, e como testou.
- Se mudar a API pública (classe, token, atributo `data-eds-*`, evento, prop), registre no `CHANGELOG.md`. O que conta como quebra está em [Políticas](https://efds-ui.com.br/comecar/politicas).
- Textos em português do Brasil, frases curtas.

## Licença

Ao contribuir, você concorda que sua contribuição fica sob a [licença MIT](LICENSE) do projeto. O texto da documentação está sob CC BY 4.0.
