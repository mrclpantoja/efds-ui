import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/input/estados';
import estadosHtml from '../../examples/input/estados.html?raw';
import estadosSource from '../../examples/input/estados.tsx?raw';
import Tamanhos from '../../examples/input/tamanhos';
import tamanhosHtml from '../../examples/input/tamanhos.html?raw';
import tamanhosSource from '../../examples/input/tamanhos.tsx?raw';

export default function InputPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de uma linha para texto, e-mail, número, telefone e outros tipos nativos. É o{' '}
        <code>&lt;input&gt;</code> do navegador com a aparência do sistema; use sempre dentro de um
        Field.
      </p>

      <UseCases
        use={[
          'Para entradas curtas e livres: nome, e-mail, código, valor.',
          <>
            Com o <code>type</code> e o <code>inputmode</code> certos, para o teclado do celular
            ajudar.
          </>,
        ]}
        avoid={[
          <>
            Para texto longo ou de várias linhas: use <a href="#/componentes/textarea">Textarea</a>.
          </>,
          <>
            Para escolher entre opções conhecidas: use <a href="#/componentes/select">Select</a>,
            Radio ou Checkbox.
          </>,
          'Sem rótulo: o placeholder não substitui o label.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Tamanhos"
          description="sm, md (padrão, sem classe) e lg. A altura vem dos tokens de controle."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Erro, sucesso, somente leitura e desabilitado"
          description="Cada estado é um atributo nativo ou ARIA, nunca uma classe."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Input</code> aceita todos os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>size</code> numérico, que vira o tamanho visual), repassa <code>ref</code> e mescla{' '}
          <code>className</code>. Dentro de um Field, <code>id</code>, <code>aria-describedby</code>
          , <code>aria-invalid</code> e <code>required</code> vêm dele.
        </p>
        <PropsTable
          caption="Props de Input"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'invalid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code>. Dentro de um Field com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
            {
              name: 'valid',
              type: 'boolean',
              description: (
                <>
                  <code>data-valid=&quot;true&quot;</code> (borda de sucesso). Ignorada se houver
                  erro.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Input"
          rows={[
            {
              name: '.eds-input',
              effect: 'Base: largura total, altura de controle, borda forte, raio e tipografia.',
            },
            {
              name: '.eds-input-sm / .eds-input-lg',
              effect: 'Menor ou maior que o padrão (md não tem classe).',
            },
            {
              name: ':focus',
              effect: 'Borda na cor de ação e anel de foco, também no clique.',
            },
            {
              name: '[aria-invalid="true"]',
              effect: 'Borda de perigo. Acompanhe com uma mensagem .eds-error.',
            },
            {
              name: '[data-valid="true"]',
              effect: 'Borda de sucesso. Acompanhe com uma mensagem .eds-success.',
            },
            { name: '[readonly]', effect: 'Fundo sutil; o valor ainda é enviado e focável.' },
            {
              name: ':disabled',
              effect: 'Fundo sutil, texto esmaecido, sem hover; não é focável nem enviado.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Nome:</strong> sempre um <code>label</code> associado (use Field). O
              placeholder não conta como rótulo e tem contraste menor.
            </li>
            <li>
              <strong>Teclado:</strong> Tab foca, e todo o comportamento é nativo do{' '}
              <code>input</code>.
            </li>
            <li>
              <strong>Erro:</strong> <code>aria-invalid</code> mais mensagem ligada por{' '}
              <code>aria-describedby</code>; o erro nunca é só a cor da borda.
            </li>
            <li>
              <strong>Foco:</strong> o anel e a mudança de borda aparecem inclusive no clique, e o
              anel respeita o modo de alto contraste.
            </li>
            <li>
              <strong>Preenchimento:</strong> use <code>autocomplete</code> (<code>name</code>,{' '}
              <code>email</code>, <code>tel</code>) nos dados do usuário logado (WCAG 1.3.5). Em
              cadastro de terceiros use <code>autocomplete=&quot;off&quot;</code>.
            </li>
            <li>
              <strong>Somente leitura × desabilitado:</strong> prefira <code>readonly</code> quando
              o usuário precisa ler ou copiar o valor.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
