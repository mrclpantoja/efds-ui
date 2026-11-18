import { useRef, useState } from 'react';
import { Button, Modal } from '@eds-ui/react';

export default function Confirmacao() {
  const [open, setOpen] = useState(false);
  const cancelar = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir projeto
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Excluir projeto?"
        initialFocus={cancelar}
        footer={
          <>
            <Button ref={cancelar} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Excluir
            </Button>
          </>
        }
      >
        O projeto Aurora e suas 12 tarefas serão removidos. Esta ação não pode ser desfeita.
      </Modal>
    </>
  );
}
