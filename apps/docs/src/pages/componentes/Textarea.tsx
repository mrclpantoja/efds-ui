import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/textarea/basico';
import basicoHtml from '../../examples/textarea/basico.html?raw';
import basicoSource from '../../examples/textarea/basico.tsx?raw';

export default function TextareaPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de texto de várias linhas, com a mesma linguagem visual do Input e redimensionável na
        vertical. É o <code>&lt;textarea&gt;</code> nativo.
      </p>

      <UseCases
        use={[
          'Para comentários, observações, justificativas e descrições.',
          'Quando o usuário precisa de mais de uma linha e o tamanho do texto varia.',
        ]}
        avoid={[
          <>
            Para entradas curtas (nome, código): use <a href="/componentes/input">Input</a>.
          </>,
          'Para formatação rica (negrito, listas): o componente é só texto simples.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Ajuda, erro e somente leitura"
          description="Dentro de um Field, a mensagem e o estado de erro são ligados automaticamente."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Textarea</code> aceita todos os atributos nativos de <code>&lt;textarea&gt;</code> (
          <code>rows</code>, <code>maxLength</code>, ...), repassa <code>ref</code> e mescla{' '}
          <code>className</code>. Dentro de um Field, <code>id</code>, <code>aria-describedby</code>
          , <code>aria-invalid</code> e <code>required</code> vêm dele.
        </p>
        <PropsTable
          caption="Props de Textarea"
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
                  <code>data-valid=&quot;true&quot;</code> (borda de sucesso).
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Textarea"
          rows={[
            {
              name: '.eds-textarea',
              effect:
                'Base: largura total, altura mínima de duas linhas de controle, resize vertical.',
            },
            {
              name: '.eds-textarea-sm / -lg',
              effect: 'Altura mínima dos tamanhos pequeno e grande.',
            },
            { name: ':focus', effect: 'Borda na cor de ação e anel de foco.' },
            { name: '[aria-invalid="true"]', effect: 'Borda de perigo.' },
            { name: '[data-valid]', effect: 'Borda de sucesso.' },
            { name: '[readonly]', effect: 'Fundo sutil.' },
            { name: ':disabled', effect: 'Fundo sutil, texto esmaecido, sem redimensionar.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Nome e erro:</strong> igual ao Input: <code>label</code> associado e{' '}
              <code>aria-invalid</code> com mensagem em <code>aria-describedby</code>.
            </li>
            <li>
              <strong>Teclado:</strong> nativo. Tab sai do campo; Enter insere quebra de linha, e
              não envia o formulário.
            </li>
            <li>
              <strong>Limite de caracteres:</strong> informe-o na ajuda (&quot;Máximo de 500
              caracteres&quot;). Se mostrar um contador, não o anuncie a cada tecla.
            </li>
            <li>
              <strong>Redimensionar:</strong> a alça de resize é só vertical, para o campo não
              estourar a largura do layout.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
