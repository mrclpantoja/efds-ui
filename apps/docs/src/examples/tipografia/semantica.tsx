import { Stack } from '@eds-ui/react';

export default function Semantica() {
  return (
    <Stack as="section" gap={2} aria-labelledby="titulo-clientes">
      <h2 id="titulo-clientes" className="eds-text-h2">
        Clientes
      </h2>
      <h3 className="eds-text-h4">Cadastros recentes</h3>
      <p className="eds-text-body">
        O nível do título (h2, h3) segue a estrutura da página; a aparência vem da classe.
      </p>
    </Stack>
  );
}
