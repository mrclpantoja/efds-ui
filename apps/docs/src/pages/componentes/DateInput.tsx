import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/date-input/estados';
import estadosHtml from '../../examples/date-input/estados.html?raw';
import estadosSource from '../../examples/date-input/estados.tsx?raw';
import Limites from '../../examples/date-input/limites';
import limitesHtml from '../../examples/date-input/limites.html?raw';
import limitesSource from '../../examples/date-input/limites.tsx?raw';
import Tipos from '../../examples/date-input/tipos';
import tiposHtml from '../../examples/date-input/tipos.html?raw';
import tiposSource from '../../examples/date-input/tipos.tsx?raw';
import { toHref } from '../../router';

export default function DateInputPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de data, hora, data com hora ou mês usando o seletor do próprio navegador. É o{' '}
        <code>&lt;input type=&quot;date&quot;&gt;</code> com a aparência do sistema: sem JavaScript,
        sem componente novo e com o teclado e o calendário que o usuário já conhece.
      </p>

      <UseCases
        use={[
          'Quando o formulário precisa funcionar sem JavaScript (HTML puro, PHP, Java) ou o mais leve possível.',
          'Para datas simples, sem regra de bloqueio: o navegador já valida min, max e datas inexistentes.',
          'Em celulares, onde o seletor nativo costuma ser melhor que qualquer calendário próprio.',
          'Para hora (time), data com hora (datetime-local) e mês (month): o DatePicker não cobre esses tipos.',
        ]}
        avoid={[
          <>
            Quando o formato e o calendário precisam ser{' '}
            <strong>iguais em todos os navegadores</strong> ou em um idioma fixo: o nativo segue o
            idioma do navegador, não o da página. Use o{' '}
            <a href={toHref('/componentes/date-picker')}>DatePicker</a> (sempre dd/mm/aaaa).
          </>,
          <>
            Para bloquear dias específicos (feriados, fins de semana, agenda cheia): o nativo só
            aceita <code>min</code> e <code>max</code>. Use o{' '}
            <a href={toHref('/componentes/date-picker')}>DatePicker</a>.
          </>,
          <>
            Para escolher um período (início e fim): use o{' '}
            <a href={toHref('/componentes/date-range-picker')}>DateRangePicker</a>.
          </>,
        ]}
      />

      <Section title="Exemplos">
        <Alert variant="info" title="Sem JavaScript">
          <p>
            Nada aqui depende do <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a>:
            basta o <code>type</code> certo e a classe <code>eds-input</code>. No React, é o próprio{' '}
            <a href={toHref('/componentes/input')}>Input</a> com <code>type=&quot;date&quot;</code>.
          </p>
        </Alert>
        <Example
          title="Tipos"
          description="date, time, datetime-local e month. O valor enviado e lido é sempre ISO (aaaa-mm-dd, hh:mm, aaaa-mm-ddThh:mm, aaaa-mm), qualquer que seja o formato mostrado ao usuário."
          html={tiposHtml}
          react={{ Component: Tipos, source: tiposSource }}
        />
        <Example
          title="Limites e obrigatório"
          description="min e max (ISO) limitam o seletor e a validação nativa. Digite uma data de 2025 e envie o formulário: o navegador bloqueia e explica. Não há bloqueio de dias soltos."
          html={limitesHtml}
          react={{ Component: Limites, source: limitesSource }}
        />
        <Example
          title="Erro, somente leitura e desabilitado"
          description="Os mesmos estados do Input, por atributo. Em React, o erro vem do Field."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="Limitações do campo nativo">
        <ul className="docs-list">
          <li>
            <strong>Formato e idioma:</strong> o navegador mostra a data no idioma do sistema ou do
            navegador (<code>dd/mm/aaaa</code> em pt-BR, <code>mm/dd/yyyy</code> em en-US), e não há
            como forçar. O valor lido e enviado é sempre ISO.
          </li>
          <li>
            <strong>Calendário:</strong> a aparência e o teclado do calendário aberto são do
            navegador e mudam entre Chrome, Edge, Firefox e Safari; o efDS.ui não os estiliza. Só o
            campo fechado (altura, borda, foco, erro) segue o sistema.
          </li>
          <li>
            <strong>Bloqueios:</strong> apenas <code>min</code> e <code>max</code>; nada de feriados
            ou fins de semana. Valide no servidor de qualquer forma.
          </li>
          <li>
            <strong>Campo vazio:</strong> sem valor, o <code>value</code> é{' '}
            <code>&quot;&quot;</code>. Um campo parcialmente digitado também resulta em vazio, e com{' '}
            <code>required</code> o navegador bloqueia o envio.
          </li>
          <li>
            <strong>Navegadores antigos:</strong> um navegador que não conhece o tipo mostra um
            campo de texto; mantenha a validação no servidor.
          </li>
        </ul>
      </Section>

      <Section title="API React">
        <p>
          Não há componente próprio: use o <a href={toHref('/componentes/input')}>Input</a> com o{' '}
          <code>type</code> desejado. Tudo o que é nativo do <code>&lt;input&gt;</code> vale:{' '}
          <code>min</code>, <code>max</code>, <code>step</code>, <code>required</code>,{' '}
          <code>defaultValue</code> ou <code>value</code> com <code>onChange</code>.
        </p>
        <PropsTable
          caption="Props de Input usadas com datas"
          rows={[
            {
              name: 'type',
              type: "'date' | 'time' | 'datetime-local' | 'month'",
              required: true,
              description: 'Tipo do seletor nativo.',
            },
            {
              name: 'min / max',
              type: 'string',
              description: (
                <>
                  Limites em ISO (<code>2026-01-01</code>, <code>2026-03</code> para month).
                </>
              ),
            },
            {
              name: 'value / defaultValue',
              type: 'string',
              description: (
                <>
                  Valor em ISO. No <code>onChange</code>, <code>event.target.value</code> também é
                  ISO, vazio se incompleto.
                </>
              ),
            },
            {
              name: 'size / invalid / valid',
              type: "'sm' | 'md' | 'lg' / boolean",
              description:
                'Iguais às do Input; dentro de um Field, erro e obrigatório já vêm dele.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos do campo de data nativo"
          rows={[
            {
              name: '.eds-input',
              effect:
                'No input de data, hora, data com hora ou mês: mesma altura, borda e tipografia dos outros campos, com o texto alinhado ao início e o ícone do seletor na cor do tema (claro e escuro).',
            },
            {
              name: '.eds-input-sm / .eds-input-lg',
              effect: 'Tamanhos, iguais ao Input.',
            },
            {
              name: '[aria-invalid="true"] / [data-valid="true"]',
              effect: 'Borda de erro ou de sucesso. Acompanhe com .eds-error ou .eds-success.',
            },
            { name: '[readonly] / :disabled', effect: 'Fundo sutil; desabilitado também esmaece.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Nome:</strong> sempre um <code>label</code> associado (use Field). O formato
            esperado não precisa de texto extra: o navegador o mostra.
          </li>
          <li>
            <strong>Teclado:</strong> é o do navegador. Em geral, ←/→ trocam de parte (dia, mês,
            ano), ↑/↓ alteram o valor da parte e dígitos preenchem direto; Alt+↓ ou o botão de
            calendário abrem o seletor. O foco visível do efDS.ui aparece no campo fechado.
          </li>
          <li>
            <strong>Leitor de tela:</strong> o campo é anunciado como &quot;editor de data&quot; ou
            equivalente, com a parte em foco; é o ponto mais confiável do nativo.
          </li>
          <li>
            <strong>Erro:</strong> <code>aria-invalid</code> mais mensagem em{' '}
            <code>aria-describedby</code>, nunca só a cor da borda.
          </li>
          <li>
            <strong>Alto contraste:</strong> a borda e o texto seguem as cores do sistema; o ícone
            do seletor é do navegador.
          </li>
        </ul>
      </Section>
    </>
  );
}
