## O que muda

<!-- Resumo em poucas frases e o motivo. Link da issue, se houver: Fecha #123 -->

## Tipo

- [ ] Correção
- [ ] Funcionalidade ou componente novo
- [ ] Documentação
- [ ] Infraestrutura (build, CI, tooling)
- [ ] Muda a API pública (classe, token, `data-eds-*`, evento `eds:*`, prop ou `texts`)

## Verificação

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm build`, `pnpm typecheck` e `pnpm test` passam
- [ ] `pnpm docs:check` passa (sem `style=` nem cor literal na documentação)
- [ ] Mudança de comportamento tem teste

## Regras do projeto

- [ ] O core continua CSS puro, só com tokens semânticos; o React não ganhou aparência própria
- [ ] Acessibilidade WCAG 2.2 AA: teclado, foco visível, cor nunca sozinha
- [ ] Exemplos e testes usam só dados fictícios
- [ ] Mensagens de commit em português
- [ ] `CHANGELOG.md` atualizado, com guia de migração se quebra a API

## Como testar

<!-- Passos, páginas da documentação ou do playground, navegadores e leitor de tela usados -->
