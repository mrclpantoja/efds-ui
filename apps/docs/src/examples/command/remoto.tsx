import { useState } from 'react';
import { Button, CommandPalette, type CommandPaletteItem } from '@efds-ui/react';

/** Base fictícia. Em produção, `carregar` seria um fetch ao seu servidor. */
const base: CommandPaletteItem[] = [
  { value: 'p1', label: 'Pedido PED-0001', group: 'Pedidos' },
  { value: 'p2', label: 'Pedido PED-0002', group: 'Pedidos' },
  { value: 'c1', label: 'Cliente Atelier Exemplo', group: 'Clientes' },
  { value: 'c2', label: 'Cliente Comércio Modelo', group: 'Clientes' },
];

function carregar(texto: string, signal: AbortSignal): Promise<CommandPaletteItem[]> {
  const termo = texto.toLowerCase();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(base.filter((i) => i.label.toLowerCase().includes(termo))),
      500,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('cancelado', 'AbortError'));
    });
  });
}

export default function Remoto() {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Button onClick={() => setAberta(true)}>Busca global</Button>
      <CommandPalette
        loadItems={carregar}
        minChars={2}
        shortcut={false}
        open={aberta}
        onOpenChange={setAberta}
        texts={{ title: 'Busca global', search: 'Buscar em todo o sistema' }}
      />
    </>
  );
}
