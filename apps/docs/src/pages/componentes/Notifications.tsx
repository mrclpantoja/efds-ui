import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/notifications/basico';
import basicoHtml from '../../examples/notifications/basico.html?raw';
import basicoSource from '../../examples/notifications/basico.tsx?raw';

export default function NotificationsPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Sino de notificações: um botão com a contagem de não lidas que abre um painel (Popover) com
        a lista, &quot;Marcar todas como lidas&quot; e o estado vazio.
      </p>

      <UseCases
        use={[
          'Para avisos que o usuário pode ver quando quiser (mensagens, aprovações, tarefas).',
          'Na barra superior (Navbar) de aplicações com atividade contínua.',
        ]}
        avoid={[
          'Para confirmar uma ação que o usuário acabou de fazer: use Toast.',
          'Para avisos que bloqueiam o trabalho: use Alert ou Modal.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Sino com lista"
          description="O nome do botão leva a contagem (Notificações, 2 não lidas). Abrir um item não lido o marca como lido; Marcar todas zera a contagem. No React, a leitura vem dos dados: atualize unread em onRead e onReadAll."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="Popover mais o behavior de leitura">
          <p>
            O painel é o <a href={toHref('/componentes/popover')}>Popover</a> (abrir, Esc, foco e
            posição). Com <code>data-eds-notifications</code> no painel, o{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a> liga: clicar no link de
            um item <code>data-unread=&quot;true&quot;</code> o marca como lido; o botão{' '}
            <code>data-eds-notifications-read-all</code> marca todos; a contagem e o nome do sino se
            atualizam; o <code>.eds-notifications-empty</code> aparece sem itens. Eventos no painel:{' '}
            <code>eds:notifications-read</code> (<code>detail.id</code>, de <code>data-id</code>) e{' '}
            <code>eds:notifications-read-all</code>. O seu servidor deve gravar a leitura (ouça os
            eventos).
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de NotificationBell"
          rows={[
            {
              name: 'items',
              type: 'NotificationItem[]',
              required: true,
              description: 'id, title, text, time, dateTime, href, unread.',
            },
            {
              name: 'onRead',
              type: '(id: string) => void',
              description: 'Um item não lido foi aberto. Marque-o como lido nos dados.',
            },
            {
              name: 'onReadAll',
              type: '() => void',
              description: '"Marcar todas como lidas" foi acionado.',
            },
            {
              name: 'onItemClick',
              type: '(item) => void',
              description: 'Clique em qualquer item. Itens sem href são botões.',
            },
            {
              name: 'placement',
              type: 'PopoverPlacement',
              default: "'bottom'",
              description: 'Lado do painel.',
            },
            {
              name: 'texts',
              type: '{ title, none, one, many, unread, markAllRead, empty, allRead }',
              description: 'Textos (pt-BR por padrão); many usa {count}.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes das Notificações"
          rows={[
            { name: '.eds-notifications', effect: 'O botão do sino (com .eds-button-icon).' },
            {
              name: '.eds-notifications-count',
              effect: 'Selo da contagem (decorativo; hidden em 0).',
            },
            { name: '.eds-notifications-panel', effect: 'O painel (.eds-popover).' },
            {
              name: '.eds-notifications-header / -list / -empty',
              effect: 'Cabeçalho, lista e estado vazio.',
            },
            {
              name: '.eds-notification[data-unread]',
              effect: 'Item; data-unread para não lido.',
            },
            {
              name: '.eds-notification-link / -dot / -body / -status / -title / -text / -time',
              effect: 'Partes do item. O status "Não lida" é texto e some quando lida.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Nome do botão:</strong> leva a contagem (&quot;Notificações, 3 não lidas&quot;),
            já que o selo é decorativo.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> o item não lido tem ponto e o texto &quot;Não
            lida&quot;.
          </li>
          <li>
            <strong>Teclado:</strong> Enter ou Espaço abrem; Esc fecha e o foco volta ao sino; Tab
            percorre os itens (links ou botões).
          </li>
          <li>
            <strong>Anúncio:</strong> &quot;Marcar todas&quot; anuncia o resultado em um status.
            Novas notificações que chegam com a página aberta não são anunciadas por padrão; se
            forem urgentes, mostre também um Toast.
          </li>
        </ul>
      </Section>
    </>
  );
}
