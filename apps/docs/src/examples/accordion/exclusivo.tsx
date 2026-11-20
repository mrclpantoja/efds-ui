import { Accordion, AccordionItem } from '@eds-ui/react';

export default function Exclusivo() {
  return (
    <Accordion exclusive flush>
      <AccordionItem title="Prazos de entrega" defaultOpen>
        <p>Pedidos aprovados até as 14h saem no mesmo dia útil.</p>
      </AccordionItem>
      <AccordionItem title="Trocas e devoluções">
        <p>Aceitamos devoluções em até 7 dias corridos, com a embalagem original.</p>
      </AccordionItem>
      <AccordionItem title="Formas de pagamento">
        <p>Cartão, boleto e transferência. O boleto vence em 3 dias úteis.</p>
      </AccordionItem>
    </Accordion>
  );
}
