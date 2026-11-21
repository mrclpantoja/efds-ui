import { Stack } from '@efds-ui/react';

export default function Escala() {
  return (
    <Stack gap={3}>
      <p className="eds-text-display">Display</p>
      <p className="eds-text-h1">Título 1</p>
      <p className="eds-text-h2">Título 2</p>
      <p className="eds-text-h3">Título 3</p>
      <p className="eds-text-h4">Título 4</p>
      <p className="eds-text-body-lg">Corpo grande: introdução de uma página.</p>
      <p className="eds-text-body">Corpo: texto corrido da interface.</p>
      <p className="eds-text-label">Rótulo de campo</p>
      <p className="eds-text-small">Texto pequeno: apoio e notas.</p>
    </Stack>
  );
}
