import { Accordion, AccordionItem } from '@eds-ui/react';

export default function Basico() {
  return (
    <Accordion>
      <AccordionItem title="Como altero meus dados cadastrais?" defaultOpen>
        <p>
          Abra o menu do perfil, escolha Meus dados e edite os campos. As mudanças valem após
          salvar.
        </p>
      </AccordionItem>
      <AccordionItem title="Posso exportar a lista de pedidos?">
        <p>Sim. Na tabela de pedidos, use Exportar e escolha CSV, Excel ou PDF.</p>
      </AccordionItem>
      <AccordionItem title="Onde vejo o histórico de acessos?">
        <p>Em Segurança, na aba Atividade recente. Os registros ficam disponíveis por 90 dias.</p>
      </AccordionItem>
      <AccordionItem title="Relatório avançado (indisponível)" disabled>
        <p>Disponível em um plano futuro.</p>
      </AccordionItem>
    </Accordion>
  );
}
