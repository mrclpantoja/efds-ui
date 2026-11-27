import { useState } from 'react';
import { IconDisc, OptionCard, OptionCardGroup } from '@efds-ui/react';

const visto = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const seta = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export default function Basico() {
  const [tipo, setTipo] = useState('pagar');
  return (
    <div className="eds-stack eds-gap-6">
      <OptionCardGroup
        legend="Tipo de lançamento"
        name="op-tipo-r"
        value={tipo}
        onValueChange={setTipo}
      >
        <OptionCard
          type="radio"
          value="pagar"
          title="A pagar"
          description="Despesas, fornecedores e contas."
          icon={<IconDisc tone="warning">{seta('M12 19V5M6 11l6-6 6 6')}</IconDisc>}
          mark={visto}
        />
        <OptionCard
          type="radio"
          value="receber"
          title="A receber"
          description="Vendas, clientes e recebimentos."
          icon={<IconDisc tone="success">{seta('M12 5v14M6 13l6 6 6-6')}</IconDisc>}
          mark={visto}
        />
        <OptionCard
          type="radio"
          value="transferencia"
          title="Transferência"
          description="Indisponível neste perfil."
          mark={visto}
          disabled
        />
      </OptionCardGroup>

      <OptionCardGroup legend="Canais de aviso" error="Escolha ao menos um canal.">
        <OptionCard type="checkbox" name="op-canal-r" value="email" title="E-mail" />
        <OptionCard
          type="checkbox"
          name="op-canal-r"
          value="sms"
          title="Mensagem de texto"
          description="Só para avisos urgentes."
        />
        <OptionCard type="checkbox" name="op-canal-r" value="app" title="Aplicativo" />
      </OptionCardGroup>
    </div>
  );
}
