import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/dirty-guard/basico';
import basicoHtml from '../../examples/dirty-guard/basico.html?raw';
import basicoSource from '../../examples/dirty-guard/basico.tsx?raw';

export default function DirtyGuardPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Avisa antes de o usuário perder o que digitou: fechar a aba, recarregar ou clicar num link
        que sai da página. Não é um componente visual: é um comportamento do formulário.
      </p>

      <UseCases
        use={[
          'Em formulários longos ou de cadastro, onde perder o preenchimento custa caro.',
          'Em edição de registros com várias abas ou seções.',
        ]}
        avoid={[
          'Em formulários curtos (busca, login): o aviso só atrapalha.',
          'Como substituto de salvar rascunho: o ideal é salvar sozinho.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Formulário com aviso"
          description="Altere o título e use o link Voltar à lista: o sistema pergunta antes de sair. Salvar (ou voltar ao valor original) tira o aviso."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Behavior @eds-ui/behavior">
          <p>
            Ponha <code>data-eds-dirty-guard</code> no <code>&lt;form&gt;</code>. O behavior compara
            os campos com o estado inicial. Com alterações, fechar a aba mostra o aviso nativo do
            navegador (o texto dele não é configurável) e um link interno abre a confirmação do
            eDS.ui (<code>confirm</code>), com o texto de <code>data-eds-dirty-message</code>. O
            envio comum do formulário tira o aviso. Para envio por fetch, dispare{' '}
            <code>eds:dirty-reset</code> no formulário depois do sucesso.{' '}
            <code>data-eds-dirty-ignore</code> tira um campo ou bloco da comparação. O formulário
            ganha <code>data-dirty=&quot;true&quot;</code> e o evento <code>eds:dirty-change</code>{' '}
            (<code>detail.dirty</code>).
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="useUnsavedChanges(dirty, options?)"
          rows={[
            {
              name: 'dirty',
              type: 'boolean',
              required: true,
              description: 'Há alterações. Calcule comparando com o último valor salvo.',
            },
            { name: 'message', type: 'string', description: 'Texto da pergunta ao sair por link.' },
            {
              name: 'confirmLinks',
              type: 'boolean',
              default: 'true',
              description:
                'Pergunta também ao clicar em links internos (no diálogo do DialogProvider, ou window.confirm sem ele). Rotas por hash contam; âncoras da própria página não.',
            },
            {
              name: 'texts',
              type: '{ title, message, leave, stay }',
              description: 'Textos do diálogo (pt-BR por padrão).',
            },
          ]}
        />
        <p>
          O hook cobre <code>beforeunload</code> e cliques em links. Navegação por código (
          <code>navigate()</code>) e o botão Voltar do navegador não passam por ele: confirme-os no
          seu roteador.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Atributos do aviso de alterações"
          headers={['Atributo', 'Efeito']}
          rows={[
            { name: 'data-eds-dirty-guard', effect: 'No form: liga o aviso.' },
            { name: 'data-eds-dirty-message', effect: 'Texto da confirmação ao sair por link.' },
            {
              name: 'data-eds-dirty-ignore',
              effect: 'Num campo ou bloco: não conta como alteração.',
            },
            {
              name: 'data-dirty="true"',
              effect: 'Posto pelo behavior no form enquanto há alterações.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Diálogo:</strong> a confirmação por link é um <code>alertdialog</code> do
            eDS.ui, com foco no botão seguro e Esc para continuar editando.
          </li>
          <li>
            <strong>WCAG 3.3.4 (prevenção de erros):</strong> o aviso evita perda de dados sem
            confirmação.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> oferecer um caminho claro para salvar e não
            usar o aviso em páginas onde não há o que perder.
          </li>
        </ul>
      </Section>
    </>
  );
}
