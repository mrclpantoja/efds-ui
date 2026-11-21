import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/command/basico';
import basicoHtml from '../../examples/command/basico.html?raw';
import basicoSource from '../../examples/command/basico.tsx?raw';
import Remoto from '../../examples/command/remoto';
import remotoHtml from '../../examples/command/remoto.html?raw';
import remotoSource from '../../examples/command/remoto.tsx?raw';

export default function CommandPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Paleta de comandos e busca global: um Modal com campo de busca e lista de resultados, aberto
        por Ctrl+K (ou Cmd+K). Leva o usuário a páginas e ações sem passar pelo menu.
      </p>

      <UseCases
        use={[
          'Em aplicações com muitas telas e ações, para quem prefere o teclado.',
          'Como busca global: páginas, registros e ações num lugar só.',
        ]}
        avoid={[
          'Como único caminho para uma função: o menu e os botões continuam existindo.',
          'Para escolher um valor num formulário: use Combobox.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Com itens locais"
          description="Ctrl+K (ou Cmd+K) abre; setas movem, Enter escolhe, Esc fecha e o foco volta a quem abriu. A busca ignora acento e caixa e olha o texto, a descrição e as palavras-chave. Os Recentes guardam só os ids."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Fonte remota"
          description="A busca vai ao servidor depois de uma pausa, com mínimo de caracteres, e o pedido anterior é cancelado quando a busca muda. Falha mostra uma mensagem na lista."
          html={remotoHtml}
          react={{ Component: Remoto, source: remotoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="@efds-ui/behavior">
          <p>
            Um <code>dialog.eds-modal.eds-command</code> com <code>data-eds-command</code>. Os itens
            podem estar na marcação (<code>.eds-command-item</code> com <code>data-value</code>,{' '}
            <code>data-href</code> e <code>data-keywords</code>, e o ícone que você quiser), num{' '}
            <code>&lt;script type=&quot;application/json&quot; data-eds-command-items&gt;</code> ou
            vir do servidor (<code>data-eds-source=&quot;/busca?q=&quot;</code>, que recebe a busca
            no fim da URL e devolve{' '}
            <code>
              [{'{'}value, label, description?, group?, href?, shortcut?
              {'}'}]
            </code>
            ; <code>data-eds-min-chars</code> segura a consulta). Abaixo do mínimo valem os itens
            locais.
          </p>
          <p>
            Atalho: <code>data-eds-command-shortcut=&quot;mod+k&quot;</code> (padrão; também{' '}
            <code>ctrl+shift+p</code>, <code>/</code>; <code>off</code> desliga). Recentes:{' '}
            <code>data-eds-command-recent=&quot;5&quot;</code> (desligado se ausente;{' '}
            <code>off</code> desliga); a chave do <code>localStorage</code> é{' '}
            <code>data-eds-command-storage</code> (padrão <code>eds:command-recent</code>). O evento{' '}
            <code>eds:command-select</code> (cancelável) traz{' '}
            <code>
              detail {'{'} value, label, href, item {'}'}
            </code>
            ; sem cancelar, um item com <code>href</code> navega. O reaproveitamento do Combobox
            está no formato dos itens e na consulta remota (sem o PageLoader automático); a lista
            fica aberta dentro do diálogo em vez de num popup.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de CommandPalette"
          rows={[
            {
              name: 'items',
              type: 'CommandPaletteItem[]',
              description:
                'Itens locais: value, label, description, group, icon, shortcut, keywords, href, disabled.',
            },
            {
              name: 'loadItems',
              type: '(query, signal) => Promise<Item[]>',
              description: 'Fonte remota (com pausa e AbortSignal).',
            },
            {
              name: 'minChars',
              type: 'number',
              default: '0',
              description: 'Mínimo para consultar loadItems.',
            },
            {
              name: 'onSelect',
              type: '(item, event) => void',
              description:
                'Item escolhido (o diálogo já fechou). event.preventDefault() impede a navegação por href.',
            },
            {
              name: 'open / defaultOpen / onOpenChange',
              type: 'boolean',
              description: 'Aberta (controlado ou não).',
            },
            {
              name: 'shortcut',
              type: 'string | false',
              default: "'mod+k'",
              description: 'Atalho global; false desliga.',
            },
            {
              name: 'recent',
              type: 'boolean | number',
              description: 'Recentes (true = 5; máximo 10). Só ids no localStorage.',
            },
            {
              name: 'recentStorageKey',
              type: 'string',
              default: "'eds:command-recent'",
              description: 'Chave do localStorage.',
            },
            { name: 'footer', type: 'ReactNode', description: 'Dicas de teclado (kbd).' },
            {
              name: 'texts',
              type: '{ title, search, recent, empty(query), error, results(count) }',
              description: 'Textos (pt-BR por padrão).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da paleta"
          rows={[
            { name: 'dialog.eds-modal.eds-command', effect: 'O diálogo, alinhado ao topo.' },
            { name: '.eds-command-search', effect: 'Faixa do campo (ícone + input).' },
            { name: '.eds-command-input', effect: 'O campo (role=combobox).' },
            { name: '.eds-command-list', effect: 'A lista (role=listbox).' },
            {
              name: '.eds-command-group / -group-label',
              effect: 'Grupo (role=group) e o seu título.',
            },
            {
              name: '.eds-command-item[role=option]',
              effect: 'Item; aria-selected=true é o destaque, aria-disabled desabilita.',
            },
            {
              name: '.eds-command-icon / -label / -description / -shortcut',
              effect: 'Partes do item.',
            },
            {
              name: '.eds-command-empty / -loading / -footer',
              effect: 'Sem resultado, carregando e dicas.',
            },
            {
              name: '.eds-command[aria-busy]',
              effect: 'Lista esmaecida enquanto a fonte remota responde.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Padrão APG:</strong> combobox com listbox; o foco fica sempre no campo e a opção
            ativa vai em <code>aria-activedescendant</code>.
          </li>
          <li>
            <strong>Teclado:</strong> Ctrl/Cmd+K abre e fecha, setas movem (com volta), Enter
            escolhe, Esc fecha e o foco volta ao elemento de antes. Itens desabilitados são pulados.
          </li>
          <li>
            <strong>Anúncio:</strong> a contagem de resultados é lida depois de uma pausa na
            digitação; o vazio e a falha também.
          </li>
          <li>
            <strong>Privacidade:</strong> os Recentes guardam só ids, ficam desligados por padrão e
            não saem do navegador.
          </li>
        </ul>
      </Section>
    </>
  );
}
