import { Alert } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/conditional/basico';
import basicoHtml from '../../examples/conditional/basico.html?raw';
import basicoSource from '../../examples/conditional/basico.tsx?raw';

export default function ConditionalPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campos que aparecem, somem ou ficam obrigatórios conforme outro campo, só com atributos: sem
        script na página, compatível com CSP. Em React, o próprio estado resolve.
      </p>

      <UseCases
        use={[
          'Para formulários onde parte dos campos depende de uma escolha (tipo de pessoa, "outro motivo").',
          'Em páginas montadas no servidor (PHP, Java, .NET) que não usam React.',
        ]}
        avoid={[
          'Para regras de negócio complexas ou entre muitas etapas: use um Wizard ou valide no servidor.',
          'Como única validação: o servidor deve revalidar, pois sem JavaScript todos os campos aparecem.',
        ]}
      />

      <Section title="Exemplo">
        <Example
          title="Pessoa física ou jurídica"
          description="Troque o tipo de pessoa e marque o contato alternativo. O que está oculto não vai no envio e não valida."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Behavior @eds-ui/behavior">
          <p>
            O elemento oculto recebe <code>hidden</code> e os campos dentro dele ficam{' '}
            <code>disabled</code> (não vão no envio nem entram na validação); ao reaparecer, voltam
            ao estado que tinham (um campo que o autor já deixou desabilitado continua assim).
            Blocos condicionais aninhados funcionam. O evento <code>eds:conditional-change</code> (
            <code>detail.visible</code>) avisa a mudança; <code>data-eds-show-if-announce</code>{' '}
            define um texto a anunciar, de forma discreta, quando o bloco aparece por ação do
            usuário.
          </p>
        </Alert>
        <ClassTable
          caption="Atributos dos campos condicionais"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-show-if="campo=valor"',
              effect: 'Mostra o elemento só quando o campo vale o valor.',
            },
            {
              name: 'data-eds-show-if="campo!=valor"',
              effect: 'Mostra quando o campo é diferente do valor.',
            },
            {
              name: 'data-eds-show-if="campo"',
              effect: 'Mostra quando o campo está preenchido (ou marcado).',
            },
            {
              name: 'data-eds-show-if="!campo"',
              effect: 'Mostra quando o campo está vazio (ou desmarcado).',
            },
            {
              name: 'data-eds-show-if="campo=a|b"',
              effect: 'Vários valores: vale se for qualquer um deles.',
            },
            {
              name: 'data-eds-require-if="..."',
              effect:
                'Torna obrigatório (required) o campo, ou os de dentro, enquanto a condição valer. Mesma sintaxe.',
            },
            {
              name: 'data-eds-show-if-announce="Texto"',
              effect: 'Anúncio discreto quando o bloco aparece.',
            },
          ]}
        />
      </Section>

      <Section title="No React">
        <p>
          Não há API nova: renderize o campo só quando a condição vale, como no exemplo. Um campo
          que não é renderizado não vai no envio nem valida, igual ao comportamento do HTML.
        </p>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Ordem:</strong> o campo novo entra logo depois do campo que o controla, na ordem
            do DOM, para o foco e a leitura seguirem naturalmente.
          </li>
          <li>
            <strong>Oculto de verdade:</strong> <code>hidden</code> e <code>disabled</code> tiram o
            campo da leitura e do teclado.
          </li>
          <li>
            <strong>Aviso:</strong> mudanças inesperadas de conteúdo merecem um anúncio curto (
            <code>data-eds-show-if-announce</code>), sem repetir o que o leitor já diz ao navegar.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> que o servidor valide sempre (sem
            JavaScript todos os campos aparecem) e que o rótulo de um campo obrigatório mostre a
            marca de obrigatoriedade (<code>data-required</code> no rótulo).
          </li>
        </ul>
      </Section>
    </>
  );
}
