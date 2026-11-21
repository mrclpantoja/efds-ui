import { Tab, TabList, TabPanel, Tabs } from '@efds-ui/react';

export default function Indisponivel() {
  return (
    <Tabs defaultValue="dados">
      <TabList aria-label="Seções do cadastro">
        <Tab value="dados">Dados</Tab>
        <Tab value="contatos">Contatos</Tab>
        {/* Indisponível: alcançável pelas setas, mas não ativa. */}
        <Tab value="anexos" disabled>
          Anexos
        </Tab>
      </TabList>
      <TabPanel value="dados">
        <p>Razão social e endereço do cliente fictício.</p>
      </TabPanel>
      <TabPanel value="contatos">
        <p>Contato principal: Ana Exemplo.</p>
      </TabPanel>
      <TabPanel value="anexos">
        <p>Sem anexos.</p>
      </TabPanel>
    </Tabs>
  );
}
