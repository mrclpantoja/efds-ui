import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/error-state/basico';
import basicoHtml from '../../examples/error-state/basico.html?raw';
import basicoSource from '../../examples/error-state/basico.tsx?raw';

export default function ErrorStatePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Estado de erro com saída: título, texto, um código técnico opcional e o botão &quot;Tentar
        de novo&quot;. É o Empty State na variante de erro.
      </p>

      <UseCases
        use={[
          'Quando uma carga ou operação falhou e repetir pode resolver (rede, servidor ocupado).',
          'Para mostrar um código que o suporte possa pedir.',
        ]}
        avoid={[
          'Para lista sem dados: use Empty State.',
          'Para erro de campo: use a mensagem do Field.',
          'Para aviso curto sem tela vazia: use Alert ou Toast.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Carga que falhou"
          description="No React, retrying deixa o botão aria-busy e ignora cliques enquanto a nova tentativa roda."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Só CSS">
          <p>
            Use <code>.eds-empty</code> com <code>.eds-empty-error</code>. O botão &quot;Tentar de
            novo&quot; é um botão comum: durante a nova tentativa ponha{' '}
            <code>aria-busy=&quot;true&quot;</code> nele (o spinner já vem do Button). Use{' '}
            <code>role=&quot;alert&quot;</code> no contêiner só quando o erro aparece depois de uma
            ação do usuário; na carga da página, sem papel.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de ErrorState"
          rows={[
            { name: 'title', type: 'ReactNode', required: true, description: 'O que deu errado.' },
            { name: 'description', type: 'ReactNode', description: 'O que fazer.' },
            {
              name: 'detail',
              type: 'ReactNode',
              description: 'Código técnico em fonte mono (ex.: "Código: ERR-0042").',
            },
            {
              name: 'onRetry / retrying',
              type: '() => void / boolean',
              description:
                'Sem onRetry o botão não aparece. retrying deixa o botão aria-busy e ignora cliques.',
            },
            { name: 'actions', type: 'ReactNode', description: 'Ações extras ao lado do botão.' },
            {
              name: 'announce',
              type: 'boolean',
              default: 'false',
              description: 'role="alert": use só quando o erro surge depois de uma ação.',
            },
            {
              name: 'headingLevel',
              type: '2 | 3 | 4 | 5 | 6',
              default: '3',
              description: 'Nível do título.',
            },
            {
              name: 'texts',
              type: '{ retry }',
              description: 'Rótulo do botão ("Tentar de novo").',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do ErrorState"
          rows={[
            { name: '.eds-empty.eds-empty-error', effect: 'O estado vazio na variante de erro.' },
            { name: '.eds-empty-icon', effect: 'Ícone (decorativo, aria-hidden).' },
            { name: '.eds-empty-title / .eds-empty-text', effect: 'Título e texto.' },
            { name: '.eds-empty-detail', effect: 'Código técnico em fonte mono.' },
            { name: '.eds-empty-actions', effect: 'Linha dos botões.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Anúncio:</strong> com <code>announce</code> o erro é lido na hora; sem ele, o
            conteúdo segue a ordem normal da leitura.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> o ícone e o texto dizem que é erro.
          </li>
          <li>
            <strong>Foco:</strong> o botão &quot;Tentar de novo&quot; mantém o foco enquanto repete
            (aria-busy), sem sumir.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> uma mensagem que diga o que fazer, não só o
            que falhou, e nunca expor detalhes internos de segurança no código mostrado.
          </li>
        </ul>
      </Section>
    </>
  );
}
