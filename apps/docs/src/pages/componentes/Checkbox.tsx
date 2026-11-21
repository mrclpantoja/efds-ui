import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/checkbox/estados';
import estadosHtml from '../../examples/checkbox/estados.html?raw';
import estadosSource from '../../examples/checkbox/estados.tsx?raw';
import Indeterminado from '../../examples/checkbox/indeterminado';
import indeterminadoSource from '../../examples/checkbox/indeterminado.tsx?raw';

/** Precisa de JS (propriedade DOM), então não é exemplo vivo em HTML. */
const indeterminadoHtml = `<label class="eds-check">
  <input type="checkbox" class="eds-checkbox" id="todos" />
  Todos
</label>

<script>
  // indeterminate é uma propriedade do DOM: não existe como atributo HTML.
  document.getElementById('todos').indeterminate = true;
</script>`;

const semTexto = `<input type="checkbox" class="eds-checkbox" aria-label="Selecionar pedido 1042" />`;

export default function CheckboxPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Caixa de seleção para ligar ou desligar uma opção independente, ou para escolher várias
        opções de uma lista. É o <code>&lt;input type=&quot;checkbox&quot;&gt;</code> nativo, dentro
        de um rótulo clicável.
      </p>

      <UseCases
        use={[
          'Para escolher zero, uma ou várias opções de uma lista (canais de aviso).',
          'Para um aceite isolado (termos) ou para selecionar linhas de uma tabela.',
          'Com o estado misto, quando um item marca ou desmarca um grupo de filhos.',
        ]}
        avoid={[
          <>
            Para uma opção que vale na hora, como ligar um recurso: use{' '}
            <a href="#/componentes/switch">Switch</a>.
          </>,
          <>
            Para escolher exatamente uma opção: use <a href="#/componentes/radio">Radio</a>.
          </>,
          'Para disparar uma ação: use Button.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Estados"
          description="Marcado, desmarcado, desabilitado e com erro. Para grupos, use um Fieldset."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
        <Example
          title="Estado misto"
          description="O item pai reflete os filhos: parcial quando só alguns estão marcados."
          react={{ Component: Indeterminado, source: indeterminadoSource }}
        />
        <p>
          Em HTML, o estado misto é uma propriedade do DOM e exige JavaScript, por isso aparece como
          código estático:
        </p>
        <CodeBlock code={indeterminadoHtml} label="Estado misto em HTML" />
        <h3 className="eds-text-h3">Sem texto visível</h3>
        <p>
          Em células de tabela (&quot;Selecionar todos&quot;), o React renderiza só o{' '}
          <code>input</code>, sem <code>label</code>, e exige um nome acessível.
        </p>
        <CodeBlock code={semTexto} label="Checkbox sem texto, em HTML" />
      </Section>

      <Section title="API React">
        <p>
          <code>Checkbox</code> aceita os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code> e <code>size</code>). <code>ref</code>, <code>className</code> e as
          demais props vão para o <code>input</code>, que o componente envolve em{' '}
          <code>&lt;label class=&quot;eds-check&quot;&gt;</code>.
        </p>
        <PropsTable
          caption="Props de Checkbox"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              description: (
                <>
                  Texto do rótulo. Sem <code>children</code>, o tipo exige <code>aria-label</code>{' '}
                  ou <code>aria-labelledby</code> e nenhum <code>label</code> é renderizado.
                </>
              ),
            },
            {
              name: 'indeterminate',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Estado misto (propriedade DOM aplicada por ref). O clique do usuário o desfaz no
                  DOM: no <code>onChange</code>, atualize seu estado.
                </>
              ),
            },
            {
              name: 'invalid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code>. Dentro de um Fieldset com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
            {
              name: 'checked / defaultChecked',
              type: 'boolean',
              description: 'Controlado ou não controlado, como no input nativo.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Checkbox"
          rows={[
            {
              name: '.eds-check',
              effect: 'Rótulo clicável: alinha a caixa ao texto e garante alvo mínimo de 24px.',
            },
            {
              name: '.eds-checkbox',
              effect: 'A caixa: 1,125rem, borda forte, raio pequeno, marca desenhada em CSS.',
            },
            { name: '.eds-checkbox-sm / -lg', effect: 'Caixa menor e maior.' },
            { name: ':checked', effect: 'Fundo na cor de ação e marca de seleção.' },
            { name: ':indeterminate', effect: 'Fundo na cor de ação e traço horizontal.' },
            { name: '[aria-invalid="true"]', effect: 'Borda de perigo (e fundo, se marcado).' },
            { name: ':disabled', effect: 'Opacidade reduzida; o rótulo fica esmaecido.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Teclado:</strong> Tab foca; Espaço marca e desmarca (nativo).
            </li>
            <li>
              <strong>Nome:</strong> o rótulo envolve o input, então clicar no texto também marca.
              Checkbox sem texto exige <code>aria-label</code> ou <code>aria-labelledby</code> no
              tipo.
            </li>
            <li>
              <strong>Grupos:</strong> várias opções relacionadas vão em um Fieldset, cuja legenda
              dá o contexto.
            </li>
            <li>
              <strong>Estado misto:</strong> é anunciado como &quot;parcialmente marcado&quot;;
              garanta que o pai e os filhos permaneçam coerentes. Em tabela, o nome do pai é
              &quot;Selecionar todos desta página&quot; e o de cada linha, &quot;Selecionar{' '}
              {'{identificador}'}&quot;.
            </li>
            <li>
              <strong>Erro:</strong> <code>aria-invalid</code> e mensagem ligada por{' '}
              <code>aria-describedby</code>; a mensagem tem ícone e texto.
            </li>
            <li>
              <strong>Alto contraste:</strong> a caixa usa cores do sistema em{' '}
              <code>forced-colors</code>.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
