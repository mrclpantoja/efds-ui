import { Checkbox, Field, Fieldset, Input, Stepper, useSectionProgress } from '@efds-ui/react';

const secoes = [
  { id: 'indr-dados', label: 'Dados' },
  { id: 'indr-valores', label: 'Valores' },
  { id: 'indr-revisao', label: 'Revisão' },
];

export default function Indicador() {
  // current = seção lida; states = done/current/upcoming (concluída: nenhum campo inválido e
  // algum obrigatório ou preenchido).
  const { current, states } = useSectionProgress(secoes);
  return (
    <>
      <Stepper
        aria-label="Seções do lançamento"
        current={current}
        steps={secoes.map((s, i) => ({ label: s.label, href: `#${s.id}`, state: states[i] }))}
      />
      <form className="eds-stack eds-gap-6" noValidate>
        <Fieldset id="indr-dados" legend="Dados">
          <Field label="Fornecedor" required>
            <Input autoComplete="off" />
          </Field>
        </Fieldset>
        <Fieldset id="indr-valores" legend="Valores">
          <Field label="Valor" required>
            <Input inputMode="decimal" autoComplete="off" />
          </Field>
        </Fieldset>
        <Fieldset id="indr-revisao" legend="Revisão">
          <Checkbox required>Conferi os dados</Checkbox>
        </Fieldset>
      </form>
    </>
  );
}
