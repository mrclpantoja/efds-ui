import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from '@efds-ui/react';

export default function Controlado() {
  const [value, setValue] = useState('mensal');
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList aria-label="Período do relatório">
        <Tab value="mensal">Mensal</Tab>
        <Tab value="trimestral">Trimestral</Tab>
        <Tab value="anual">Anual</Tab>
      </TabList>
      <TabPanel value="mensal">
        <p>Relatório mensal selecionado.</p>
      </TabPanel>
      <TabPanel value="trimestral">
        <p>Relatório trimestral selecionado.</p>
      </TabPanel>
      <TabPanel value="anual">
        <p>Relatório anual selecionado.</p>
      </TabPanel>
      <p>Aba ativa: {value}</p>
    </Tabs>
  );
}
