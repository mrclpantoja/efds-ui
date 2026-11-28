import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  createFilesController,
  defaultFilesTexts,
  filesEntryKind,
  formatFilesDate,
  formatFilesSize,
  fillTemplate,
  parentOf,
  pathBaseName,
  type AnyEntry,
  type ConflictAnswer,
  type FilesAction,
  type FilesController,
  type FilesEventName,
  type FilesTexts,
  type FilesUi,
  type UploadJob,
} from '@efds-ui/behavior/internal';
import {
  createHttpAdapter,
  type FileEntry,
  type FilesAdapter,
  type FileVersion,
  type TrashEntry,
} from '@efds-ui/behavior/files';
import { useAnnouncer } from '../../internal/announcer';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { FileViewer, useFileViewer } from '../FileViewer';
import { useLocale } from '../Locale';
import { useOptionalToast } from '../Toast/Toast';
import {
  ConfirmDialog,
  ConflictDialog,
  NameDialog,
  PickDialog,
  TreeDrawer,
  VersionsDrawer,
} from './dialogs';
import { FilesGlyph } from './FilesGlyph';
import { FolderTree } from './FolderTree';

export type { FilesTexts, FileEntry, FilesAdapter };

const MIME_FILES = 'application/x-eds-files';

export interface FileManagerChange {
  action: string;
  items: unknown[];
  target?: string;
}

export interface FileManagerError {
  action: string;
  status: number;
  error: Error;
}

export interface FileManagerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'onError' | 'children' | 'defaultValue'
> {
  /** URL base da API do sistema (contrato 4 do guia). Sem `api` nem `adapter`, nada é requisitado. */
  api?: string;
  /** Adaptador próprio (GraphQL, tRPC, demos). Tem prioridade sobre `api`. */
  adapter?: FilesAdapter;
  /** Pasta aberta (controlada). */
  path?: string;
  defaultPath?: string;
  onPathChange?: (path: string) => void;
  view?: 'list' | 'grid';
  defaultView?: 'list' | 'grid';
  onViewChange?: (view: 'list' | 'grid') => void;
  /** Esconde as ações de escrita. */
  readOnly?: boolean;
  /** Nome da raiz na trilha. Padrão: "Arquivos". */
  rootLabel?: string;
  /** Textos internos (padrões em pt-BR). Modelos com `{chave}`. */
  texts?: Partial<FilesTexts>;
  /** Ao abrir um arquivo. Devolver `false` impede o visualizador. */
  onOpen?: (entry: FileEntry) => boolean | void;
  /** Depois de cada operação (`createFolder`, `rename`, `move`, `copy`, `delete`, `upload`...). */
  onChange?: (change: FileManagerChange) => void;
  onError?: (error: FileManagerError) => void;
  /** Cabeçalhos e credenciais do cliente HTTP (CSRF, token). Só vale com `api`. */
  requestInit?: {
    headers?: Record<string, string> | (() => Record<string, string>);
    credentials?: RequestCredentials;
  };
}

const SORT_COLUMNS = [
  { key: 'name', text: 'filesColName', narrow: false },
  { key: 'size', text: 'filesColSize', narrow: false },
  { key: 'modified', text: 'filesColModified', narrow: true },
  { key: 'type', text: 'filesColType', narrow: true },
] as const;

const KIND_TEXT = {
  folder: 'filesTypeFolder',
  pdf: 'filesTypePdf',
  image: 'filesTypeImage',
  video: 'filesTypeVideo',
  audio: 'filesTypeAudio',
  text: 'filesTypeText',
  other: 'filesTypeOther',
} as const;

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

type DialogState =
  | { kind: 'name'; mode: 'create' | 'rename'; entry: FileEntry | null }
  | {
      kind: 'conflict';
      name: string;
      remaining: number;
      resolve: (a: ConflictAnswer | null) => void;
    }
  | {
      kind: 'confirm';
      title: string;
      text: string;
      confirmLabel: string;
      tone: 'danger' | 'info';
      resolve: (ok: boolean) => void;
    }
  | { kind: 'pick'; entries: FileEntry[]; copy: boolean }
  | { kind: 'versions'; entry: FileEntry }
  | { kind: 'tree' };

interface MenuState {
  keys: string[];
  x: number;
  y: number;
  /** Chave do item cujo botão "⋯" abriu o menu (a trilha do foco), se houver. */
  triggerKey: string | null;
}

/**
 * Gerenciador de arquivos: pastas, lista ou grade, envio, mover/copiar, lixeira e versões, sobre a
 * API do sistema (`api`) ou um `adapter`. Markup do core (`.eds-files`), a mesma lógica do HTML.
 * Toasts e "Desfazer" usam o `ToastProvider` mais próximo; sem ele, a exclusão só é anunciada.
 */
export const FileManager = forwardRef<HTMLDivElement, FileManagerProps>(
  function FileManager(props, ref) {
    const { api, adapter: adapterProp, requestInit } = props;
    const credentials = requestInit?.credentials;
    const headersRef = useRef(requestInit);
    useEffect(() => {
      headersRef.current = requestInit;
    });
    const adapter = useMemo<FilesAdapter | null>(
      () =>
        adapterProp ??
        (api
          ? // O ref é lido só na hora da requisição, nunca na renderização.
            // eslint-disable-next-line react-hooks/refs
            createHttpAdapter(api, {
              headers: () => {
                const h = headersRef.current?.headers;
                return typeof h === 'function' ? h() : (h ?? {});
              },
              credentials,
            })
          : null),
      [adapterProp, api, credentials],
    );
    if (!adapter) {
      const t = mergeTexts(defaultFilesTexts, props.texts);
      return (
        <div
          ref={ref}
          className={cx('eds-files', props.className)}
          aria-label={props['aria-label'] ?? t.filesLabel}
          role="region"
        />
      );
    }
    const managerProps = { ...props };
    delete managerProps.api;
    delete managerProps.requestInit;
    return <Manager {...managerProps} adapter={adapter} forwardedRef={ref} />;
  },
);
FileManager.displayName = 'FileManager';

function Manager({
  adapter,
  forwardedRef,
  path: pathProp,
  defaultPath = '/',
  onPathChange,
  view: viewProp,
  defaultView = 'list',
  onViewChange,
  readOnly = false,
  rootLabel,
  texts,
  onOpen,
  onChange,
  onError,
  className,
  ...rest
}: Omit<FileManagerProps, 'api' | 'requestInit'> & {
  adapter: FilesAdapter;
  forwardedRef: ForwardedRef<HTMLDivElement>;
}) {
  const locale = useLocale();
  const toastApi = useOptionalToast();
  const t = useMemo(() => mergeTexts(defaultFilesTexts, texts), [texts]);
  const viewer = useFileViewer();
  const announcer = useAnnouncer();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [controller, setController] = useState<FilesController | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(forwardedRef, () => rootRef.current as HTMLDivElement);
  const menuRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusHeading = useRef(false);
  const dragged = useRef<FileEntry[] | null>(null);
  const [dragFiles, setDragFiles] = useState<string | null>(null);
  const [dropPath, setDropPath] = useState<string | null>(null);
  const [recursive, setRecursive] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  // Valores recentes para os ganchos estáveis do controlador.
  const latest = useRef({
    t,
    toastApi,
    announcer,
    viewer,
    locale,
    onOpen,
    onChange,
    onError,
    onPathChange,
  });
  useEffect(() => {
    latest.current = {
      t,
      toastApi,
      announcer,
      viewer,
      locale,
      onOpen,
      onChange,
      onError,
      onPathChange,
    };
  });

  const initialPath = useRef(pathProp ?? defaultPath);

  useEffect(() => {
    const ui: FilesUi = {
      announce: (text) => latest.current.announcer.announce(text),
      toast: (o) => {
        latest.current.toastApi?.show({
          tone: o.tone,
          message: o.message,
          duration: o.duration,
          action: o.action,
        });
      },
      confirm: (o) =>
        new Promise<boolean>((resolve) => {
          setDialog({ kind: 'confirm', ...o, resolve: (ok) => (setDialog(null), resolve(ok)) });
        }),
      resolveConflict: (o) =>
        new Promise<ConflictAnswer | null>((resolve) => {
          setDialog({
            kind: 'conflict',
            name: o.name,
            remaining: o.remaining,
            resolve: (a) => (setDialog(null), resolve(a)),
          });
        }),
      view: (items, index) => latest.current.viewer.open(items, index),
    };
    const c = createFilesController({
      adapter,
      ui,
      texts: () => latest.current.t,
      locale: () => latest.current.locale,
      path: initialPath.current,
      view: defaultView,
      readOnly,
      rootLabel,
      onEvent: (name: FilesEventName, detail) => {
        const cur = latest.current;
        if (name === 'navigate') cur.onPathChange?.(detail.path as string);
        else if (name === 'open') return cur.onOpen?.(detail.item as FileEntry) !== false;
        else if (name === 'change') cur.onChange?.(detail as unknown as FileManagerChange);
        else if (name === 'error') cur.onError?.(detail as unknown as FileManagerError);
        return undefined;
      },
    });
    setController(c);
    void c.start();
    return () => {
      c.destroy();
      setController(null);
    };
    // O controlador vive enquanto o adaptador, o modo e a raiz forem os mesmos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, readOnly, rootLabel]);

  const state = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    () => controller?.getState() ?? null,
    () => null,
  );

  // Caminho e modo de exibição controlados.
  useEffect(() => {
    if (controller && pathProp !== undefined && pathProp !== controller.getState().path) {
      void controller.navigate(pathProp);
    }
  }, [controller, pathProp]);
  useEffect(() => {
    if (controller && viewProp && viewProp !== controller.getState().view)
      controller.setView(viewProp);
  }, [controller, viewProp]);
  const viewNow = state?.view;
  const lastView = useRef(viewNow);
  useEffect(() => {
    if (viewNow && lastView.current !== viewNow) {
      lastView.current = viewNow;
      onViewChange?.(viewNow);
    }
  }, [viewNow, onViewChange]);

  // Depois de navegar, o foco vai para o título da pasta.
  useEffect(() => {
    if (focusHeading.current && state && state.status !== 'loading') {
      focusHeading.current = false;
      headingRef.current?.focus();
    }
  });

  const go = useCallback(
    (path: string) => {
      focusHeading.current = true;
      void controller?.navigate(path);
    },
    [controller],
  );

  // Menu: abre o popover e posiciona por variáveis CSS.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    if (menu) {
      el.style.setProperty('--_files-menu-x', `${Math.round(menu.x)}px`);
      el.style.setProperty('--_files-menu-y', `${Math.round(menu.y)}px`);
      try {
        el.showPopover();
      } catch {
        /* sem Popover API */
      }
      const rect = el.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      if (menu.x > maxX)
        el.style.setProperty('--_files-menu-x', `${Math.max(8, Math.round(maxX))}px`);
      if (menu.y > maxY)
        el.style.setProperty('--_files-menu-y', `${Math.max(8, Math.round(maxY))}px`);
      el.querySelector<HTMLElement>('button')?.focus();
    }
  }, [menu]);

  // Popover manual: clique fora fecha (o toast e outros popovers não o fecham).
  useEffect(() => {
    if (!menu) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[aria-haspopup="true"]')) return;
      try {
        menuRef.current?.hidePopover();
      } catch {
        /* já fechado */
      }
      setMenu(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menu]);

  const closeMenu = useCallback(() => {
    try {
      menuRef.current?.hidePopover();
    } catch {
      /* já fechado */
    }
    setMenu(null);
  }, []);

  const focusFallback = useCallback(() => headingRef.current, []);
  const rowLink = (key: string | undefined): HTMLElement | null =>
    key
      ? (rootRef.current?.querySelector<HTMLElement>(`[data-fid="link:${CSS.escape(key)}"]`) ??
        null)
      : null;

  if (!controller || !state) {
    return (
      <div
        ref={rootRef}
        className={cx('eds-files', className)}
        role="region"
        aria-label={rest['aria-label'] ?? t.filesLabel}
        data-state="loading"
      />
    );
  }

  const s = state;
  const writable = s.caps.write && !s.readOnly;
  const trash = s.mode === 'trash';
  const keyOf = controller.keyOf;

  const targetsFor = (entry: AnyEntry): AnyEntry[] =>
    s.selection.includes(keyOf(entry)) && s.selection.length > 1
      ? controller.entriesOf(s.selection)
      : [entry];

  const focusedEntry = (): AnyEntry | undefined => {
    const row = (document.activeElement as Element | null)?.closest<HTMLElement>('[data-key]');
    const key = row?.getAttribute('data-key');
    return key ? s.items.find((e) => keyOf(e) === key) : undefined;
  };
  const currentTargets = (): AnyEntry[] => {
    const f = focusedEntry();
    return f ? targetsFor(f) : controller.entriesOf(s.selection);
  };

  const download = (entries: AnyEntry[]) => {
    entries
      .filter((e): e is FileEntry => e.type === 'file' && !('trashId' in e))
      .forEach((e, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = controller.downloadUrl(e);
          a.download = e.name;
          a.hidden = true;
          rootRef.current?.append(a);
          a.click();
          a.remove();
        }, i * 150);
      });
  };

  const perform = async (action: FilesAction, entries: AnyEntry[]): Promise<void> => {
    if (entries.length === 0) return;
    const files = entries as FileEntry[];
    switch (action) {
      case 'open':
        if (files[0]!.type === 'folder') go(files[0]!.path);
        else controller.open(files[0]!);
        break;
      case 'download':
        download(entries);
        break;
      case 'rename':
        setDialog({ kind: 'name', mode: 'rename', entry: files[0]! });
        break;
      case 'cut':
        controller.cut(files);
        break;
      case 'copy':
        controller.copy(files);
        break;
      case 'move':
      case 'copyTo':
        setDialog({ kind: 'pick', entries: files, copy: action === 'copyTo' });
        break;
      case 'versions':
        setDialog({ kind: 'versions', entry: files[0]! });
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
  };

  const openMenu = (entries: AnyEntry[], x: number, y: number, triggerKey: string | null) => {
    if (controller.actionsFor(entries).length === 0) return;
    setMenu({ keys: entries.map(keyOf), x, y, triggerKey });
  };

  // ---- teclado -----------------------------------------------------------------------------
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('dialog, [popover]')) return;
    if (target.matches('input:not([type="checkbox"]), textarea, select')) return;
    const main = target.closest('.eds-files-main');
    const inTree = !!target.closest('.eds-files-tree');
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key;
    const lower = key.toLowerCase();
    if (main && mod && lower === 'a') {
      event.preventDefault();
      controller.selectAll();
    } else if (main && mod && lower === 'x') {
      event.preventDefault();
      controller.cut(currentTargets() as FileEntry[]);
    } else if (main && mod && lower === 'c') {
      event.preventDefault();
      controller.copy(currentTargets() as FileEntry[]);
    } else if ((main || inTree) && mod && lower === 'v') {
      event.preventDefault();
      void controller.paste();
    } else if (main && key === 'Delete') {
      const targets = currentTargets();
      if (targets.length === 0) return;
      event.preventDefault();
      void perform(trash ? 'deleteForever' : 'delete', targets);
    } else if (main && key === 'F2') {
      const targets = currentTargets();
      if (targets.length !== 1 || !controller.can('rename', targets)) return;
      event.preventDefault();
      void perform('rename', targets);
    } else if (
      (main || inTree) &&
      s.mode === 'folder' &&
      s.path !== '/' &&
      (key === 'Backspace' || (event.altKey && key === 'ArrowUp'))
    ) {
      event.preventDefault();
      go(parentOf(s.path));
    } else if (main && key === 'Escape' && s.selection.length > 0) {
      controller.clearSelection();
    } else if (
      main &&
      target.matches('.eds-files-link') &&
      ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)
    ) {
      const links = Array.from(main.querySelectorAll<HTMLElement>('.eds-files-link'));
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
  };

  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const row = (event.target as Element).closest<HTMLElement>('[data-key]');
    const entry = row ? s.items.find((e) => keyOf(e) === row.getAttribute('data-key')) : undefined;
    if (!row || !entry) return;
    event.preventDefault();
    const mouse = event.clientX !== 0 || event.clientY !== 0;
    const rect = row.getBoundingClientRect();
    openMenu(
      targetsFor(entry),
      mouse ? event.clientX : rect.left + 16,
      mouse ? event.clientY : rect.bottom,
      null,
    );
  };

  // ---- arrastar e soltar -------------------------------------------------------------------
  const zoneOf = (el: EventTarget | null): HTMLElement | null =>
    (el as Element | null)?.closest<HTMLElement>('[data-drop-path]') ?? null;
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  const clearDrop = () => {
    setDropPath(null);
    setDragFiles(null);
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    const row = (event.target as Element).closest<HTMLElement>('[data-key]');
    const entry = row ? s.items.find((e) => keyOf(e) === row.getAttribute('data-key')) : undefined;
    if (!entry || 'trashId' in entry || !controller.can('move', [entry]))
      return event.preventDefault();
    dragged.current = targetsFor(entry) as FileEntry[];
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData(MIME_FILES, JSON.stringify(dragged.current.map((d) => d.path)));
    event.dataTransfer.setData('text/plain', dragged.current.map((d) => d.name).join('\n'));
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const external = hasFiles(event);
    const moving = dragged.current;
    if (!moving && !external) return;
    const zone = zoneOf(event.target);
    const targetPath = zone?.getAttribute('data-drop-path') ?? s.path;
    const ok = moving
      ? !!zone &&
        controller.canDrop(
          moving.map((d) => d.path),
          targetPath,
        )
      : writable && s.mode === 'folder';
    if (!ok) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = moving
      ? event.ctrlKey || event.altKey
        ? 'copy'
        : 'move'
      : 'copy';
    setDropPath(zone ? targetPath : null);
    if (external) setDragFiles(zone ? targetPath : '');
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) clearDrop();
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const external = hasFiles(event);
    const moving = dragged.current;
    if (!moving && !external) return;
    event.preventDefault();
    const zone = zoneOf(event.target);
    const targetPath = zone?.getAttribute('data-drop-path') ?? s.path;
    clearDrop();
    if (moving) {
      dragged.current = null;
      if (
        zone &&
        controller.canDrop(
          moving.map((d) => d.path),
          targetPath,
        )
      ) {
        void controller.transfer(moving, targetPath, event.ctrlKey || event.altKey);
      }
    } else {
      const items = Array.from(event.dataTransfer.items ?? []);
      const files = items.length
        ? items
            .filter((i) => i.kind === 'file' && !i.webkitGetAsEntry?.()?.isDirectory)
            .map((i) => i.getAsFile())
            .filter((f): f is File => f !== null)
        : Array.from(event.dataTransfer.files);
      controller.upload(files, targetPath);
    }
  };

  // ---- partes ------------------------------------------------------------------------------
  const crumbs = trash
    ? [
        { path: '/', label: controller.rootLabel, link: true },
        { path: '', label: t.filesTrash, link: false },
      ]
    : controller.crumbs().map((c, i, all) => ({ ...c, link: i < all.length - 1 }));

  const checkbox = (e: AnyEntry) => (
    <label className="eds-check">
      <input
        type="checkbox"
        className="eds-checkbox"
        aria-label={fillTemplate(t.filesSelectItem, { name: e.name })}
        checked={s.selection.includes(keyOf(e))}
        onChange={() => controller.toggle(keyOf(e))}
        data-fid={`check:${keyOf(e)}`}
      />
    </label>
  );

  const moreButton = (e: AnyEntry) => {
    const open = menu?.triggerKey === keyOf(e);
    return (
      <button
        type="button"
        className="eds-button eds-button-ghost eds-button-icon eds-button-sm"
        aria-label={fillTemplate(t.filesActionsFor, { name: e.name })}
        aria-haspopup="true"
        aria-expanded={open}
        data-fid={`more:${keyOf(e)}`}
        onClick={(ev) => {
          if (open) return closeMenu();
          const r = ev.currentTarget.getBoundingClientRect();
          openMenu(
            targetsFor(e),
            document.documentElement.dir === 'rtl' ? r.right - 180 : r.left,
            r.bottom + 4,
            keyOf(e),
          );
        }}
      >
        <FilesGlyph name="more" />
      </button>
    );
  };

  const nameCell = (e: AnyEntry): ReactNode => {
    const kind = filesEntryKind(e);
    const isTrash = 'trashId' in e;
    const parts = (
      <>
        <FilesGlyph
          name={kind === 'folder' ? 'folder' : kind}
          className={`eds-files-icon eds-files-icon-${kind}`}
        />
        <span className="eds-files-label">{e.name}</span>
        {s.query && s.recursive && !isTrash ? (
          <span className="eds-files-origin">{parentOf(e.path)}</span>
        ) : null}
      </>
    );
    if (isTrash) return <span className="eds-files-name">{parts}</span>;
    const folder = e.type === 'folder';
    return (
      <a
        className="eds-files-link"
        href={folder ? `?path=${encodeURIComponent(e.path)}` : controller.viewUrl(e)}
        target={folder ? undefined : '_blank'}
        rel={folder ? undefined : 'noopener'}
        data-drop-path={folder && writable ? e.path : undefined}
        data-drop-target={dropPath === e.path ? 'inside' : undefined}
        data-fid={`link:${keyOf(e)}`}
        onClick={(ev) => {
          if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
          ev.preventDefault();
          if (folder) go(e.path);
          else controller.open(e);
        }}
      >
        {parts}
      </a>
    );
  };

  const rowAttrs = (e: AnyEntry) => ({
    'data-key': keyOf(e),
    'data-selected': s.selection.includes(keyOf(e)) ? '' : undefined,
    'data-cut': s.clipboard?.mode === 'cut' && s.clipboard.paths.includes(e.path) ? '' : undefined,
    draggable: trash ? undefined : true,
  });

  const allSelected = s.items.length > 0 && s.selection.length === s.items.length;
  const someSelected = s.selection.length > 0 && !allSelected;

  const table = (
    <div className="eds-table-wrap eds-files-table-wrap">
      <table className="eds-table eds-table-fit eds-table-wrap-text eds-files-table">
        <caption className="eds-visually-hidden">
          {trash
            ? t.filesTrashCaption
            : fillTemplate(t.filesTableCaption, {
                name: s.path === '/' ? controller.rootLabel : pathBaseName(s.path),
              })}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="eds-table-check">
              <label className="eds-check">
                <input
                  type="checkbox"
                  className="eds-checkbox"
                  aria-label={t.filesSelectAll}
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(ev) =>
                    ev.target.checked ? controller.selectAll() : controller.clearSelection()
                  }
                />
              </label>
            </th>
            {trash ? (
              <>
                <th scope="col">{t.filesColName}</th>
                <th scope="col" className="eds-table-hide-narrow">
                  {t.filesColOrigin}
                </th>
                <th scope="col" className="eds-table-hide-narrow">
                  {t.filesColDeleted}
                </th>
                <th scope="col">{t.filesColSize}</th>
              </>
            ) : (
              SORT_COLUMNS.map((col) => {
                const active = s.sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={col.narrow ? 'eds-table-hide-narrow' : undefined}
                    aria-sort={
                      active ? (s.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="eds-table-sort"
                      data-fid={`sort:${col.key}`}
                      onClick={() => controller.setSort(col.key)}
                    >
                      {t[col.text]}
                      <svg
                        className="eds-table-sort-icon"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path className="eds-table-sort-up" d="M4.5 6.5 8 3l3.5 3.5" />
                        <path className="eds-table-sort-down" d="M4.5 9.5 8 13l3.5-3.5" />
                      </svg>
                    </button>
                  </th>
                );
              })
            )}
            <th scope="col" className="eds-table-actions">
              <span className="eds-visually-hidden">{t.filesColActions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {s.items.map((e) => {
            const kind = filesEntryKind(e);
            return (
              <tr
                key={keyOf(e)}
                {...rowAttrs(e)}
                data-drop-target={dropPath === e.path && e.type === 'folder' ? 'inside' : undefined}
              >
                <td className="eds-table-check">{checkbox(e)}</td>
                <td className="eds-files-name-cell">{nameCell(e)}</td>
                {trash ? (
                  <>
                    <td className="eds-table-hide-narrow">{(e as TrashEntry).originalPath}</td>
                    <td className="eds-table-hide-narrow">
                      {formatFilesDate((e as TrashEntry).deletedAt, locale)}
                    </td>
                    <td>{e.type === 'folder' ? '' : formatFilesSize(e.size, locale)}</td>
                  </>
                ) : (
                  <>
                    <td>{e.type === 'folder' ? '' : formatFilesSize(e.size, locale)}</td>
                    <td className="eds-table-hide-narrow">
                      {e.modified ? (
                        <time dateTime={e.modified}>{formatFilesDate(e.modified, locale)}</time>
                      ) : null}
                    </td>
                    <td className="eds-table-hide-narrow">{t[KIND_TEXT[kind]]}</td>
                  </>
                )}
                <td className="eds-table-actions">{moreButton(e)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const grid = (
    <ul
      className="eds-files-grid"
      aria-label={fillTemplate(t.filesTableCaption, {
        name: s.path === '/' ? controller.rootLabel : pathBaseName(s.path),
      })}
    >
      {s.items.map((e) => {
        const kind = filesEntryKind(e);
        const meta =
          e.type === 'folder'
            ? t.filesTypeFolder
            : [
                formatFilesSize(e.size, locale),
                e.modified ? formatFilesDate(e.modified, locale) : '',
              ]
                .filter(Boolean)
                .join(' · ');
        return (
          <li key={keyOf(e)} className="eds-files-card" {...rowAttrs(e)}>
            <span className="eds-files-card-check">{checkbox(e)}</span>
            <a
              className="eds-files-link eds-files-card-main"
              href={
                e.type === 'folder' ? `?path=${encodeURIComponent(e.path)}` : controller.viewUrl(e)
              }
              target={e.type === 'folder' ? undefined : '_blank'}
              rel={e.type === 'folder' ? undefined : 'noopener'}
              data-drop-path={e.type === 'folder' && writable ? e.path : undefined}
              data-drop-target={dropPath === e.path ? 'inside' : undefined}
              data-fid={`link:${keyOf(e)}`}
              onClick={(ev) => {
                if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
                ev.preventDefault();
                if (e.type === 'folder') go(e.path);
                else controller.open(e);
              }}
            >
              <span className="eds-files-thumb" aria-hidden="true">
                {e.thumbnailUrl ? (
                  <img src={e.thumbnailUrl} alt="" loading="lazy" />
                ) : (
                  <FilesGlyph
                    name={kind === 'folder' ? 'folder' : kind}
                    className={`eds-files-icon eds-files-icon-${kind}`}
                  />
                )}
              </span>
              <span className="eds-files-label">{e.name}</span>
              <span className="eds-files-meta">{meta}</span>
            </a>
            <span className="eds-files-card-more">{moreButton(e)}</span>
          </li>
        );
      })}
    </ul>
  );

  let content: ReactNode;
  if (s.status === 'loading') {
    content = (
      <div className="eds-files-skeleton">
        <span className="eds-visually-hidden" role="status">
          {t.filesLoading}
        </span>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className="eds-skeleton eds-skeleton-text eds-skeleton-shimmer"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  } else if (s.status === 'error') {
    content = (
      <div className="eds-empty eds-empty-error" role="alert">
        <FilesGlyph name="alert" className="eds-empty-icon" />
        <h3 className="eds-empty-title">{t.filesErrorTitle}</h3>
        <p className="eds-empty-text">
          {s.error ? controller.errorMessage(s.error) : t.filesErrorText}
        </p>
        <div className="eds-empty-actions">
          <Button variant="primary" onClick={() => void controller.refresh()}>
            {t.filesRetry}
          </Button>
        </div>
      </div>
    );
  } else if (s.status === 'forbidden') {
    content = (
      <div className="eds-empty">
        <FilesGlyph name="lock" className="eds-empty-icon" />
        <h3 className="eds-empty-title">{t.filesForbiddenTitle}</h3>
        <p className="eds-empty-text">{t.filesForbiddenText}</p>
      </div>
    );
  } else if (s.items.length === 0) {
    const searching = s.query !== '';
    content = (
      <div className="eds-empty">
        <FilesGlyph name={trash ? 'trash' : 'folder'} className="eds-empty-icon" />
        <h3 className="eds-empty-title">
          {trash ? t.filesTrashEmptyTitle : searching ? t.filesEmptySearchTitle : t.filesEmptyTitle}
        </h3>
        <p className="eds-empty-text">
          {trash
            ? t.filesTrashEmptyText
            : searching
              ? fillTemplate(t.filesEmptySearchText, { query: s.query })
              : t.filesEmptyText}
        </p>
        {!trash && !searching && writable ? (
          <div className="eds-empty-actions">
            <Button variant="primary" onClick={() => fileInput.current?.click()}>
              <FilesGlyph name="upload" />
              {t.filesUpload}
            </Button>
          </div>
        ) : null}
      </div>
    );
  } else {
    content = s.view === 'grid' && !trash ? grid : table;
  }

  const bulkEntries = controller.entriesOf(s.selection);
  const bulkActions = controller
    .actionsFor(bulkEntries)
    .filter((a) => !['open', 'rename', 'versions', 'cut', 'copy'].includes(a));

  const menuEntries = menu ? controller.entriesOf(menu.keys) : [];
  const menuActions = menu ? controller.actionsFor(menuEntries) : [];

  const uploadItem = (j: UploadJob) => {
    const pct = j.size > 0 ? Math.round((j.loaded / j.size) * 100) : j.status === 'done' ? 100 : 0;
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
    return (
      <li key={j.id} className="eds-files-upload" data-status={j.status}>
        <span className="eds-files-upload-name">{j.name}</span>
        {j.status === 'uploading' || j.status === 'done' ? (
          <progress
            className="eds-progress eds-progress-sm"
            value={pct}
            max={100}
            aria-label={j.name}
          >
            {pct}%
          </progress>
        ) : null}
        <span className="eds-files-upload-status">{statusText}</span>
        {j.status === 'uploading' || j.status === 'queued' ? (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={fillTemplate(t.filesUploadCancel, { name: j.name })}
            onClick={() => controller.cancelUpload(j.id)}
          >
            <FilesGlyph name="close" />
          </Button>
        ) : j.status === 'error' || j.status === 'canceled' ? (
          <Button variant="ghost" size="sm" onClick={() => controller.retryUpload(j.id)}>
            {t.filesRetry}
          </Button>
        ) : null}
      </li>
    );
  };

  const headingText = trash
    ? t.filesTrash
    : s.path === '/'
      ? controller.rootLabel
      : pathBaseName(s.path);
  const dropText = dragFiles
    ? fillTemplate(t.filesDropInto, {
        name: dragFiles === '/' ? controller.rootLabel : pathBaseName(dragFiles),
      })
    : t.filesDropHint;

  return (
    // Região com atalhos, arrastar e soltar por delegação: os filhos têm os controles reais.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      {...rest}
      ref={rootRef}
      className={cx('eds-files', className)}
      role="region"
      aria-label={rest['aria-label'] ?? (rest['aria-labelledby'] ? undefined : t.filesLabel)}
      data-view={s.view}
      data-mode={s.mode}
      data-state={s.status}
      data-readonly={s.readOnly || !s.caps.write ? '' : undefined}
      data-dragging={dragFiles !== null ? 'files' : undefined}
      onKeyDown={onKeyDown}
      onDragStart={onDragStart}
      onDragEnd={() => {
        dragged.current = null;
        clearDrop();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="eds-files-toolbar">
        <nav className="eds-breadcrumb eds-files-path" aria-label={t.filesPathLabel}>
          <ol className="eds-breadcrumb-list">
            {crumbs.map((c, i) => (
              <li key={`${c.path}${i}`} className="eds-breadcrumb-item">
                {c.link ? (
                  <a
                    href={`?path=${encodeURIComponent(c.path)}`}
                    data-drop-path={writable && !trash ? c.path : undefined}
                    data-drop-target={dropPath === c.path ? 'inside' : undefined}
                    onClick={(ev) => {
                      ev.preventDefault();
                      go(c.path);
                    }}
                  >
                    {c.label}
                  </a>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="eds-files-tools">
          <div className="eds-files-search" hidden={trash || s.caps.search === 'none'}>
            <input
              ref={searchRef}
              type="search"
              className="eds-input eds-input-sm"
              aria-label={t.filesSearchLabel}
              placeholder={t.filesSearchLabel}
              autoComplete="off"
              onChange={() => {
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(
                  () => controller.setQuery(searchRef.current?.value ?? '', recursive),
                  250,
                );
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault();
                  if (searchTimer.current) clearTimeout(searchTimer.current);
                  controller.setQuery(searchRef.current?.value ?? '', recursive);
                }
              }}
            />
            <label className="eds-check eds-files-recursive" hidden={s.caps.search !== 'recursive'}>
              <input
                type="checkbox"
                className="eds-checkbox"
                checked={recursive}
                onChange={(ev) => {
                  setRecursive(ev.target.checked);
                  controller.setQuery(searchRef.current?.value ?? '', ev.target.checked);
                }}
              />
              {t.filesSearchAll}
            </label>
          </div>
          <div className="eds-files-actions" role="group" aria-label={t.filesLabel}>
            <Button
              variant="secondary"
              size="sm"
              className="eds-files-tree-open"
              onClick={() => setDialog({ kind: 'tree' })}
            >
              <FilesGlyph name="folder" />
              {t.filesTreeOpen}
            </Button>
            {!trash && writable ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDialog({ kind: 'name', mode: 'create', entry: null })}
                >
                  <FilesGlyph name="newFolder" />
                  {t.filesNewFolder}
                </Button>
                <Button variant="primary" size="sm" onClick={() => fileInput.current?.click()}>
                  <FilesGlyph name="upload" />
                  {t.filesUpload}
                </Button>
                {s.clipboard ? (
                  <Button variant="secondary" size="sm" onClick={() => void controller.paste()}>
                    <FilesGlyph name="paste" />
                    {t.filesPaste}
                  </Button>
                ) : null}
              </>
            ) : null}
            {!trash ? (
              <div className="eds-files-view" role="group" aria-label={t.filesViewLabel}>
                <Button
                  variant="secondary"
                  size="sm"
                  iconOnly
                  aria-label={t.filesViewList}
                  aria-pressed={s.view === 'list'}
                  onClick={() => controller.setView('list')}
                >
                  <FilesGlyph name="list" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconOnly
                  aria-label={t.filesViewGrid}
                  aria-pressed={s.view === 'grid'}
                  onClick={() => controller.setView('grid')}
                >
                  <FilesGlyph name="grid" />
                </Button>
              </div>
            ) : null}
            {s.caps.trash ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void (trash ? controller.closeTrash() : controller.openTrash())}
              >
                <FilesGlyph name={trash ? 'back' : 'trash'} />
                {trash ? t.filesBackToFiles : t.filesTrash}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="eds-files-body">
        <aside className="eds-files-tree" aria-label={t.filesTreeLabel}>
          <FolderTree
            controller={controller}
            current={s.path}
            label={t.filesTreeLabel}
            droppable={writable}
            onPick={(p) => void controller.navigate(p)}
          />
        </aside>
        <div className="eds-files-main">
          <div className="eds-files-notice">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className={cx('eds-files-heading', !trash && 'eds-files-heading-sr')}
              data-files-focus-fallback=""
            >
              {headingText}
            </h2>
            {trash && writable && s.items.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => void controller.emptyTrash()}>
                <FilesGlyph name="trash" />
                {t.filesEmptyTrash}
              </Button>
            ) : null}
          </div>
          <div
            className="eds-files-content"
            aria-busy={s.status === 'loading'}
            onContextMenu={onContextMenu}
          >
            {content}
          </div>
          <div className="eds-files-more" hidden={!s.nextCursor}>
            <Button
              variant="secondary"
              aria-busy={s.loadingMore}
              onClick={() => void controller.loadMore()}
            >
              {t.filesLoadMore}
            </Button>
          </div>
          <section
            className="eds-files-uploads"
            aria-label={t.filesUploadsTitle}
            hidden={s.uploads.length === 0}
          >
            <header className="eds-files-uploads-header">
              <h3 className="eds-files-uploads-title">{t.filesUploadsTitle}</h3>
              <Button variant="ghost" size="sm" onClick={() => controller.dismissUploads()}>
                {t.filesUploadDismiss}
              </Button>
            </header>
            <ul className="eds-files-upload-list">{s.uploads.map(uploadItem)}</ul>
          </section>
          <div
            className="eds-table-bulk eds-files-bulk"
            role="group"
            aria-label={t.filesBulkLabel}
            hidden={s.selection.length === 0}
          >
            <p className="eds-table-bulk-count">
              {s.selection.length === 1
                ? t.filesBulkCountOne
                : fillTemplate(t.filesBulkCountMany, { count: s.selection.length })}
            </p>
            <div className="eds-table-bulk-actions">
              {bulkActions.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={a === 'delete' || a === 'deleteForever' ? 'danger' : 'secondary'}
                  onClick={() => void perform(a, bulkEntries)}
                >
                  {t[ACTION_TEXT[a]]}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => controller.clearSelection()}>
                {t.filesBulkClear}
              </Button>
            </div>
          </div>
          <div className="eds-files-drop-hint" aria-hidden="true">
            <FilesGlyph name="upload" />
            <span>{dropText}</span>
          </div>
        </div>
      </div>

      <div className="eds-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcer.text}
      </div>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        aria-hidden="true"
        accept={s.caps.accept?.join(',') || undefined}
        onChange={(ev) => {
          const picked = Array.from(ev.target.files ?? []);
          ev.target.value = '';
          controller.upload(picked);
        }}
      />

      {/* Menu em popover: setas, Home e End entre os itens (os botões são os controles reais). */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={menuRef}
        id={`${rest.id ?? 'eds-files'}-menu`}
        className="eds-dropdown eds-files-menu"
        popover="manual"
        aria-label={
          menuEntries.length === 1
            ? fillTemplate(t.filesActionsFor, { name: menuEntries[0]!.name })
            : t.filesBulkLabel
        }
        onToggle={(ev) => {
          if ((ev.nativeEvent as Event & { newState?: string }).newState === 'closed')
            setMenu(null);
        }}
        onKeyDown={(ev) => {
          const items = Array.from(ev.currentTarget.querySelectorAll<HTMLElement>('button'));
          const i = items.indexOf(document.activeElement as HTMLElement);
          if (ev.key === 'ArrowDown') items[(i + 1) % items.length]?.focus();
          else if (ev.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus();
          else if (ev.key === 'Home') items[0]?.focus();
          else if (ev.key === 'End') items[items.length - 1]?.focus();
          else if (ev.key === 'Escape') {
            const back = rowLink(menu?.keys[0]);
            closeMenu();
            back?.focus();
          } else if (ev.key === 'Tab') closeMenu();
          else return;
          if (ev.key !== 'Tab') ev.preventDefault();
        }}
      >
        {menu
          ? menuActions.map((a) => (
              <button
                key={a}
                type="button"
                className={cx(
                  'eds-dropdown-item',
                  (a === 'delete' || a === 'deleteForever') && 'eds-dropdown-item-danger',
                )}
                onClick={() => {
                  const back = rowLink(menu.keys[0]);
                  const entries = menuEntries;
                  closeMenu();
                  back?.focus();
                  void perform(a, entries);
                }}
              >
                {t[ACTION_TEXT[a]]}
              </button>
            ))
          : null}
      </div>

      {dialog?.kind === 'name' ? (
        <NameDialog
          t={t}
          mode={dialog.mode}
          entry={dialog.entry}
          focusFallback={focusFallback}
          submit={async (name) => {
            const r =
              dialog.mode === 'create'
                ? await controller.createFolder(name)
                : await controller.rename(dialog.entry!, name);
            return r.ok ? { ok: true } : { ok: false, message: r.message };
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === 'conflict' ? (
        <ConflictDialog
          t={t}
          name={dialog.name}
          remaining={dialog.remaining}
          resolve={dialog.resolve}
          focusFallback={focusFallback}
        />
      ) : null}
      {dialog?.kind === 'confirm' ? (
        <ConfirmDialog
          t={t}
          title={dialog.title}
          text={dialog.text}
          confirmLabel={dialog.confirmLabel}
          tone={dialog.tone}
          resolve={dialog.resolve}
          focusFallback={focusFallback}
        />
      ) : null}
      {dialog?.kind === 'pick' ? (
        <PickDialog
          t={t}
          controller={controller}
          entries={dialog.entries}
          copy={dialog.copy}
          initial={s.path}
          focusFallback={focusFallback}
          onClose={() => setDialog(null)}
          onPick={(target) => {
            const { entries, copy } = dialog;
            setDialog(null);
            void controller.transfer(entries, target, copy);
          }}
        />
      ) : null}
      {dialog?.kind === 'versions' ? (
        <VersionsDrawer
          t={t}
          controller={controller}
          entry={dialog.entry}
          canRestore={controller.can('rename', [dialog.entry])}
          focusFallback={focusFallback}
          onClose={() => setDialog(null)}
          onPreview={(v: FileVersion) => {
            const entry = dialog.entry;
            viewer.open(
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
          }}
        />
      ) : null}
      {dialog?.kind === 'tree' ? (
        <TreeDrawer
          t={t}
          controller={controller}
          current={s.path}
          focusFallback={focusFallback}
          onClose={() => setDialog(null)}
          onPick={(path) => {
            setDialog(null);
            go(path);
          }}
        />
      ) : null}
      <FileViewer {...viewer.viewerProps} />
    </div>
  );
}

const noopSubscribe = (): (() => void) => () => undefined;
