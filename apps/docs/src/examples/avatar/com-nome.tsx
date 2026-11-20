import { Avatar, Stack } from '@eds-ui/react';

const pessoas = [
  { nome: 'Ana Exemplo', cargo: 'Analista de projetos' },
  { nome: 'Bruno Teste', cargo: 'Coordenação' },
  { nome: 'Carla Modelo', cargo: 'Gerência' },
];

export default function ComNome() {
  return (
    <Stack as="ul" gap={3}>
      {pessoas.map((p) => (
        <Stack as="li" key={p.nome} direction="row" align="center" gap={3}>
          <Avatar name={p.nome} decorative />
          <Stack>
            <strong>{p.nome}</strong>
            <span className="eds-text-small">{p.cargo}</span>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
