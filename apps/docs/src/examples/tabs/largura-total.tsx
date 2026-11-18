import { Tab, TabList, TabPanel, Tabs } from '@eds-ui/react';

export default function LarguraTotal() {
  return (
    <Tabs defaultValue="a" fill>
      <TabList aria-label="Visões da lista">
        <Tab value="a">Todos</Tab>
        <Tab value="b">Ativos</Tab>
        <Tab value="c">Arquivados</Tab>
      </TabList>
      <TabPanel value="a">
        <p>Todos os registros.</p>
      </TabPanel>
      <TabPanel value="b">
        <p>Somente os ativos.</p>
      </TabPanel>
      <TabPanel value="c">
        <p>Somente os arquivados.</p>
      </TabPanel>
    </Tabs>
  );
}
