import { useState, type FormEvent } from 'react';
import { Button, Sortable, Stack, useToast, type SortableItemData } from '@efds-ui/react';

export default function Formulario() {
  const toast = useToast();
  const [itens, setItens] = useState<SortableItemData[]>([
    { id: 'c1', label: 'Contrato' },
    { id: 'c2', label: 'Proposta' },
    { id: 'c3', label: 'Reunião' },
    { id: 'c4', label: 'Relatório' },
  ]);

  const enviar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // simula o servidor deste exemplo
    const ordem = new FormData(event.currentTarget).getAll('prioridade[]');
    toast.show({ message: `Ordem enviada: ${ordem.join(', ')}` });
  };

  return (
    <form onSubmit={enviar}>
      <Stack gap={4}>
        <Sortable
          label="Prioridades"
          name="prioridade[]"
          items={itens}
          onChange={setItens}
          renderItem={(item, { handle }) => (
            <>
              {handle}
              <span>{item.label}</span>
            </>
          )}
        />
        <div>
          <Button type="submit" variant="primary">
            Salvar ordem
          </Button>
        </div>
      </Stack>
    </form>
  );
}
