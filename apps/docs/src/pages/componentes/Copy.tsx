import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import CopyBasico from '../../examples/copy/basico';
import copyBasicoHtml from '../../examples/copy/basico.html?raw';
import copyBasicoSource from '../../examples/copy/basico.tsx?raw';
import Copiado from '../../examples/copy/copiado';
import copiadoHtml from '../../examples/copy/copiado.html?raw';
import copiadoSource from '../../examples/copy/copiado.tsx?raw';
import SecretBasico from '../../examples/secret/basico';
import secretBasicoHtml from '../../examples/secret/basico.html?raw';
import secretBasicoSource from '../../examples/secret/basico.tsx?raw';

export default function CopyPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Botão que copia um texto para a área de transferência e a caixa de segredo, para um valor
        que o sistema mostra uma única vez (token, chave de API).
      </p>

      <UseCases
        use={[
          'Para chaves, links, códigos e comandos que o usuário vai colar em outro lugar.',
          'Para mostrar um segredo recém-gerado com aviso de que ele não aparece de novo.',
        ]}
        avoid={[
          'Para copiar dados pessoais de terceiros sem necessidade (LGPD): ofereça só o que o usuário precisa.',
          'Para guardar senhas do usuário: use o gerenciador de senhas do navegador.',
        ]}
      />

      <Section title="Copiar">
        <Example
          title="Copiar o conteúdo de um elemento ou um texto fixo"
          description="Depois de copiar, o rótulo vira Copiado por 2 segundos e um status à parte anuncia. Sem Clipboard API (ou fora de HTTPS) usa o execCommand."
          html={copyBasicoHtml}
          react={{ Component: CopyBasico, source: copyBasicoSource }}
        />
        <Example
          title="Estado copiado"
          description="O visual do estado, parado. O CopyButton (ou o behavior) aplica data-copied por 2 s e depois remove o atributo."
          html={copiadoHtml}
          react={{ Component: Copiado, source: copiadoSource }}
        />
      </Section>

      <Section title="Caixa de segredo">
        <Example
          title="Valor exibido uma vez"
          description="O campo nasce mascarado e somente leitura. Mostrar valor alterna com aria-pressed (o nome do botão não muda); Copiar copia o valor real."
          html={secretBasicoHtml}
          react={{ Component: SecretBasico, source: secretBasicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Behavior @efds-ui/behavior">
          <p>
            <code>data-eds-copy=&quot;#alvo&quot;</code> copia o valor (campo) ou o texto do
            elemento; <code>data-eds-copy-text=&quot;...&quot;</code> copia um texto fixo. O texto
            de <code>.eds-copy-label</code> (ou o <code>aria-label</code>, em botão só de ícone)
            vira &quot;Copiado&quot; por 2 s com <code>data-copied=&quot;true&quot;</code>. Eventos:{' '}
            <code>eds:copy</code> (<code>detail.text</code>) e <code>eds:copy-fail</code>. A caixa
            de segredo reaproveita o <code>data-eds-password-toggle</code> do campo de senha para
            mostrar e ocultar.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de CopyButton"
          rows={[
            {
              name: 'text',
              type: 'string | () => string',
              required: true,
              description: 'O que copiar. Como função, é lida na hora do clique.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              default: '"Copiar"',
              description: 'Rótulo. Com iconOnly, informe o aria-label (ele vira "Copiado").',
            },
            { name: 'iconOnly', type: 'boolean', description: 'Só o ícone; exige aria-label.' },
            {
              name: 'onCopy / onCopyError',
              type: '(text) => void / () => void',
              description: 'Depois de copiar e quando a cópia falha.',
            },
            {
              name: 'feedbackMs',
              type: 'number',
              default: '2000',
              description: 'Duração do "Copiado".',
            },
            {
              name: 'texts',
              type: '{ copy, copied, announce, failed }',
              description: 'Textos (pt-BR por padrão).',
            },
          ]}
        />
        <PropsTable
          caption="Props de SecretField"
          rows={[
            { name: 'label', type: 'ReactNode', required: true, description: 'Rótulo visível.' },
            { name: 'value', type: 'string', required: true, description: 'O valor secreto.' },
            { name: 'warning', type: 'ReactNode', description: 'Troca o aviso padrão.' },
            { name: 'copyable', type: 'boolean', default: 'true', description: 'Mostra o Copiar.' },
            {
              name: 'texts / copyTexts',
              type: '{ toggle, copy, warning } / CopyButtonTexts',
              description: 'Textos do campo e do botão de copiar.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes de Copy e Secret"
          rows={[
            {
              name: '.eds-copy',
              effect: 'Junto com .eds-button: prepara a troca de ícone e rótulo.',
            },
            { name: '.eds-copy-icon-idle / .eds-copy-icon-done', effect: 'Ícones de cada estado.' },
            { name: '.eds-copy-label', effect: 'Texto trocado por "Copiado".' },
            { name: '[data-copied]', effect: 'Estado copiado (some depois de 2 s).' },
            { name: '.eds-secret', effect: 'A caixa de segredo.' },
            { name: '.eds-secret-value', effect: 'Campo somente leitura, em fonte mono.' },
            {
              name: '.eds-secret-warning',
              effect: 'Aviso de que o valor não será mostrado de novo.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Anúncio:</strong> o &quot;Copiado&quot; é dito por um status à parte, não só
            pela troca visual do rótulo.
          </li>
          <li>
            <strong>Nome:</strong> botão só de ícone tem <code>aria-label</code> e ele muda para
            &quot;Copiado&quot;; o botão de mostrar valor tem nome fixo e usa{' '}
            <code>aria-pressed</code>.
          </li>
          <li>
            <strong>Segredo:</strong> o campo é lido pelo aviso (<code>aria-describedby</code>);
            mascarado por padrão, para não aparecer em gravação de tela sem querer.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> nunca registrar o segredo em log, e só
            enviá-lo ao navegador uma vez.
          </li>
        </ul>
      </Section>
    </>
  );
}
