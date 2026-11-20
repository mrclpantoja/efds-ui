import { Alert } from '@eds-ui/react';
import { Section } from '../../components/Section';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { toHref } from '../../router';

const uso = `document.addEventListener('eds:tabs-change', (event) => {
  const { id, tab, panel } = event.detail;
  console.log('Aba ativa:', id);
});

// Eventos canceláveis: preventDefault() impede a ação.
document.addEventListener('eds:wizard-beforechange', (event) => {
  if (!podeSair()) event.preventDefault();
});`;

interface Evento {
  name: string;
  /** Elemento que dispara (o ouvinte pode ficar em qualquer ancestral: todos fazem bubble). */
  on: string;
  cancelable?: boolean;
  detail: string;
}

const eventos: Record<string, readonly Evento[]> = {
  'Navegação e sobreposições': [
    {
      name: 'eds:tabs-change',
      on: '.eds-tabs',
      detail: '{ tab, panel, id }: aba ativada, seu painel e o id da aba (ou null).',
    },
    {
      name: 'eds:modal-open',
      on: 'dialog.eds-modal',
      detail: '{ trigger }: o gatilho (ou null quando aberto por código).',
    },
    { name: 'eds:modal-close', on: 'dialog.eds-modal', detail: '{ returnValue }.' },
    { name: 'eds:drawer-open', on: 'dialog.eds-drawer', detail: '{ trigger }.' },
    { name: 'eds:drawer-close', on: 'dialog.eds-drawer', detail: '{ returnValue }.' },
    { name: 'eds:dropdown-open', on: '.eds-dropdown', detail: '{}.' },
    { name: 'eds:dropdown-close', on: '.eds-dropdown', detail: '{}.' },
    { name: 'eds:popover-open', on: '.eds-popover', detail: '{ trigger }: o botão que o abriu.' },
    { name: 'eds:popover-close', on: '.eds-popover', detail: '{ trigger }.' },
    { name: 'eds:sidebar-collapse', on: '.eds-sidebar', detail: '{ collapsed: boolean }.' },
    {
      name: 'eds:wizard-beforechange',
      on: 'form[data-eds-wizard]',
      cancelable: true,
      detail: "{ from, to, direction: 'next' | 'prev' | 'jump' }: índices das etapas.",
    },
    {
      name: 'eds:wizard-change',
      on: 'form[data-eds-wizard]',
      detail: '{ from, to, step, total }: step é o painel novo.',
    },
  ],
  Feedback: [
    {
      name: 'eds:alert-dismiss',
      on: '.eds-alert',
      cancelable: true,
      detail: '{ alert }: cancele para manter o alerta.',
    },
    { name: 'eds:toast-close', on: 'toast', detail: '{ id }.' },
    { name: 'eds:loader-show', on: 'PageLoader', detail: '{}.' },
    {
      name: 'eds:loader-hide',
      on: 'PageLoader',
      detail: '{ reason }: por que fechou (fim do carregamento, usuário, etc.).',
    },
    {
      name: 'eds:loader-timeout',
      on: 'PageLoader',
      detail: '{ pending }: pedidos ainda em curso quando passou o tempo de aviso.',
    },
  ],
  'Tabelas e filtros': [
    {
      name: 'eds:table-sort',
      on: 'table',
      cancelable: true,
      detail:
        "{ column, label, direction: 'ascending' | 'descending', th }: cancele para ordenar no servidor.",
    },
    {
      name: 'eds:table-select-change',
      on: 'table',
      detail: '{ count, rows, total }: marcadas, as linhas marcadas e o total de linhas visíveis.',
    },
    {
      name: 'eds:table-filter',
      on: 'input[data-eds-table-filter]',
      detail: '{ query, count }: texto digitado e linhas que restaram.',
    },
    { name: 'eds:table-filtered', on: 'table', detail: 'Sem detalhe: as linhas visíveis mudaram.' },
    {
      name: 'eds:table-beforeexport',
      on: 'table',
      cancelable: true,
      detail: '{ format, scope, filename, count, data }: altere data (mascare CPF) ou cancele.',
    },
    { name: 'eds:table-export', on: 'table', detail: '{ format, scope, filename, count }.' },
    {
      name: 'eds:filter-change',
      on: 'form[data-eds-filter-bar]',
      detail: "{ reason: 'submit' | 'remove' | 'clear', values, filters, count }.",
    },
  ],
  Campos: [
    {
      name: 'eds:combobox-change',
      on: '.eds-combobox',
      detail: '{ value, label } (simples) ou { values, labels } (múltipla).',
    },
    {
      name: 'eds:date-change',
      on: '.eds-datepicker',
      detail: '{ value: ISO | null, date: Date | null }.',
    },
    {
      name: 'eds:daterange-change',
      on: '.eds-daterange',
      detail: '{ start: ISO | null, end: ISO | null }.',
    },
    {
      name: 'eds:mask-change',
      on: 'input[data-eds-mask]',
      detail: '{ value, raw }: com máscara e sem ela.',
    },
    {
      name: 'eds:upload-change',
      on: '.eds-file-upload',
      detail: 'A lista de arquivos válidos (File[]).',
    },
    { name: 'eds:upload-progress', on: '.eds-file-upload', detail: '{ file, percent }.' },
    { name: 'eds:upload-complete', on: '.eds-file-upload', detail: '{ file, response }.' },
    { name: 'eds:upload-error', on: '.eds-file-upload', detail: '{ file, message }.' },
  ],
  'Listas e árvores': [
    {
      name: 'eds:sortable-change',
      on: 'a lista de destino',
      detail:
        '{ id, from, to, fromIndex, toIndex, order }: order são os data-id da lista de destino.',
    },
    { name: 'eds:tree-select', on: '.eds-tree', detail: '{ node, id, selected }.' },
    { name: 'eds:tree-toggle', on: '.eds-tree', detail: '{ node, id, expanded }.' },
    { name: 'eds:tree-activate', on: '.eds-tree', detail: '{ node, id }: Enter ou duplo clique.' },
    {
      name: 'eds:tree-beforechange',
      on: '.eds-tree',
      cancelable: true,
      detail:
        "{ action: 'add' | 'rename' | 'move' | 'delete' | 'wrap', node, parent, index }: cancele para recusar a edição.",
    },
    {
      name: 'eds:tree-change',
      on: '.eds-tree',
      detail: '{ action, node, parent, index, id, label, tree }: tree é o JSON da árvore.',
    },
  ],
};

export default function EventosPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Todos os eventos do <code>@eds-ui/behavior</code> são <code>CustomEvent</code> com nome{' '}
        <code>eds:&lt;componente&gt;-&lt;ação&gt;</code>, fazem bubble e levam os dados em{' '}
        <code>event.detail</code>. O ouvinte pode ficar no próprio elemento ou em qualquer
        ancestral, como o <code>document</code>.
      </p>

      <Section title="Como ouvir">
        <CodeBlock code={uso} label="Código JavaScript: ouvir eventos eds:*" />
        <ul className="docs-list">
          <li>
            Os eventos marcados como <strong>cancelável</strong> param a ação com{' '}
            <code>preventDefault()</code>; os demais só informam.
          </li>
          <li>
            No React, os mesmos acontecimentos chegam como callbacks (<code>onValueChange</code>,{' '}
            <code>onOpenChange</code>, <code>onStepChange</code>…): os componentes React não
            disparam <code>eds:*</code>.
          </li>
          <li>
            <a href={toHref('/comecar/comportamento')}>Comportamento (JS)</a> explica como ligar o
            pacote e trocar os textos.
          </li>
        </ul>
      </Section>

      {Object.entries(eventos).map(([grupo, lista]) => (
        <Section key={grupo} title={grupo}>
          <ClassTable
            caption={`Eventos: ${grupo}`}
            headers={['Evento e origem', 'Detalhe (event.detail)']}
            rows={lista.map((e) => ({
              name: `${e.name}${e.cancelable ? ' (cancelável)' : ''}`,
              effect: (
                <>
                  Em <code>{e.on}</code>. {e.detail}
                </>
              ),
            }))}
          />
        </Section>
      ))}

      <Alert variant="info" title="Eventos nativos continuam valendo">
        <p>
          Os componentes não substituem os eventos do navegador: <code>input</code>,{' '}
          <code>change</code>, <code>submit</code>, <code>toggle</code> e <code>close</code> seguem
          disparando. Os campos de widget (Combobox, DatePicker) escrevem o valor em um{' '}
          <code>input type=&quot;hidden&quot;</code> e disparam <code>input</code> e{' '}
          <code>change</code> nele.
        </p>
      </Alert>
    </>
  );
}
