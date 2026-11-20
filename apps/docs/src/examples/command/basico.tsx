import { useState } from 'react';
import { Button, CommandPalette, type CommandPaletteItem } from '@eds-ui/react';
import { PlusIcon, SearchIcon, UsersIcon } from '@eds-ui/icons';

const itens: CommandPaletteItem[] = [
  {
    value: 'pedidos',
    label: 'Pedidos',
    description: 'Listagem e filtros',
    group: 'Páginas',
    shortcut: 'G P',
    icon: <SearchIcon />,
    keywords: 'vendas compras',
  },
  {
    value: 'clientes',
    label: 'Clientes',
    description: 'Cadastro de clientes',
    group: 'Páginas',
    icon: <UsersIcon />,
  },
  {
    value: 'novo-pedido',
    label: 'Novo pedido',
    group: 'Ações',
    shortcut: 'N',
    icon: <PlusIcon />,
    keywords: 'criar adicionar',
  },
  {
    value: 'tema',
    label: 'Alternar tema',
    description: 'Indisponível',
    group: 'Ações',
    disabled: true,
  },
];

export default function Basico() {
  const [aberta, setAberta] = useState(false);
  const [escolhido, setEscolhido] = useState('nenhum');
  return (
    <>
      <Button onClick={() => setAberta(true)}>
        Buscar <kbd className="eds-command-shortcut">Ctrl K</kbd>
      </Button>
      <p className="eds-text-small">Último item escolhido: {escolhido}</p>
      <CommandPalette
        items={itens}
        open={aberta}
        onOpenChange={setAberta}
        recent={5}
        onSelect={(item) => setEscolhido(item.label)}
        footer={
          <>
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> navegar
            </span>
            <span>
              <kbd>Enter</kbd> abrir
            </span>
            <span>
              <kbd>Esc</kbd> fechar
            </span>
          </>
        }
      />
    </>
  );
}
