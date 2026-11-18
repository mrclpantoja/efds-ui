# @eds-ui/docs

Site de documentação do eDS.ui (pt-BR), construído com o próprio `@eds-ui/react`.

- `pnpm --filter @eds-ui/docs dev` sobe o site.
- `pnpm --filter @eds-ui/docs build` gera `dist/`.
- `pnpm --filter @eds-ui/docs check:visual` garante zero `style=` e zero cor literal no CSS do site.

Como adicionar uma página: veja o comentário no topo de `src/routes.tsx`.
