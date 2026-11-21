import { useState } from 'react';
import { Stepper } from '@efds-ui/react';

export default function Vertical() {
  const [current, setCurrent] = useState(2);
  return (
    <Stepper
      aria-label="Andamento da solicitação"
      vertical
      current={current}
      onStepClick={setCurrent}
      steps={[
        { label: 'Solicitação enviada' },
        { label: 'Documentos', state: 'error' },
        { label: 'Análise' },
        { label: 'Conclusão' },
      ]}
    />
  );
}
