# @efds-ui/docs

Site de documentação do efDS.ui (pt-BR), construído com o próprio `@efds-ui/react`.

- `pnpm --filter @efds-ui/docs dev` sobe o site.
- `pnpm --filter @efds-ui/docs build` gera `dist/`.
- `pnpm --filter @efds-ui/docs check:visual` garante zero `style=` e zero cor literal no CSS do site.

Como adicionar uma página: veja o comentário no topo de `src/routes.tsx`.
