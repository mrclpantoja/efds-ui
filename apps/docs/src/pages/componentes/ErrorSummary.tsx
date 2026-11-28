import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/error-summary/basico';
import basicoHtml from '../../examples/error-summary/basico.html?raw';
import basicoSource from '../../examples/error-summary/basico.tsx?raw';
import Estatico from '../../examples/error-summary/estatico';
import estaticoHtml from '../../examples/error-summary/estatico.html?raw';
import estaticoSource from '../../examples/error-summary/estatico.tsx?raw';

export default function ErrorSummaryPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Resumo dos erros de um formulário, no topo, com um link por campo inválido. Ao recusar o
        envio ele recebe o foco: quem usa leitor de tela ouve quantos campos precisam de correção e
        quem usa teclado chega ao campo certo com um Enter. É o padrão do GOV.UK (WCAG 3.3.1 e
        3.3.3), em HTML e React.
      </p>

      <UseCases
        use={[
          'Em formulários longos ou com vários campos obrigatórios, para dar o panorama do que falta.',
          'Junto do erro de cada campo: o resumo não o substitui.',
        ]}
        avoid={[
          'Em formulário de um ou dois campos: o erro junto do campo basta.',
          'Para aviso que não vem de um envio recusado: use Alert ou Toast.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Envio recusado"
          description="Envie vazio: o resumo aparece e recebe o foco. Use um link para ir ao campo e corrija: o item some, o título acompanha e, ao zerar, o resumo se esconde."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Resumo já visível"
          description="Só CSS (HTML) ou o componente com errors vindos de onde você quiser, por exemplo de uma resposta do servidor."
          html={estaticoHtml}
          react={{ Component: Estatico, source: estaticoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="Comportamento">
          <p>
            Com <code>data-eds-error-summary</code> o JS cuida de tudo (ver{' '}
            <a href={toHref('/comecar/validacao')}>Validação</a>): preenche o título e a lista ao
            recusar o envio, dá o foco ao resumo, leva o foco ao campo pelo link e atualiza ao
            corrigir. Sem o atributo, o resumo é só CSS e o servidor o renderiza.
          </p>
          <p>
            Num <a href={toHref('/componentes/stepper')}>Wizard</a> (<code>data-eds-wizard</code>) o
            resumo recebe os campos inválidos do painel atual a cada avanço recusado; em React,{' '}
            <code>{'<Wizard errorSummary />'}</code> renderiza o <code>ErrorSummary</code> sozinho.
            Ponha-o fora dos painéis.
          </p>
        </Alert>
        <ClassTable
          caption="Classes e atributos"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: '.eds-error-summary',
              effect: 'O contêiner. Com tabindex="-1" e aria-labelledby; hidden até haver erro.',
            },
            {
              name: '.eds-error-summary-title',
              effect:
                'O título (h2 por padrão; ajuste o nível à página). O JS escreve "Corrija N campos".',
            },
            {
              name: '.eds-error-summary-list',
              effect: 'A lista de links, um item por campo: "Rótulo: mensagem".',
            },
            {
              name: 'data-eds-error-summary',
              effect:
                'Liga o comportamento. Dentro do form, ou com o id do form no valor, ou imediatamente antes ou depois do form.',
            },
          ]}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de ErrorSummary"
          rows={[
            {
              name: 'errors',
              type: '{ id: string; message: string; label?: string; name?: string }[]',
              required: true,
              description:
                'Campos com erro. id é o do campo (destino do link); label vira o prefixo "Rótulo: mensagem". Lista vazia oculta o resumo.',
            },
            {
              name: 'title',
              type: 'ReactNode',
              description: 'Troca o título padrão "Corrija N campos".',
            },
            {
              name: 'headingLevel',
              type: '2 | 3 | 4 | 5 | 6',
              default: '2',
              description: 'Nível do título conforme a hierarquia da página.',
            },
            {
              name: 'focusKey',
              type: 'number',
              description:
                'Muda a cada envio recusado (o useFormValidation fornece): o resumo recebe o foco quando muda. Sem ele, recebe o foco ao passar de nenhum a algum erro.',
            },
            {
              name: 'moveFocus',
              type: 'boolean',
              default: 'true',
              description: 'false: nunca move o foco. A primeira renderização também não move.',
            },
            {
              name: 'texts',
              type: 'Partial<{ titleOne; titleMany; fixed }>',
              description:
                'Textos em pt-BR por padrão; {count} em titleMany. fixed é o anúncio ao corrigir o último erro.',
            },
          ]}
        />
        <p>
          O componente aceita os atributos de <code>div</code> e <code>ref</code>. Para alimentá-lo
          a partir dos campos, use <code>useFormValidation</code> (veja{' '}
          <a href={toHref('/comecar/validacao')}>Validação</a>).
        </p>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Foco:</strong> o contêiner é focável por programa (
            <code>tabindex=&quot;-1&quot;</code>) e recebe o foco ao recusar o envio; o título o
            nomeia (<code>aria-labelledby</code>) e é lido junto.
          </li>
          <li>
            <strong>Links:</strong> cada um leva o foco ao campo (a âncora sozinha só rolaria) e o
            texto traz rótulo e mensagem, então faz sentido fora de contexto.
          </li>
          <li>
            <strong>Cor não é o único sinal:</strong> ícone, título e texto dizem que há erro.
          </li>
          <li>
            <strong>Ao corrigir:</strong> a lista se atualiza em silêncio; só o fim (todos
            corrigidos) é anunciado, por uma região de status.
          </li>
        </ul>
      </Section>
    </>
  );
}
