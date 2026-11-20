import { Stepper } from '@eds-ui/react';

export default function Basico() {
  return (
    <Stepper
      aria-label="Etapas do cadastro"
      current={1}
      steps={[
        { label: 'Dados' },
        { label: 'Endereço' },
        { label: 'Pagamento' },
        { label: 'Revisão' },
      ]}
    />
  );
}
