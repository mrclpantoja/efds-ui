import { Tab, TabList, TabPanel, Tabs } from '@efds-ui/react';

export default function Basico() {
  return (
    <Tabs defaultValue="resumo">
      <TabList aria-label="Seções do pedido">
        <Tab value="resumo">Resumo</Tab>
        <Tab value="itens">Itens</Tab>
        <Tab value="historico">Histórico</Tab>
      </TabList>
      <TabPanel value="resumo">
        <p>Pedido 1042 · Cliente Exemplo Ltda · 3 itens.</p>
      </TabPanel>
      <TabPanel value="itens">
        <p>Caderno A5, caneta azul e pasta suspensa.</p>
      </TabPanel>
      <TabPanel value="historico">
        <p>Criado em 10/03, aprovado em 11/03.</p>
      </TabPanel>
    </Tabs>
  );
}
