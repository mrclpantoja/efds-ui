import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/session-timeout/basico';
import basicoHtml from '../../examples/session-timeout/basico.html?raw';
import basicoSource from '../../examples/session-timeout/basico.tsx?raw';

const scriptTag = `<script src="/eds-behavior.js"
  data-eds-session-timeout="900"
  data-eds-session-warn="60"
  data-eds-session-logout-url="/sair"></script>`;

const jsCall = `EDS.session({
  timeout: 15 * 60,         // segundos sem atividade
  warnBefore: 60,           // aviso faltando 1 minuto
  keepAliveUrl: '/api/sessao/renovar', // opcional: POST ao continuar
  onExpire: () => { location.href = '/sair'; },
});`;

export default function SessionTimeoutPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Aviso de sessão por inatividade: antes de encerrar, o sistema avisa e deixa o usuário
        continuar conectado. Atende a WCAG 2.2.1 (tempo ajustável) e 2.2.6 (perda de dados).
      </p>

      <UseCases
        use={[
          'Em sistemas com sessão que expira por inatividade (dados sensíveis, órgãos públicos).',
          'Quando o usuário pode perder trabalho não salvo se a sessão cair.',
        ]}
        avoid={[
          'Para sessões sem expiração ou páginas públicas.',
          'Como único controle de segurança: o servidor também expira a sessão.',
        ]}
      />

      <Section title="Exemplo">
        <Example
          title="Aviso de expiração"
          description="O HTML mostra o diálogo já montado. No React a demonstração inicia uma sessão curta (25 s): fique sem usar a página para ver o aviso real, com a contagem regressiva."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Behavior @efds-ui/behavior">
          <p>
            Qualquer atividade (ponteiro, teclado, rolagem) reinicia a contagem. Faltando{' '}
            <code>warnBefore</code> segundos abre um <code>alertdialog</code> modal com{' '}
            <strong>Continuar conectado</strong> e <strong>Sair</strong>; durante o aviso só o botão
            renova (mexer o mouse não basta). Ao zerar, chama <code>onExpire</code>, emite{' '}
            <code>eds:session-expire</code> no <code>&lt;html&gt;</code> e vai para{' '}
            <code>logoutUrl</code>. Atividade e expiração são sincronizadas entre as abas pelo{' '}
            <code>localStorage</code>. <strong>Nenhuma chamada de rede</strong> é feita, a menos que
            você informe <code>keepAliveUrl</code> (POST, só ao continuar e, com atividade, no
            máximo a cada 5 minutos).
          </p>
        </Alert>
        <CodeBlock code={scriptTag} label="Pelo atributo no script" />
        <CodeBlock code={jsCall} label="Pela função" />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de SessionTimeout e opções de useSessionTimeout"
          rows={[
            {
              name: 'timeout',
              type: 'number',
              default: '900',
              description: 'Segundos sem atividade.',
            },
            {
              name: 'warnBefore',
              type: 'number',
              default: '60',
              description: 'Segundos de aviso.',
            },
            {
              name: 'onExpire',
              type: '() => void',
              description: 'Sessão expirou (inclusive por "Sair" e por outra aba).',
            },
            { name: 'onWarn', type: '(remaining) => void', description: 'O aviso abriu.' },
            {
              name: 'keepAliveUrl / keepAliveEvery',
              type: 'string / number',
              description: 'Renovação no servidor (opcional).',
            },
            {
              name: 'enabled',
              type: 'boolean',
              default: 'true',
              description: 'Desliga a contagem (usuário não autenticado).',
            },
            {
              name: 'storageKey',
              type: 'string',
              default: "'eds-session'",
              description: 'Chave do localStorage que sincroniza as abas.',
            },
            {
              name: 'texts',
              type: 'SessionTimeoutTexts',
              description: 'Só em <SessionTimeout>: textos do aviso.',
            },
          ]}
        />
        <p>
          <code>useSessionTimeout(options)</code> devolve{' '}
          <code>{'{ warning, remaining, extend, leave }'}</code> para quem quiser montar o próprio
          aviso. Os tempos valem na montagem; para mudá-los, troque a <code>key</code> do
          componente.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Partes do aviso de sessão"
          rows={[
            {
              name: '.eds-modal.eds-alert-dialog[role="alertdialog"]',
              effect: 'O diálogo de aviso (dos diálogos rápidos).',
            },
            {
              name: '.eds-session-countdown',
              effect: 'Contagem regressiva visual (algarismos tabulares, aria-hidden).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Contagem acessível:</strong> o número que muda a cada segundo é{' '}
            <code>aria-hidden</code>. O leitor de tela ouve o tempo uma vez, ao abrir, depois a cada
            minuto e aos 10 segundos, em um status dentro do diálogo.
          </li>
          <li>
            <strong>Foco:</strong> abre em &quot;Continuar conectado&quot;; Esc também continua
            conectado; ao fechar, o foco volta ao elemento anterior.
          </li>
          <li>
            <strong>WCAG 2.2.1:</strong> o usuário é avisado e pode estender (o aviso dura{' '}
            <code>warnBefore</code>, mínimo recomendado de 20 segundos).
          </li>
          <li>
            <strong>WCAG 2.2.6:</strong> o texto avisa que alterações não salvas serão perdidas.
            Combine com o{' '}
            <a href={toHref('/componentes/dirty-guard')}>aviso de alterações não salvas</a>.
          </li>
          <li>
            <strong>O consumidor deve garantir:</strong> que o servidor aplique o mesmo prazo e que
            o <code>onExpire</code> realmente encerre a sessão.
          </li>
        </ul>
      </Section>
    </>
  );
}
