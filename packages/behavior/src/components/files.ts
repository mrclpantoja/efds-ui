import { emit, flag, hidePopover, showPopover, uid } from '../core/dom';
import { getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';
import {
  createFilesController,
  type AnyEntry,
  type ConflictAnswer,
  type FilesAction,
  type FilesController,
  type FilesState,
  type FilesUi,
  type UploadJob,
} from '../files/controller';
import { getFilesConfig } from '../files/config';
import { createHttpAdapter } from '../files/http-adapter';
import {
  entryKind,
  formatDateTime,
  formatSize,
  extensionOf,
  nameProblem,
  parentOf,
  baseName,
} from '../files/logic';
import { defaultFilesTexts, fill, type FilesTexts } from '../files/texts';
import type { FileEntry, FileVersion, FilesAdapter, TrashEntry } from '../files/types';
import { confirm } from './dialogs';
import { toast } from './toast';
import { viewer } from './viewer';
import {
  button,
  createFolderTree,
  h,
  icon,
  openDialog,
  sortIcon,
  type Child,
  type FolderTree,
} from './files-dom';

/**
 * Gerenciador de arquivos (`[data-eds-files]`): pastas, lista ou grade, envio, mover/copiar,
 * lixeira e versões, sobre a API HTTP do sistema (contrato em `docs/architecture/arquivos.md`).
 * Sem `data-eds-files-api` (nem adaptador configurado) nada é requisitado.
 */

/** Padrões do gerenciador + o que o autor trocou em `configure({ messages })`. */
let textsSource: unknown = null;
let textsMerged: FilesTexts = defaultFilesTexts;
const T = (): FilesTexts => {
  const messages = getMessages();
  if (messages !== textsSource) {
    textsSource = messages;
    textsMerged = { ...defaultFilesTexts, ...messages };
  }
  return textsMerged;
};
const MIME_FILES = 'application/x-eds-files';

export interface FilesHandle {
  navigate(path: string): Promise<void>;
  refresh(): Promise<void>;
  select(ids: string[]): void;
  upload(files: File[]): void;
  readonly path: string;
  readonly selection: string[];
}

const handles = new WeakMap<HTMLElement, FilesHandle>();

/** `EDS.files(el)`: controle programático de um gerenciador já ligado (ou `null`). */
export function filesHandle(el: HTMLElement): FilesHandle | null {
  return handles.get(el) ?? null;
}

const SORTABLE: {
  key: 'name' | 'size' | 'modified' | 'type';
  text: keyof FilesTexts;
  narrow: boolean;
}[] = [
  { key: 'name', text: 'filesColName', narrow: false },
  { key: 'size', text: 'filesColSize', narrow: false },
  { key: 'modified', text: 'filesColModified', narrow: true },
  { key: 'type', text: 'filesColType', narrow: true },
];

const KIND_TEXT: Record<string, keyof FilesTexts> = {
  folder: 'filesTypeFolder',
  pdf: 'filesTypePdf',
  image: 'filesTypeImage',
  video: 'filesTypeVideo',
  audio: 'filesTypeAudio',
  text: 'filesTypeText',
  other: 'filesTypeOther',
};

const ACTION_TEXT: Record<FilesAction, keyof FilesTexts> = {
  open: 'filesOpen',
  download: 'filesDownload',
  rename: 'filesRename',
  cut: 'filesCut',
  copy: 'filesCopy',
  move: 'filesMoveTo',
  copyTo: 'filesCopyTo',
  versions: 'filesVersions',
  delete: 'filesDelete',
  restore: 'filesRestore',
  deleteForever: 'filesDeleteForever',
};

export const filesBehavior: Behavior = {
  name: 'files',
  selector: '[data-eds-files]',
  bind(root) {
    const api = root.getAttribute('data-eds-files-api') ?? '';
    const configured = getFilesConfig().adapter;
    if (!api && !configured) return;
    const adapter: FilesAdapter =
      typeof configured === 'function'
        ? configured(api, root)
        : (configured ??
          createHttpAdapter(api, {
            onRequest: (url, init) => {
              emit(root, 'files-request', { url, init });
            },
          }));

    const ac = new AbortController();
    const { signal } = ac;
    const doc = root.ownerDocument;

    // ---- esqueleto ---------------------------------------------------------------------------
    root.classList.add('eds-files');
    if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) {
      root.setAttribute('aria-label', T().filesLabel);
    }
    root.setAttribute('role', 'region');
    if (flag(root, 'data-eds-files-readonly')) root.setAttribute('data-readonly', '');

    const announcerEl = h('div', {
      class: 'eds-visually-hidden',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    });
    const announcer = createAnnouncer(announcerEl);

    const ui: FilesUi = {
      announce: (text) => announcer.say(text),
      toast: (o) => {
        toast({ tone: o.tone, message: o.message, duration: o.duration, action: o.action });
      },
      confirm: ({ title, text, confirmLabel, tone }) =>
        confirm(text, title, tone === 'danger' ? 'danger' : 'question', {
          okText: confirmLabel,
          cancelText: T().filesCancel,
        }),
      resolveConflict: (o) => conflictDialog(o.name, o.remaining),
      view(items, index) {
        const withKind = items.map((i) => ({ ...i }));
        viewer.open(withKind, index);
      },
    };

    const controller: FilesController = createFilesController({
      adapter,
      ui,
      texts: T,
      path: root.getAttribute('data-eds-files-path') ?? '/',
      view: root.getAttribute('data-eds-files-view') === 'grid' ? 'grid' : 'list',
      readOnly: flag(root, 'data-eds-files-readonly'),
      rootLabel: root.getAttribute('data-eds-files-root-label') ?? T().filesRootLabel,
      onEvent: (name, detail) => emit(root, `files-${name}`, detail, name === 'open'),
    });

    // Toolbar
    const crumbsList = h('ol', { class: 'eds-breadcrumb-list' });
    const nav = h(
      'nav',
      { class: 'eds-breadcrumb eds-files-path', 'aria-label': T().filesPathLabel },
      crumbsList,
    );
    const searchInput = h('input', {
      type: 'search',
      class: 'eds-input eds-input-sm',
      'aria-label': T().filesSearchLabel,
      placeholder: T().filesSearchLabel,
      autocomplete: 'off',
      'data-files-search': '',
    });
    const recursiveBox = h('input', {
      type: 'checkbox',
      class: 'eds-checkbox',
      'data-files-recursive': '',
    });
    const recursiveLabel = h(
      'label',
      { class: 'eds-check eds-files-recursive', hidden: true },
      recursiveBox,
      T().filesSearchAll,
    );
    const search = h('div', { class: 'eds-files-search' }, searchInput, recursiveLabel);

    const btn = (
      act: string,
      label: string,
      iconName: Parameters<typeof icon>[0],
      cls = 'eds-button-secondary',
    ) => button(label, { class: `eds-button ${cls} eds-button-sm`, 'data-act': act }, iconName);
    const treeOpenBtn = btn('tree-open', T().filesTreeOpen, 'folder');
    treeOpenBtn.classList.add('eds-files-tree-open');
    const newFolderBtn = btn('new-folder', T().filesNewFolder, 'newFolder');
    const uploadBtn = btn('upload', T().filesUpload, 'upload', 'eds-button-primary');
    const pasteBtn = btn('paste', T().filesPaste, 'paste');
    const listBtn = button(
      T().filesViewList,
      {
        class: 'eds-button eds-button-secondary eds-button-sm eds-button-icon',
        'data-act': 'view-list',
      },
      'list',
      true,
    );
    const gridBtn = button(
      T().filesViewGrid,
      {
        class: 'eds-button eds-button-secondary eds-button-sm eds-button-icon',
        'data-act': 'view-grid',
      },
      'grid',
      true,
    );
    const viewGroup = h(
      'div',
      { class: 'eds-files-view', role: 'group', 'aria-label': T().filesViewLabel },
      listBtn,
      gridBtn,
    );
    const trashBtn = btn('trash', T().filesTrash, 'trash');
    const actions = h(
      'div',
      { class: 'eds-files-actions', role: 'group', 'aria-label': T().filesLabel },
      treeOpenBtn,
      newFolderBtn,
      uploadBtn,
      pasteBtn,
      viewGroup,
      trashBtn,
    );
    const toolbar = h(
      'header',
      { class: 'eds-files-toolbar' },
      nav,
      h('div', { class: 'eds-files-tools' }, search, actions),
    );

    // Corpo
    const treeView: FolderTree = createFolderTree({
      controller,
      current: () => controller.getState().path,
      label: T().filesTreeLabel,
      expandLabel: (name) => fill(T().filesTreeExpand, { name }),
      collapseLabel: (name) => fill(T().filesTreeCollapse, { name }),
      onPick: (path) => void controller.navigate(path),
      droppable: true,
    });
    const aside = h(
      'aside',
      { class: 'eds-files-tree', 'aria-label': T().filesTreeLabel },
      treeView.el,
    );
    const heading = h('h2', {
      class: 'eds-files-heading eds-files-heading-sr',
      tabindex: '-1',
      'data-files-focus-fallback': '',
    });
    const emptyTrashBtn = btn('empty-trash', T().filesEmptyTrash, 'trash');
    emptyTrashBtn.hidden = true;
    const notice = h('div', { class: 'eds-files-notice' }, heading, emptyTrashBtn);
    const dropHint = h(
      'div',
      { class: 'eds-files-drop-hint', 'aria-hidden': 'true' },
      icon('upload', ''),
      h('span', { 'data-files-drop-text': '' }, T().filesDropHint),
    );
    const content = h('div', { class: 'eds-files-content' });
    const moreBtn = button(T().filesLoadMore, {
      class: 'eds-button eds-button-secondary',
      'data-act': 'more',
    });
    const more = h('div', { class: 'eds-files-more', hidden: true }, moreBtn);
    const uploadsList = h('ul', { class: 'eds-files-upload-list' });
    const dismissBtn = button(T().filesUploadDismiss, {
      class: 'eds-button eds-button-ghost eds-button-sm',
      'data-act': 'dismiss-uploads',
    });
    const uploadsPanel = h(
      'section',
      { class: 'eds-files-uploads', 'aria-label': T().filesUploadsTitle, hidden: true },
      h(
        'header',
        { class: 'eds-files-uploads-header' },
        h('h3', { class: 'eds-files-uploads-title' }, T().filesUploadsTitle),
        dismissBtn,
      ),
      uploadsList,
    );
    const bulkCount = h('p', { class: 'eds-table-bulk-count' });
    const bulkActions = h('div', { class: 'eds-table-bulk-actions' });
    const bulk = h(
      'div',
      {
        class: 'eds-table-bulk eds-files-bulk',
        role: 'group',
        'aria-label': T().filesBulkLabel,
        hidden: true,
      },
      bulkCount,
      bulkActions,
    );
    const main = h(
      'div',
      { class: 'eds-files-main' },
      notice,
      content,
      more,
      uploadsPanel,
      bulk,
      dropHint,
    );
    const body = h('div', { class: 'eds-files-body' }, aside, main);

    const fileInput = h('input', {
      type: 'file',
      multiple: true,
      hidden: true,
      'aria-hidden': 'true',
      tabindex: '-1',
      'data-files-input': '',
    });
    const menu = h('div', {
      class: 'eds-dropdown eds-files-menu',
      popover: 'manual',
      'data-files-menu': '',
    });

    root.replaceChildren(toolbar, body, announcerEl, fileInput, menu);

    // ---- helpers de entradas -----------------------------------------------------------------
    const st = (): FilesState => controller.getState();
    const byKey = (key: string): AnyEntry | undefined =>
      st().items.find((e) => controller.keyOf(e) === key);
    const linkHref = (e: FileEntry): string =>
      e.type === 'folder' ? `?path=${encodeURIComponent(e.path)}` : controller.viewUrl(e);

    /** Entradas alvo de uma ação: a seleção, se o item faz parte dela; senão só o item. */
    const targetsFor = (entry: AnyEntry): AnyEntry[] => {
      const sel = st().selection;
      const key = controller.keyOf(entry);
      return sel.includes(key) && sel.length > 1 ? controller.entriesOf(sel) : [entry];
    };
    const focusedEntry = (): AnyEntry | undefined => {
      const row = (doc.activeElement as Element | null)?.closest<HTMLElement>('[data-key]');
      const key = row?.getAttribute('data-key');
      return key ? byKey(key) : undefined;
    };
    const currentTargets = (): AnyEntry[] => {
      const focused = focusedEntry();
      if (focused) return targetsFor(focused);
      return controller.entriesOf(st().selection);
    };

    // ---- ações com interface -----------------------------------------------------------------
    function download(entries: AnyEntry[]): void {
      entries
        .filter((e): e is FileEntry => e.type === 'file' && !('trashId' in e))
        .forEach((e, i) => {
          setTimeout(() => {
            const a = h('a', { href: controller.downloadUrl(e), download: e.name, hidden: true });
            root.append(a);
            a.click();
            a.remove();
          }, i * 150);
        });
    }

    async function perform(
      action: FilesAction,
      entries: AnyEntry[],
      trigger?: HTMLElement | null,
    ): Promise<void> {
      if (entries.length === 0) return;
      const files = entries as FileEntry[];
      switch (action) {
        case 'open':
          controller.open(entries[0]!);
          break;
        case 'download':
          download(entries);
          break;
        case 'rename':
          await nameDialog('rename', files[0]!, trigger ?? null);
          break;
        case 'cut':
          controller.cut(files);
          break;
        case 'copy':
          controller.copy(files);
          break;
        case 'move':
        case 'copyTo': {
          const copy = action === 'copyTo';
          const target = await pickDialog(files, copy, trigger ?? null);
          if (target !== undefined) await controller.transfer(files, target, copy);
          break;
        }
        case 'versions':
          await versionsDrawer(files[0]!, trigger ?? null);
          break;
        case 'delete':
          await controller.remove(files);
          break;
        case 'restore':
          await controller.restore(entries as TrashEntry[]);
          break;
        case 'deleteForever':
          await controller.deleteForever(entries as TrashEntry[]);
          break;
      }
    }

    // ---- diálogos ----------------------------------------------------------------------------
    function field(id: string, label: string, input: HTMLElement, error: HTMLElement): HTMLElement {
      return h(
        'div',
        { class: 'eds-field' },
        h('label', { class: 'eds-label', for: id }, label),
        input,
        error,
      );
    }

    async function nameDialog(
      mode: 'create' | 'rename',
      entry: FileEntry | null,
      returnFocus: HTMLElement | null,
    ): Promise<void> {
      const t = T();
      const d = openDialog<boolean>(root, {
        title: mode === 'create' ? t.filesNewFolderTitle : t.filesRenameTitle,
        size: 'sm',
        closeLabel: t.filesClose,
        returnFocus,
      });
      const id = uid('files-name');
      const errId = `${id}-error`;
      const input = h('input', {
        class: 'eds-input',
        id,
        type: 'text',
        autocomplete: 'off',
        value: entry?.name ?? '',
        required: true,
        'data-autofocus': '',
      });
      const error = h('p', { class: 'eds-error', id: errId, hidden: true });
      const form = h('form', { novalidate: true }, field(id, t.filesNameLabel, input, error));
      const submit = button(mode === 'create' ? t.filesCreate : t.filesSave, {
        class: 'eds-button eds-button-primary',
        type: 'submit',
      });
      const cancel = button(t.filesCancel, {
        class: 'eds-button eds-button-secondary',
        'data-eds-close': '',
      });
      d.body.append(form);
      d.footer.append(cancel, submit);
      const showError = (message: string) => {
        error.textContent = message;
        error.hidden = message === '';
        if (message) {
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', errId);
        } else {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
        }
      };
      const problemText = (code: ReturnType<typeof nameProblem>): string =>
        code === 'empty'
          ? t.filesNameEmpty
          : code === 'dots'
            ? t.filesNameDots
            : code === 'long'
              ? t.filesNameLong
              : t.filesNameChars;
      const run = async () => {
        const problem = nameProblem(input.value);
        if (problem) {
          showError(problemText(problem));
          input.focus();
          return;
        }
        if (mode === 'rename' && entry && input.value.trim() === entry.name) return d.close(false);
        submit.setAttribute('aria-busy', 'true');
        const result =
          mode === 'create'
            ? await controller.createFolder(input.value)
            : await controller.rename(entry!, input.value);
        submit.removeAttribute('aria-busy');
        if (result.ok) d.close(true);
        else {
          showError(result.message);
          input.focus();
        }
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (submit.getAttribute('aria-busy') !== 'true') void run();
      });
      input.addEventListener('input', () => showError(''));
      input.focus();
      if (entry && entry.type === 'file') {
        const ext = extensionOf(entry.name);
        input.setSelectionRange(0, ext ? entry.name.length - ext.length - 1 : entry.name.length);
      } else input.select();
      await d.closed;
    }

    async function conflictDialog(name: string, remaining: number): Promise<ConflictAnswer | null> {
      const t = T();
      const d = openDialog<ConflictAnswer>(root, {
        title: t.filesConflictTitle,
        size: 'sm',
        closeLabel: t.filesCancel,
      });
      d.body.append(h('p', {}, fill(t.filesConflictText, { name })));
      let allBox: HTMLInputElement | null = null;
      if (remaining > 0) {
        allBox = h('input', { type: 'checkbox', class: 'eds-checkbox' });
        d.body.append(
          h(
            'label',
            { class: 'eds-check' },
            allBox,
            fill(t.filesConflictAll, { count: remaining }),
          ),
        );
      }
      const choose = (policy: ConflictAnswer['policy']) => () =>
        d.close({ policy, all: allBox?.checked ?? false });
      const skip = button(t.filesConflictSkip, { class: 'eds-button eds-button-ghost' });
      const keep = button(t.filesConflictKeepBoth, {
        class: 'eds-button eds-button-secondary',
        'data-autofocus': '',
      });
      const replace = button(t.filesConflictReplace, { class: 'eds-button eds-button-primary' });
      skip.addEventListener('click', choose('skip'));
      keep.addEventListener('click', choose('rename'));
      replace.addEventListener('click', choose('replace'));
      d.footer.append(skip, keep, replace);
      keep.focus();
      return (await d.closed) ?? null;
    }

    /** Escolhe a pasta de destino. Devolve o caminho ou `undefined` se cancelou. */
    async function pickDialog(
      entries: FileEntry[],
      copy: boolean,
      returnFocus: HTMLElement | null,
    ): Promise<string | undefined> {
      const t = T();
      const d = openDialog<string>(root, {
        title: copy ? t.filesPickTitleCopy : t.filesPickTitleMove,
        closeLabel: t.filesCancel,
        returnFocus,
      });
      let chosen = st().path;
      const sources = entries.filter((e) => e.type === 'folder').map((e) => e.path);
      const status = h('p', { class: 'eds-files-pick-status', role: 'status' });
      const confirmBtn = button(copy ? t.filesPickCopy : t.filesPickMove, {
        class: 'eds-button eds-button-primary',
      });
      const tree = createFolderTree({
        controller,
        current: () => chosen,
        label: t.filesTreeLabel,
        expandLabel: (n) => fill(t.filesTreeExpand, { name: n }),
        collapseLabel: (n) => fill(t.filesTreeCollapse, { name: n }),
        disabledPaths: () => sources,
        onPick: (path) => {
          chosen = path;
          status.textContent = fill(t.filesPickCurrent, {
            name: path === '/' ? controller.rootLabel : baseName(path),
          });
          confirmBtn.disabled = !copy && entries.every((e) => parentOf(e.path) === chosen);
          tree.render();
        },
      });
      tree.reveal(chosen);
      void Promise.all(ancestorsFor(chosen).map((p) => controller.ensureTree(p))).then(() =>
        tree.render(),
      );
      tree.render();
      status.textContent = fill(t.filesPickCurrent, {
        name: chosen === '/' ? controller.rootLabel : baseName(chosen),
      });
      confirmBtn.disabled = !copy && entries.every((e) => parentOf(e.path) === chosen);
      const unsub = controller.subscribe(() => tree.render());
      d.body.append(
        h('p', {}, t.filesPickText),
        h('div', { class: 'eds-files-pick-tree' }, tree.el),
        status,
      );
      confirmBtn.addEventListener('click', () => d.close(chosen));
      d.footer.append(
        button(t.filesCancel, { class: 'eds-button eds-button-secondary', 'data-eds-close': '' }),
        confirmBtn,
      );
      tree.focusCurrent();
      const result = await d.closed;
      unsub();
      return result;
    }
    const ancestorsFor = (path: string): string[] => {
      const out = ['/'];
      let acc = '';
      for (const part of path.split('/').filter(Boolean)) {
        acc += `/${part}`;
        out.push(acc);
      }
      return out;
    };

    async function versionsDrawer(
      entry: FileEntry,
      returnFocus: HTMLElement | null,
    ): Promise<void> {
      const t = T();
      const d = openDialog(root, {
        title: fill(t.filesVersionsTitle, { name: entry.name }),
        drawer: true,
        closeLabel: t.filesClose,
        returnFocus,
      });
      const render = (versions: FileVersion[] | null, failed: string | null) => {
        d.body.replaceChildren();
        if (failed) return void d.body.append(h('p', { class: 'eds-error' }, failed));
        if (versions === null)
          return void d.body.append(h('p', { role: 'status' }, t.filesVersionsLoading));
        if (versions.length <= 1) d.body.append(h('p', {}, t.filesVersionsEmpty));
        const list = h('ul', { class: 'eds-files-versions' });
        for (const v of versions) {
          const when = formatDateTime(v.modified);
          const meta = [
            formatSize(v.size),
            v.author ? fill(t.filesVersionBy, { author: v.author }) : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const row = h(
            'li',
            { class: 'eds-files-version' },
            h(
              'p',
              { class: 'eds-files-version-title' },
              h('time', { datetime: v.modified }, when),
              v.current
                ? h(
                    'span',
                    { class: 'eds-badge eds-badge-info eds-badge-sm' },
                    t.filesVersionCurrent,
                  )
                : null,
            ),
            h('p', { class: 'eds-files-version-meta' }, meta),
          );
          const acts = h('div', { class: 'eds-files-version-actions' });
          const preview = button(t.filesVersionPreview, {
            class: 'eds-button eds-button-ghost eds-button-sm',
          });
          preview.setAttribute('aria-label', `${t.filesVersionPreview}: ${when}`);
          preview.addEventListener('click', () => {
            ui.view?.(
              [
                {
                  src: controller.viewUrl(entry, v.version),
                  name: entry.name,
                  type: entry.mime,
                  downloadUrl: controller.downloadUrl(entry, v.version),
                  size: v.size,
                },
              ],
              0,
            );
          });
          const dl = h(
            'a',
            {
              class: 'eds-button eds-button-ghost eds-button-sm',
              href: controller.downloadUrl(entry, v.version),
              download: entry.name,
              'aria-label': `${t.filesVersionDownload}: ${when}`,
            },
            t.filesVersionDownload,
          );
          acts.append(preview, dl);
          if (!v.current && controller.can('rename', [entry])) {
            const restore = button(t.filesVersionRestore, {
              class: 'eds-button eds-button-secondary eds-button-sm',
            });
            restore.setAttribute('aria-label', `${t.filesVersionRestore}: ${when}`);
            restore.addEventListener('click', async () => {
              restore.setAttribute('aria-busy', 'true');
              const r = await controller.restoreVersion(entry, v);
              if (r.ok) d.close();
              else {
                restore.removeAttribute('aria-busy');
                render(versions, r.message);
              }
            });
            acts.append(restore);
          }
          row.append(acts);
          list.append(row);
        }
        d.body.append(list);
      };
      render(null, null);
      controller.versions(entry).then(
        (v) => render(v, null),
        (e: unknown) => render(null, controller.errorMessage(e as never)),
      );
      await d.closed;
    }

    function treeDrawer(returnFocus: HTMLElement | null): void {
      const t = T();
      const d = openDialog(root, {
        title: t.filesTreeLabel,
        drawer: true,
        closeLabel: t.filesClose,
        returnFocus,
      });
      const tree = createFolderTree({
        controller,
        current: () => st().path,
        label: t.filesTreeLabel,
        expandLabel: (n) => fill(t.filesTreeExpand, { name: n }),
        collapseLabel: (n) => fill(t.filesTreeCollapse, { name: n }),
        onPick: (path) => {
          d.close();
          void controller.navigate(path);
        },
      });
      tree.reveal(st().path);
      tree.render();
      const unsub = controller.subscribe(() => tree.render());
      d.body.append(tree.el);
      tree.focusCurrent();
      void d.closed.then(unsub);
    }

    // ---- menu --------------------------------------------------------------------------------
    let menuTrigger: HTMLElement | null = null;
    function openMenu(
      entries: AnyEntry[],
      at: { x: number; y: number },
      trigger: HTMLElement | null,
    ): void {
      const available = controller.actionsFor(entries);
      if (available.length === 0) return;
      const t = T();
      menu.replaceChildren();
      menu.setAttribute(
        'aria-label',
        entries.length === 1
          ? fill(t.filesActionsFor, { name: entries[0]!.name })
          : t.filesBulkLabel,
      );
      for (const action of available) {
        const danger = action === 'delete' || action === 'deleteForever';
        const item = button(t[ACTION_TEXT[action]], {
          class: `eds-dropdown-item${danger ? ' eds-dropdown-item-danger' : ''}`,
          'data-files-menu-item': action,
        });
        menu.append(item);
        if (action === 'copy' || action === 'copyTo') void 0;
      }
      menuTrigger = trigger;
      trigger?.setAttribute('aria-expanded', 'true');
      menu.style.setProperty('--_files-menu-x', `${Math.round(at.x)}px`);
      menu.style.setProperty('--_files-menu-y', `${Math.round(at.y)}px`);
      menu.dataset.entries = entries.map((e) => controller.keyOf(e)).join('\n');
      showPopover(menu);
      // Mantém o menu dentro da janela.
      const rect = menu.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      if (at.x > maxX)
        menu.style.setProperty('--_files-menu-x', `${Math.max(8, Math.round(maxX))}px`);
      if (at.y > maxY)
        menu.style.setProperty('--_files-menu-y', `${Math.max(8, Math.round(maxY))}px`);
      menu.querySelector<HTMLElement>('button')?.focus();
    }
    menu.addEventListener('toggle', (event) => {
      if ((event as ToggleEvent).newState === 'closed') {
        menuTrigger?.setAttribute('aria-expanded', 'false');
        menuTrigger = null;
      }
    });
    menu.addEventListener(
      'click',
      (event) => {
        const item = (event.target as Element).closest<HTMLElement>('[data-files-menu-item]');
        if (!item) return;
        const keys = (menu.dataset.entries ?? '').split('\n').filter(Boolean);
        const action = item.getAttribute('data-files-menu-item') as FilesAction;
        const trigger =
          menuTrigger ?? (doc.activeElement instanceof HTMLElement ? doc.activeElement : null);
        const entries = controller.entriesOf(keys);
        const back = rowFocusTarget(keys[0]);
        hidePopover(menu);
        back?.focus();
        void perform(action, entries, back ?? trigger);
      },
      { signal },
    );
    menu.addEventListener(
      'keydown',
      (event) => {
        const items = Array.from(menu.querySelectorAll<HTMLElement>('button'));
        const i = items.indexOf(doc.activeElement as HTMLElement);
        if (event.key === 'ArrowDown') items[(i + 1) % items.length]?.focus();
        else if (event.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus();
        else if (event.key === 'Home') items[0]?.focus();
        else if (event.key === 'End') items[items.length - 1]?.focus();
        else if (event.key === 'Escape') {
          const back =
            menuTrigger ?? rowFocusTarget(menu.dataset.entries?.split(String.fromCharCode(10))[0]);
          hidePopover(menu);
          back?.focus();
        } else if (event.key === 'Tab') hidePopover(menu);
        else return;
        if (event.key !== 'Tab') event.preventDefault();
      },
      { signal },
    );
    // Popover manual (o toast e outros popovers não o fecham): clique fora e foco fora fecham.
    doc.addEventListener(
      'pointerdown',
      (event) => {
        if (!menu.matches(':popover-open')) return;
        const target = event.target as Node;
        if (menu.contains(target) || menuTrigger?.contains(target)) return;
        hidePopover(menu);
      },
      { signal, capture: true },
    );

    const rowFocusTarget = (key: string | undefined): HTMLElement | null =>
      key ? content.querySelector<HTMLElement>(`[data-fid="link:${CSS.escape(key)}"]`) : null;

    // ---- desenho -----------------------------------------------------------------------------
    let queued = false;
    /** Depois de navegar por clique ou teclado, o foco vai para o título da pasta (o DOM é trocado). */
    let focusHeading = false;
    const go = (path: string) => {
      focusHeading = true;
      void controller.navigate(path);
    };
    const last: Record<string, unknown> = {};
    const scheduleRender = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        render();
      });
    };

    function render(): void {
      const s = st();
      const t = T();
      root.setAttribute('data-view', s.view);
      root.setAttribute('data-mode', s.mode);
      root.setAttribute('data-state', s.status);
      root.toggleAttribute('data-readonly', s.readOnly || !s.caps.write);

      renderToolbar(s, t);
      if (last.tree !== s.tree || last.treePath !== s.path || last.treeLoading !== s.treeLoading) {
        last.tree = s.tree;
        last.treePath = s.path;
        last.treeLoading = s.treeLoading;
        treeView.reveal(s.path);
        treeView.render();
      }
      const contentChanged =
        last.items !== s.items ||
        last.sort !== s.sort ||
        last.view !== s.view ||
        last.mode !== s.mode ||
        last.status !== s.status ||
        last.error !== s.error ||
        last.caps !== s.caps ||
        last.query !== s.query ||
        last.loadingMore !== s.loadingMore;
      if (contentChanged) {
        Object.assign(last, {
          items: s.items,
          sort: s.sort,
          view: s.view,
          mode: s.mode,
          status: s.status,
          error: s.error,
          caps: s.caps,
          query: s.query,
          loadingMore: s.loadingMore,
        });
        renderContent(s, t);
      }
      if (last.uploads !== s.uploads) {
        last.uploads = s.uploads;
        renderUploads(s, t);
      }
      if (focusHeading && s.status !== 'loading') {
        focusHeading = false;
        heading.focus();
      }
      syncSelection(s, t);
    }

    function renderToolbar(s: FilesState, t: FilesTexts): void {
      const writable = s.caps.write && !s.readOnly;
      const trash = s.mode === 'trash';
      // Trilha
      const crumbs = trash
        ? [
            { path: '/', label: controller.rootLabel, link: true },
            { path: '', label: t.filesTrash, link: false },
          ]
        : controller.crumbs().map((c, i, all) => ({ ...c, link: i < all.length - 1 }));
      const sig = JSON.stringify([crumbs, trash]);
      if (last.crumbs !== sig) {
        last.crumbs = sig;
        crumbsList.replaceChildren(
          ...crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const inner = c.link
              ? h('a', {
                  href: `?path=${encodeURIComponent(c.path)}`,
                  'data-act': 'crumb',
                  'data-path': c.path,
                  'data-drop-path': c.path,
                })
              : h('span', { 'aria-current': isLast ? 'page' : null });
            inner.textContent = c.label;
            return h('li', { class: 'eds-breadcrumb-item' }, inner);
          }),
        );
      }
      search.hidden = trash || s.caps.search === 'none';
      recursiveLabel.hidden = s.caps.search !== 'recursive';
      newFolderBtn.hidden = trash || !writable;
      uploadBtn.hidden = trash || !writable;
      pasteBtn.hidden = trash || !writable || s.clipboard === null;
      viewGroup.hidden = trash;
      listBtn.setAttribute('aria-pressed', String(s.view === 'list'));
      gridBtn.setAttribute('aria-pressed', String(s.view === 'grid'));
      trashBtn.hidden = !s.caps.trash;
      const trashLabel = trash ? t.filesBackToFiles : t.filesTrash;
      if (last.trashLabel !== trashLabel) {
        last.trashLabel = trashLabel;
        trashBtn.replaceChildren(icon(trash ? 'back' : 'trash', ''), trashLabel);
      }
      const accept = s.caps.accept?.join(',') ?? '';
      if (accept) fileInput.setAttribute('accept', accept);
      else fileInput.removeAttribute('accept');
      heading.textContent = trash
        ? t.filesTrash
        : s.path === '/'
          ? controller.rootLabel
          : baseName(s.path);
      heading.classList.toggle('eds-files-heading-sr', !trash);
      emptyTrashBtn.hidden = !(trash && writable && s.items.length > 0);
    }

    // ---- conteúdo ----------------------------------------------------------------------------
    function stateBlock(
      kind: 'empty' | 'error' | 'forbidden',
      s: FilesState,
      t: FilesTexts,
    ): HTMLElement {
      const trash = s.mode === 'trash';
      const searching = s.query !== '';
      if (kind === 'error') {
        const retry = button(t.filesRetry, {
          class: 'eds-button eds-button-primary',
          'data-act': 'retry',
        });
        return h(
          'div',
          { class: 'eds-empty eds-empty-error', role: 'alert' },
          icon('alert', 'eds-empty-icon'),
          h('h3', { class: 'eds-empty-title' }, t.filesErrorTitle),
          h(
            'p',
            { class: 'eds-empty-text' },
            s.error ? controller.errorMessage(s.error) : t.filesErrorText,
          ),
          h('div', { class: 'eds-empty-actions' }, retry),
        );
      }
      if (kind === 'forbidden') {
        return h(
          'div',
          { class: 'eds-empty' },
          icon('lock', 'eds-empty-icon'),
          h('h3', { class: 'eds-empty-title' }, t.filesForbiddenTitle),
          h('p', { class: 'eds-empty-text' }, t.filesForbiddenText),
        );
      }
      const title = trash
        ? t.filesTrashEmptyTitle
        : searching
          ? t.filesEmptySearchTitle
          : t.filesEmptyTitle;
      const text = trash
        ? t.filesTrashEmptyText
        : searching
          ? fill(t.filesEmptySearchText, { query: s.query })
          : t.filesEmptyText;
      const block = h(
        'div',
        { class: 'eds-empty' },
        icon(trash ? 'trash' : 'folder', 'eds-empty-icon'),
        h('h3', { class: 'eds-empty-title' }, title),
        h('p', { class: 'eds-empty-text' }, text),
      );
      if (!trash && !searching && s.caps.write && !s.readOnly) {
        block.append(
          h(
            'div',
            { class: 'eds-empty-actions' },
            button(
              t.filesUpload,
              { class: 'eds-button eds-button-primary', 'data-act': 'upload' },
              'upload',
            ),
          ),
        );
      }
      return block;
    }

    function skeleton(t: FilesTexts): HTMLElement {
      const box = h(
        'div',
        { class: 'eds-files-skeleton' },
        h('span', { class: 'eds-visually-hidden', role: 'status' }, t.filesLoading),
      );
      for (let i = 0; i < 6; i += 1)
        box.append(
          h('span', {
            class: 'eds-skeleton eds-skeleton-text eds-skeleton-shimmer',
            'aria-hidden': 'true',
          }),
        );
      return box;
    }

    function nameCell(e: AnyEntry, s: FilesState): HTMLElement {
      const trash = 'trashId' in e;
      const kind = entryKind(e);
      const label = h('span', { class: 'eds-files-label' }, e.name);
      const parts: Child[] = [
        icon(kind === 'folder' ? 'folder' : kind, `eds-files-icon eds-files-icon-${kind}`),
        label,
      ];
      if (s.query && s.recursive && !trash)
        parts.push(h('span', { class: 'eds-files-origin' }, parentOf(e.path)));
      if (trash) return h('span', { class: 'eds-files-name' }, ...parts);
      const isFolder = e.type === 'folder';
      return h(
        'a',
        {
          class: 'eds-files-link',
          href: linkHref(e),
          ...(isFolder ? {} : { target: '_blank', rel: 'noopener' }),
          'data-act': 'open',
          'data-fid': `link:${controller.keyOf(e)}`,
          ...(isFolder ? { 'data-drop-path': e.path } : {}),
        },
        ...parts,
      );
    }

    function moreButton(e: AnyEntry): HTMLButtonElement {
      const b = button(
        fill(T().filesActionsFor, { name: e.name }),
        {
          class: 'eds-button eds-button-ghost eds-button-icon eds-button-sm',
          'data-act': 'menu',
          'aria-haspopup': 'true',
          'aria-expanded': 'false',
          'aria-controls': menuId,
          'data-fid': `more:${controller.keyOf(e)}`,
        },
        'more',
        true,
      );
      return b;
    }
    const menuId = (menu.id = uid('files-menu'));

    function checkbox(e: AnyEntry): HTMLElement {
      return h(
        'label',
        { class: 'eds-check' },
        h('input', {
          type: 'checkbox',
          class: 'eds-checkbox',
          'aria-label': fill(T().filesSelectItem, { name: e.name }),
          'data-files-check': controller.keyOf(e),
          'data-fid': `check:${controller.keyOf(e)}`,
        }),
      );
    }

    function renderTable(s: FilesState, t: FilesTexts): HTMLElement {
      const trash = s.mode === 'trash';
      const table = h('table', {
        class: 'eds-table eds-table-fit eds-table-wrap-text eds-files-table',
      });
      table.append(
        h(
          'caption',
          { class: 'eds-visually-hidden' },
          trash
            ? t.filesTrashCaption
            : fill(t.filesTableCaption, {
                name: s.path === '/' ? controller.rootLabel : baseName(s.path),
              }),
        ),
      );
      const headRow = h('tr');
      headRow.append(
        h(
          'th',
          { scope: 'col', class: 'eds-table-check' },
          h(
            'label',
            { class: 'eds-check' },
            h('input', {
              type: 'checkbox',
              class: 'eds-checkbox',
              'aria-label': t.filesSelectAll,
              'data-files-select-all': '',
            }),
          ),
        ),
      );
      const cols = trash
        ? [
            { label: t.filesColName, cls: '' },
            { label: t.filesColOrigin, cls: 'eds-table-hide-narrow' },
            { label: t.filesColDeleted, cls: 'eds-table-hide-narrow' },
            { label: t.filesColSize, cls: '' },
          ]
        : null;
      if (cols) {
        for (const c of cols)
          headRow.append(h('th', { scope: 'col', class: c.cls || null }, c.label));
      } else {
        for (const col of SORTABLE) {
          const active = s.sort.key === col.key;
          const th = h('th', {
            scope: 'col',
            class: col.narrow ? 'eds-table-hide-narrow' : null,
            'aria-sort': active ? (s.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none',
          });
          const b = h(
            'button',
            {
              type: 'button',
              class: 'eds-table-sort',
              'data-act': 'sort',
              'data-sort': col.key,
              'data-fid': `sort:${col.key}`,
            },
            t[col.text],
          );
          b.append(sortIcon());
          th.append(b);
          headRow.append(th);
        }
      }
      headRow.append(
        h(
          'th',
          { scope: 'col', class: 'eds-table-actions' },
          h('span', { class: 'eds-visually-hidden' }, t.filesColActions),
        ),
      );
      table.append(h('thead', {}, headRow));
      const tbody = h('tbody');
      for (const e of s.items) {
        const key = controller.keyOf(e);
        const tr = h('tr', { 'data-key': key, draggable: trash ? null : 'true' });
        tr.append(h('td', { class: 'eds-table-check' }, checkbox(e)));
        tr.append(h('td', { class: 'eds-files-name-cell' }, nameCell(e, s)));
        if (trash) {
          const te = e as TrashEntry;
          tr.append(
            h('td', { class: 'eds-table-hide-narrow' }, te.originalPath),
            h('td', { class: 'eds-table-hide-narrow' }, formatDateTime(te.deletedAt)),
            h('td', {}, e.type === 'folder' ? '' : formatSize(e.size)),
          );
        } else {
          const kind = entryKind(e);
          tr.append(
            h('td', {}, e.type === 'folder' ? '' : formatSize(e.size)),
            h(
              'td',
              { class: 'eds-table-hide-narrow' },
              e.modified ? h('time', { datetime: e.modified }, formatDateTime(e.modified)) : '',
            ),
            h('td', { class: 'eds-table-hide-narrow' }, t[KIND_TEXT[kind] ?? 'filesTypeOther']),
          );
        }
        tr.append(h('td', { class: 'eds-table-actions' }, moreButton(e)));
        tbody.append(tr);
      }
      table.append(tbody);
      const wrap = h('div', { class: 'eds-table-wrap eds-files-table-wrap' }, table);
      return wrap;
    }

    function renderGrid(s: FilesState, t: FilesTexts): HTMLElement {
      const ul = h('ul', {
        class: 'eds-files-grid',
        'aria-label': fill(t.filesTableCaption, {
          name: s.path === '/' ? controller.rootLabel : baseName(s.path),
        }),
      });
      for (const e of s.items) {
        const kind = entryKind(e);
        const key = controller.keyOf(e);
        const thumb = h('span', { class: 'eds-files-thumb', 'aria-hidden': 'true' });
        if (e.thumbnailUrl)
          thumb.append(h('img', { src: e.thumbnailUrl, alt: '', loading: 'lazy' }));
        else
          thumb.append(
            icon(kind === 'folder' ? 'folder' : kind, `eds-files-icon eds-files-icon-${kind}`),
          );
        const meta =
          e.type === 'folder'
            ? t.filesTypeFolder
            : [formatSize(e.size), e.modified ? formatDateTime(e.modified) : '']
                .filter(Boolean)
                .join(' · ');
        const link = h(
          'a',
          {
            class: 'eds-files-link eds-files-card-main',
            href: linkHref(e),
            ...(e.type === 'folder'
              ? { 'data-drop-path': e.path }
              : { target: '_blank', rel: 'noopener' }),
            'data-act': 'open',
            'data-fid': `link:${key}`,
          },
          thumb,
          h('span', { class: 'eds-files-label' }, e.name),
          h('span', { class: 'eds-files-meta' }, meta),
        );
        ul.append(
          h(
            'li',
            { class: 'eds-files-card', 'data-key': key, draggable: 'true' },
            h('span', { class: 'eds-files-card-check' }, checkbox(e)),
            link,
            h('span', { class: 'eds-files-card-more' }, moreButton(e)),
          ),
        );
      }
      return ul;
    }

    function renderContent(s: FilesState, t: FilesTexts): void {
      const active = doc.activeElement;
      const fid =
        active instanceof HTMLElement && content.contains(active)
          ? active.getAttribute('data-fid')
          : null;
      const hadFocus = active instanceof HTMLElement && content.contains(active);
      content.setAttribute('aria-busy', String(s.status === 'loading'));
      if (s.status === 'loading') content.replaceChildren(skeleton(t));
      else if (s.status === 'error') content.replaceChildren(stateBlock('error', s, t));
      else if (s.status === 'forbidden') content.replaceChildren(stateBlock('forbidden', s, t));
      else if (s.items.length === 0) content.replaceChildren(stateBlock('empty', s, t));
      else
        content.replaceChildren(
          s.view === 'grid' && s.mode === 'folder' ? renderGrid(s, t) : renderTable(s, t),
        );
      more.hidden = !s.nextCursor;
      moreBtn.toggleAttribute('aria-busy', s.loadingMore);
      moreBtn.setAttribute('aria-busy', String(s.loadingMore));
      if (hadFocus) {
        const target = fid
          ? content.querySelector<HTMLElement>(`[data-fid="${CSS.escape(fid)}"]`)
          : null;
        (
          target ??
          content.querySelector<HTMLElement>('.eds-files-link, button, input') ??
          aside.querySelector<HTMLElement>('[tabindex="0"]')
        )?.focus();
      }
      last.selection = null; // força a sincronização da seleção sobre o novo DOM
    }

    function renderUploads(s: FilesState, t: FilesTexts): void {
      uploadsPanel.hidden = s.uploads.length === 0;
      uploadsList.replaceChildren(...s.uploads.map((j) => uploadItem(j, t)));
    }

    function uploadItem(j: UploadJob, t: FilesTexts): HTMLElement {
      const pct =
        j.size > 0 ? Math.round((j.loaded / j.size) * 100) : j.status === 'done' ? 100 : 0;
      const statusText =
        j.status === 'done'
          ? t.filesUploadDone
          : j.status === 'queued'
            ? t.filesUploadWaiting
            : j.status === 'error'
              ? (j.error ?? '')
              : j.status === 'canceled'
                ? t.filesErrAborted
                : `${pct}%`;
      const li = h('li', { class: 'eds-files-upload', 'data-status': j.status, 'data-id': j.id });
      li.append(h('span', { class: 'eds-files-upload-name' }, j.name));
      if (j.status === 'uploading' || j.status === 'done') {
        li.append(
          h(
            'progress',
            { class: 'eds-progress eds-progress-sm', value: pct, max: 100, 'aria-label': j.name },
            `${pct}%`,
          ),
        );
      }
      li.append(h('span', { class: 'eds-files-upload-status' }, statusText));
      if (j.status === 'uploading' || j.status === 'queued') {
        li.append(
          button(
            fill(t.filesUploadCancel, { name: j.name }),
            {
              class: 'eds-button eds-button-ghost eds-button-icon eds-button-sm',
              'data-act': 'upload-cancel',
              'data-id': j.id,
            },
            'close',
            true,
          ),
        );
      } else if (j.status === 'error' || j.status === 'canceled') {
        li.append(
          button(t.filesRetry, {
            class: 'eds-button eds-button-ghost eds-button-sm',
            'data-act': 'upload-retry',
            'data-id': j.id,
          }),
        );
      }
      return li;
    }

    /** Marca as linhas selecionadas, a barra de lote e os itens recortados. */
    function syncSelection(s: FilesState, t: FilesTexts): void {
      const sig = `${s.selection.join('|')}#${s.clipboard?.mode ?? ''}${s.clipboard?.paths.join('|') ?? ''}#${s.mode}#${s.caps.write}#${s.readOnly}`;
      if (last.selection === sig) return;
      last.selection = sig;
      const picked = new Set(s.selection);
      const cut = new Set(s.clipboard?.mode === 'cut' ? s.clipboard.paths : []);
      for (const row of content.querySelectorAll<HTMLElement>('[data-key]')) {
        const key = row.getAttribute('data-key') ?? '';
        const box = row.querySelector<HTMLInputElement>('input[data-files-check]');
        if (box) box.checked = picked.has(key);
        row.toggleAttribute('data-selected', picked.has(key));
        row.toggleAttribute('data-cut', cut.has(key));
      }
      const all = content.querySelector<HTMLInputElement>('input[data-files-select-all]');
      if (all) {
        all.checked = s.items.length > 0 && picked.size === s.items.length;
        all.indeterminate = picked.size > 0 && picked.size < s.items.length;
      }
      const n = s.selection.length;
      bulk.hidden = n === 0;
      bulkCount.textContent =
        n === 1 ? t.filesBulkCountOne : fill(t.filesBulkCountMany, { count: n });
      bulkActions.replaceChildren();
      if (n > 0) {
        const entries = controller.entriesOf(s.selection);
        const available = controller
          .actionsFor(entries)
          .filter(
            (a) =>
              a !== 'open' && a !== 'rename' && a !== 'versions' && a !== 'cut' && a !== 'copy',
          );
        for (const action of available) {
          const danger = action === 'delete' || action === 'deleteForever';
          bulkActions.append(
            button(t[ACTION_TEXT[action]], {
              class: `eds-button eds-button-sm ${danger ? 'eds-button-danger' : 'eds-button-secondary'}`,
              'data-act': 'bulk',
              'data-action': action,
            }),
          );
        }
        bulkActions.append(
          button(t.filesBulkClear, {
            class: 'eds-button eds-button-ghost eds-button-sm',
            'data-act': 'clear',
          }),
        );
      }
    }

    // ---- eventos -----------------------------------------------------------------------------
    controller.subscribe(scheduleRender);

    root.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element;
        const el = target.closest<HTMLElement>('[data-act]');
        if (!el || !root.contains(el) || el.closest('dialog')) return;
        const act = el.getAttribute('data-act');
        const row = el.closest<HTMLElement>('[data-key]');
        const entry = row ? byKey(row.getAttribute('data-key') ?? '') : undefined;
        switch (act) {
          case 'open':
            if (event.ctrlKey || event.metaKey || event.shiftKey || !entry) return;
            event.preventDefault();
            if (entry.type === 'folder') go(entry.path);
            else controller.open(entry);
            break;
          case 'crumb':
            event.preventDefault();
            go(el.getAttribute('data-path') ?? '/');
            break;
          case 'sort':
            controller.setSort(el.getAttribute('data-sort') as 'name');
            break;
          case 'menu':
            if (!entry) return;
            if (menu.matches(':popover-open') && menuTrigger === el) return void hidePopover(menu);
            {
              const r = el.getBoundingClientRect();
              openMenu(
                targetsFor(entry),
                { x: doc.documentElement.dir === 'rtl' ? r.right - 180 : r.left, y: r.bottom + 4 },
                el,
              );
            }
            break;
          case 'view-list':
            controller.setView('list');
            break;
          case 'view-grid':
            controller.setView('grid');
            break;
          case 'new-folder':
            void nameDialog('create', null, el);
            break;
          case 'upload':
            fileInput.click();
            break;
          case 'paste':
            void controller.paste();
            break;
          case 'trash':
            void (st().mode === 'trash' ? controller.closeTrash() : controller.openTrash());
            break;
          case 'empty-trash':
            void controller.emptyTrash();
            break;
          case 'tree-open':
            treeDrawer(el);
            break;
          case 'retry':
            void controller.refresh();
            break;
          case 'more':
            void controller.loadMore();
            break;
          case 'bulk':
            void perform(
              el.getAttribute('data-action') as FilesAction,
              controller.entriesOf(st().selection),
              el,
            );
            break;
          case 'clear':
            controller.clearSelection();
            break;
          case 'upload-cancel':
            controller.cancelUpload(el.getAttribute('data-id') ?? '');
            break;
          case 'upload-retry':
            controller.retryUpload(el.getAttribute('data-id') ?? '');
            break;
          case 'dismiss-uploads':
            controller.dismissUploads();
            break;
        }
      },
      { signal },
    );

    root.addEventListener(
      'change',
      (event) => {
        const target = event.target as HTMLInputElement;
        if (target === fileInput) {
          const picked = Array.from(fileInput.files ?? []);
          fileInput.value = '';
          controller.upload(picked);
        } else if (target.hasAttribute('data-files-check')) {
          controller.toggle(target.getAttribute('data-files-check') ?? '');
        } else if (target.hasAttribute('data-files-select-all')) {
          if (target.checked) controller.selectAll();
          else controller.clearSelection();
        } else if (target === recursiveBox) {
          controller.setQuery(searchInput.value, recursiveBox.checked);
        }
      },
      { signal },
    );

    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    searchInput.addEventListener(
      'input',
      () => {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(
          () => controller.setQuery(searchInput.value, recursiveBox.checked),
          250,
        );
      },
      { signal },
    );
    searchInput.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (searchTimer) clearTimeout(searchTimer);
          controller.setQuery(searchInput.value, recursiveBox.checked);
        }
      },
      { signal },
    );

    // Menu de contexto (botão direito, Shift+F10 e tecla Menu geram `contextmenu`).
    content.addEventListener(
      'contextmenu',
      (event) => {
        const row = (event.target as Element).closest<HTMLElement>('[data-key]');
        const entry = row ? byKey(row.getAttribute('data-key') ?? '') : undefined;
        if (!entry) return;
        event.preventDefault();
        const mouse = event.clientX !== 0 || event.clientY !== 0;
        const rect = row!.getBoundingClientRect();
        openMenu(
          targetsFor(entry),
          mouse ? { x: event.clientX, y: event.clientY } : { x: rect.left + 16, y: rect.bottom },
          null,
        );
      },
      { signal },
    );

    // Teclado
    root.addEventListener(
      'keydown',
      (event) => {
        const target = event.target as HTMLElement;
        if (target.closest('dialog, [popover]')) return;
        const inField = target.matches('input:not([type="checkbox"]), textarea, select');
        const inContent = main.contains(target);
        const inTree = aside.contains(target);
        const mod = event.ctrlKey || event.metaKey;
        const s = st();
        const key = event.key;
        if (inField) return;
        if (inContent && mod && key.toLowerCase() === 'a') {
          event.preventDefault();
          controller.selectAll();
        } else if (inContent && mod && key.toLowerCase() === 'x') {
          event.preventDefault();
          controller.cut(currentTargets() as FileEntry[]);
        } else if (inContent && mod && key.toLowerCase() === 'c') {
          event.preventDefault();
          controller.copy(currentTargets() as FileEntry[]);
        } else if ((inContent || inTree) && mod && key.toLowerCase() === 'v') {
          event.preventDefault();
          void controller.paste();
        } else if (inContent && key === 'Delete') {
          const targets = currentTargets();
          if (targets.length === 0) return;
          event.preventDefault();
          void perform(
            s.mode === 'trash' ? 'deleteForever' : 'delete',
            targets,
            rowFocusTarget(controller.keyOf(targets[0]!)),
          );
        } else if (inContent && key === 'F2') {
          const targets = currentTargets();
          if (targets.length !== 1 || !controller.can('rename', targets)) return;
          event.preventDefault();
          void perform('rename', targets, rowFocusTarget(controller.keyOf(targets[0]!)));
        } else if (
          (inContent || inTree) &&
          s.mode === 'folder' &&
          s.path !== '/' &&
          (key === 'Backspace' || (event.altKey && key === 'ArrowUp'))
        ) {
          event.preventDefault();
          go(parentOf(s.path));
        } else if (inContent && key === 'Escape' && s.selection.length > 0) {
          controller.clearSelection();
        } else if (
          inContent &&
          target.matches('.eds-files-link') &&
          ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)
        ) {
          const links = Array.from(content.querySelectorAll<HTMLElement>('.eds-files-link'));
          const i = links.indexOf(target);
          const next =
            key === 'Home'
              ? 0
              : key === 'End'
                ? links.length - 1
                : i + (key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1);
          const dest = links[Math.max(0, Math.min(links.length - 1, next))];
          if (dest && dest !== target) {
            event.preventDefault();
            dest.focus();
          }
        }
      },
      { signal },
    );

    // Arrastar e soltar (a alternativa por teclado é o menu, Recortar/Colar e "Mover para…")
    let dragged: FileEntry[] | null = null;
    const dropTargetOf = (el: Element | null): HTMLElement | null =>
      el?.closest<HTMLElement>('[data-drop-path]') ?? null;
    const clearDrop = () => {
      for (const el of root.querySelectorAll('[data-drop-target]'))
        el.removeAttribute('data-drop-target');
      root.removeAttribute('data-dragging');
    };
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

    root.addEventListener(
      'dragstart',
      (event) => {
        const row = (event.target as Element).closest<HTMLElement>('[data-key]');
        const entry = row ? byKey(row.getAttribute('data-key') ?? '') : undefined;
        if (
          !entry ||
          'trashId' in entry ||
          !event.dataTransfer ||
          !controller.can('move', [entry])
        ) {
          return event.preventDefault();
        }
        dragged = targetsFor(entry) as FileEntry[];
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData(MIME_FILES, JSON.stringify(dragged.map((d) => d.path)));
        event.dataTransfer.setData('text/plain', dragged.map((d) => d.name).join('\n'));
        row!.setAttribute('data-dragging', '');
      },
      { signal },
    );
    root.addEventListener(
      'dragend',
      () => {
        dragged = null;
        for (const el of root.querySelectorAll('[data-dragging]'))
          el.removeAttribute('data-dragging');
        clearDrop();
      },
      { signal },
    );
    root.addEventListener(
      'dragover',
      (event) => {
        const external = hasFiles(event);
        if (!dragged && !external) return;
        const zone = dropTargetOf(event.target as Element);
        const targetPath = zone?.getAttribute('data-drop-path') ?? st().path;
        const ok = dragged
          ? !!zone &&
            controller.canDrop(
              dragged.map((d) => d.path),
              targetPath,
            )
          : controller.getState().caps.write && !st().readOnly && st().mode === 'folder';
        if (!ok) return;
        event.preventDefault();
        if (event.dataTransfer)
          event.dataTransfer.dropEffect = dragged
            ? event.ctrlKey || event.altKey
              ? 'copy'
              : 'move'
            : 'copy';
        for (const el of root.querySelectorAll('[data-drop-target]'))
          if (el !== zone) el.removeAttribute('data-drop-target');
        if (zone) zone.setAttribute('data-drop-target', 'inside');
        if (external) {
          root.setAttribute('data-dragging', 'files');
          const text = main.querySelector<HTMLElement>('[data-files-drop-text]');
          if (text)
            text.textContent = zone
              ? fill(T().filesDropInto, {
                  name:
                    zone.getAttribute('data-drop-path') === '/'
                      ? controller.rootLabel
                      : baseName(zone.getAttribute('data-drop-path') ?? ''),
                })
              : T().filesDropHint;
        }
      },
      { signal },
    );
    root.addEventListener(
      'dragleave',
      (event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !root.contains(next)) clearDrop();
      },
      { signal },
    );
    root.addEventListener(
      'drop',
      (event) => {
        const zone = dropTargetOf(event.target as Element);
        const targetPath = zone?.getAttribute('data-drop-path') ?? st().path;
        const external = hasFiles(event);
        if (!dragged && !external) return;
        event.preventDefault();
        const moving = dragged;
        clearDrop();
        if (moving) {
          dragged = null;
          if (
            zone &&
            controller.canDrop(
              moving.map((d) => d.path),
              targetPath,
            )
          ) {
            void controller.transfer(moving, targetPath, event.ctrlKey || event.altKey);
          }
        } else if (event.dataTransfer) {
          const items = Array.from(event.dataTransfer.items ?? []);
          // Pastas soltas do sistema não são enviadas (só arquivos).
          const filesOnly = items.length
            ? items
                .filter((i) => i.kind === 'file' && !i.webkitGetAsEntry?.()?.isDirectory)
                .map((i) => i.getAsFile())
                .filter((f): f is File => f !== null)
            : Array.from(event.dataTransfer.files);
          controller.upload(filesOnly, targetPath);
        }
      },
      { signal },
    );

    // ---- API e partida -----------------------------------------------------------------------
    handles.set(root, {
      navigate: (path) => controller.navigate(path),
      refresh: () => controller.refresh(),
      select: (ids) => controller.select(ids),
      upload: (list) => controller.upload(list),
      get path() {
        return controller.getState().path;
      },
      get selection() {
        return controller.getState().selection;
      },
    });
    render();
    void controller.start();

    return () => {
      ac.abort();
      announcer.dispose();
      if (searchTimer) clearTimeout(searchTimer);
      controller.destroy();
      handles.delete(root);
      hidePopover(menu);
      for (const d of root.querySelectorAll('dialog[data-files-dialog]')) {
        (d as HTMLDialogElement).close();
        d.remove();
      }
      root.replaceChildren();
      root.classList.remove('eds-files');
    };
  },
};

/** Liga os gerenciadores de arquivos de `root` (e os que entrarem depois). */
export function initFiles(root: ParentNode = document): () => void {
  return bindAll(root, [filesBehavior]);
}
