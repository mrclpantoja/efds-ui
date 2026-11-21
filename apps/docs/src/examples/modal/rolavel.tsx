import { useState } from 'react';
import { Button, Modal, Stack } from '@efds-ui/react';

export default function Rolavel() {
  const [open, setOpen] = useState(false);
  const fechar = () => setOpen(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Termos de uso</Button>
      <Modal
        open={open}
        onClose={fechar}
        size="lg"
        title="Termos de uso"
        footer={
          <>
            <Button onClick={fechar}>Recusar</Button>
            <Button variant="primary" onClick={fechar}>
              Aceitar
            </Button>
          </>
        }
      >
        <Stack gap={4}>
          {Array.from({ length: 14 }, (_, i) => (
            <p key={i}>
              {i + 1}. Cláusula fictícia de exemplo. O serviço é prestado conforme descrito neste
              documento, sem valor jurídico, apenas para demonstrar a rolagem do corpo do modal
              enquanto o cabeçalho e o rodapé permanecem visíveis.
            </p>
          ))}
        </Stack>
      </Modal>
    </>
  );
}
