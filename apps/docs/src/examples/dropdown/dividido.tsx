import { ChevronDownIcon } from '@eds-ui/icons';
import { Button, ButtonGroup, Dropdown, DropdownItem } from '@eds-ui/react';

export default function Dividido() {
  return (
    <ButtonGroup aria-label="Salvar com opções">
      <Button variant="primary">Salvar</Button>
      <Dropdown
        trigger={
          <Button variant="primary" iconOnly aria-label="Mais opções de salvar">
            <ChevronDownIcon />
          </Button>
        }
      >
        <DropdownItem>Salvar como rascunho</DropdownItem>
        <DropdownItem>Salvar e criar outro</DropdownItem>
      </Dropdown>
    </ButtonGroup>
  );
}
