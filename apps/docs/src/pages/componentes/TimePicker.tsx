import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/time-picker/basico';
import basicoHtml from '../../examples/time-picker/basico.html?raw';
import basicoSource from '../../examples/time-picker/basico.tsx?raw';
import Erro from '../../examples/time-picker/erro';
import erroHtml from '../../examples/time-picker/erro.html?raw';
import erroSource from '../../examples/time-picker/erro.tsx?raw';
import Nativo from '../../examples/time-picker/nativo';
import nativoHtml from '../../examples/time-picker/nativo.html?raw';
import nativoSource from '../../examples/time-picker/nativo.tsx?raw';

export default function TimePickerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de horário <code>hh:mm</code> com máscara e uma lista de horários (de 15 em 15
        minutos, por exemplo). Sem JS, o campo nativo{' '}
        <code>&lt;input type=&quot;time&quot;&gt;</code> estilizado cumpre o papel.
      </p>

      <UseCases
        use={[
          'Para horários de agendamento e de expediente, com intervalo e faixa permitidos.',
          'Digitando (para quem sabe o horário) ou escolhendo na lista.',
        ]}
        avoid={[
          'Para duração ou tempo decorrido: use NumberInput.',
          'Para data e hora juntas: combine DatePicker e TimePicker.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Com lista de horários"
          description="Seta para baixo abre a lista no próximo horário da grade; Enter escolhe; Esc fecha só a lista. O valor sai em HH:MM no campo hidden."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Nativo, sem JS"
          description="O input time com a aparência do Input. O navegador cuida do seletor e do formato por locale."
          html={nativoHtml}
          react={{ Component: Nativo, source: nativoSource }}
        />
        <Example
          title="Horário fora da faixa"
          description="O erro é visível, ligado ao campo por aria-describedby, e o valor não é enviado."
          html={erroHtml}
          react={{ Component: Erro, source: erroSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="@eds-ui/behavior">
          <p>
            <code>data-eds-timepicker</code> na raiz, com <code>data-eds-time-step</code> (minutos,
            padrão 30), <code>data-eds-min</code> e <code>data-eds-max</code> (<code>HH:MM</code>).
            O JS gera a lista a partir desses atributos e aplica a máscara <code>hh:mm</code> no
            campo (o TimePicker já a traz, também na compilação sem a máscara de entrada; um{' '}
            <code>data-eds-mask=&quot;hora&quot;</code> no campo é dispensado). A hora digitada pode
            ser qualquer minuto; a lista só oferece a grade. Evento: <code>eds:time-change</code> (
            <code>
              detail {'{'} value, minutes {'}'}
            </code>
            ).
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de TimePicker"
          rows={[
            {
              name: 'value / defaultValue',
              type: 'string (HH:MM)',
              description: 'Horário controlado ou inicial.',
            },
            {
              name: 'onChange',
              type: '(value: string) => void',
              description: 'HH:MM com horário completo e permitido, senão vazio.',
            },
            {
              name: 'step',
              type: 'number',
              default: '30',
              description: 'Minutos entre os horários da lista (1 a 720).',
            },
            {
              name: 'min / max',
              type: 'string (HH:MM)',
              description: 'Faixa permitida (lista e validação).',
            },
            {
              name: 'name',
              type: 'string',
              description: 'Gera o hidden com HH:MM para o formulário.',
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho do campo.',
            },
            {
              name: 'invalid / valid',
              type: 'boolean',
              description: 'Estado; dentro de Field já é automático.',
            },
            {
              name: 'texts',
              type: '{ toggle, toggleWithValue, list, invalid, outOfRange, selected }',
              description: 'Textos (pt-BR por padrão).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do TimePicker"
          rows={[
            { name: '.eds-timepicker', effect: 'A raiz (campo + botão).' },
            { name: '.eds-timepicker-input / -toggle', effect: 'O campo e o botão do relógio.' },
            {
              name: '.eds-timepicker-popup[popover=manual]',
              effect: 'A lista; --_timepicker-x/-y/-width a posicionam.',
            },
            {
              name: '.eds-timepicker-listbox / -option',
              effect:
                'role=listbox e as opções; aria-selected = destaque, data-current = escolhida.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Padrão APG:</strong> combobox com listbox; o foco fica no campo, com{' '}
            <code>aria-activedescendant</code>. O botão sai da sequência de Tab (
            <code>tabindex=-1</code>
            ): o teclado usa o campo.
          </li>
          <li>
            <strong>Teclado:</strong> setas abrem e movem, PageUp/PageDown pulam 8, Enter escolhe,
            Esc fecha a lista, Tab sai.
          </li>
          <li>
            <strong>Nome do botão:</strong> “Escolher horário. Atual: 14:30”.
          </li>
          <li>
            <strong>Erro:</strong> aparece ao sair do campo, é anunciado e fica ligado ao campo.
          </li>
        </ul>
      </Section>
    </>
  );
}
