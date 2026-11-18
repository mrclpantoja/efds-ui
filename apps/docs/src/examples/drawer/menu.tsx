import { useState } from 'react';
import { Button, Drawer } from '@eds-ui/react';

export default function Menu() {
  const [open, setOpen] = useState(false);
  const fechar = () => setOpen(false);
  return (
    <>
      <Button variant="tertiary" onClick={() => setOpen(true)}>
        Menu
      </Button>
      <Drawer open={open} onClose={fechar} placement="start" title="Menu">
        <ul>
          <li>
            <a href="#/componentes/drawer" onClick={fechar}>
              Início
            </a>
          </li>
          <li>
            <a href="#/componentes/drawer" onClick={fechar}>
              Projetos
            </a>
          </li>
          <li>
            <a href="#/componentes/drawer" onClick={fechar}>
              Relatórios
            </a>
          </li>
        </ul>
      </Drawer>
    </>
  );
}
