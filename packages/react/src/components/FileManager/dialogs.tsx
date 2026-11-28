import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  fillTemplate,
  formatFilesDate,
  formatFilesSize,
  nameProblem,
  parentOf,
  pathBaseName,
  filesExtensionOf,
  type AnyEntry,
  type ConflictAnswer,
  type FilesController,
  type FilesTexts,
} from '@efds-ui/behavior/internal';
import type { FileEntry, FileVersion } from '@efds-ui/behavior/files';
import { Button } from '../Button';
import { Drawer } from '../Drawer';
import { Modal } from '../Modal';
import { FolderTree } from './FolderTree';

/** Devolve o foco ao que o tinha antes do diálogo abrir (o `<dialog>` é desmontado, não fechado). */
function useRestoreFocus(fallback: () => HTMLElement | null): void {
  const before = useRef<HTMLElement | null>(
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null,
  );
  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  });
  useEffect(() => {
    const back = before.current;
    return () => {
      setTimeout(() => {
        if (back?.isConnected) back.focus();
        else fallbackRef.current()?.focus();
      }, 0);
    };
  }, []);
}

interface Common {
  t: FilesTexts;
  focusFallback: () => HTMLElement | null;
}

// ---- nome (nova pasta / renomear) ----------------------------------------------------------

export interface NameDialogProps extends Common {
  mode: 'create' | 'rename';
  entry: FileEntry | null;
  submit: (name: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  onClose: () => void;
}

export function NameDialog({ t, mode, entry, submit, onClose, focusFallback }: NameDialogProps) {
  useRestoreFocus(focusFallback);
  const id = useId();
  const [value, setValue] = useState(entry?.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.focus();
    const ext = entry?.type === 'file' ? filesExtensionOf(entry.name) : '';
    if (ext) el.setSelectionRange(0, entry!.name.length - ext.length - 1);
    else el.select();
  }, [entry]);

  const problemText = (code: ReturnType<typeof nameProblem>) =>
    code === 'empty'
      ? t.filesNameEmpty
      : code === 'dots'
        ? t.filesNameDots
        : code === 'long'
          ? t.filesNameLong
          : t.filesNameChars;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = nameProblem(value);
    if (problem) {
      setError(problemText(problem));
      input.current?.focus();
      return;
    }
    if (mode === 'rename' && entry && value.trim() === entry.name) return onClose();
    setBusy(true);
    const result = await submit(value);
    setBusy(false);
    if (result.ok) onClose();
    else {
      setError(result.message);
      input.current?.focus();
    }
  };

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      closeOnBackdrop={false}
      title={mode === 'create' ? t.filesNewFolderTitle : t.filesRenameTitle}
      texts={{ close: t.filesClose }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.filesCancel}
          </Button>
          <Button variant="primary" type="submit" form={`${id}-form`} aria-busy={busy || undefined}>
            {mode === 'create' ? t.filesCreate : t.filesSave}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} noValidate onSubmit={(e) => void onSubmit(e)}>
        <div className="eds-field">
          <label className="eds-label" htmlFor={id}>
            {t.filesNameLabel}
          </label>
          <input
            ref={input}
            id={id}
            className="eds-input"
            type="text"
            autoComplete="off"
            required
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
          />
          <p className="eds-error" id={`${id}-error`} hidden={error === ''}>
            {error}
          </p>
        </div>
      </form>
    </Modal>
  );
}

// ---- conflito ------------------------------------------------------------------------------

export interface ConflictDialogProps extends Common {
  name: string;
  remaining: number;
  resolve: (answer: ConflictAnswer | null) => void;
}

export function ConflictDialog({
  t,
  name,
  remaining,
  resolve,
  focusFallback,
}: ConflictDialogProps) {
  useRestoreFocus(focusFallback);
  const [all, setAll] = useState(false);
  const answer = (policy: ConflictAnswer['policy']) => resolve({ policy, all });
  return (
    <Modal
      open
      size="sm"
      onClose={() => resolve(null)}
      closeOnBackdrop={false}
      title={t.filesConflictTitle}
      texts={{ close: t.filesClose }}
      footer={
        <>
          <Button variant="ghost" onClick={() => answer('skip')}>
            {t.filesConflictSkip}
          </Button>
          <Button variant="secondary" data-autofocus="" onClick={() => answer('rename')}>
            {t.filesConflictKeepBoth}
          </Button>
          <Button variant="primary" onClick={() => answer('replace')}>
            {t.filesConflictReplace}
          </Button>
        </>
      }
    >
      <p>{fillTemplate(t.filesConflictText, { name })}</p>
      {remaining > 0 ? (
        <label className="eds-check">
          <input
            type="checkbox"
            className="eds-checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />
          {fillTemplate(t.filesConflictAll, { count: remaining })}
        </label>
      ) : null}
    </Modal>
  );
}

// ---- confirmação ---------------------------------------------------------------------------

export interface ConfirmDialogProps extends Common {
  title: string;
  text: string;
  confirmLabel: string;
  tone: 'danger' | 'info';
  resolve: (ok: boolean) => void;
}

export function ConfirmDialog({
  t,
  title,
  text,
  confirmLabel,
  tone,
  resolve,
  focusFallback,
}: ConfirmDialogProps) {
  useRestoreFocus(focusFallback);
  return (
    <Modal
      open
      size="sm"
      onClose={() => resolve(false)}
      closeOnBackdrop={false}
      title={title}
      texts={{ close: t.filesClose }}
      footer={
        <>
          <Button variant="secondary" data-autofocus="" onClick={() => resolve(false)}>
            {t.filesCancel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => resolve(true)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  );
}

// ---- escolher pasta (mover / copiar) -------------------------------------------------------

export interface PickDialogProps extends Common {
  controller: FilesController;
  entries: FileEntry[];
  copy: boolean;
  initial: string;
  onPick: (path: string) => void;
  onClose: () => void;
}

export function PickDialog({
  t,
  controller,
  entries,
  copy,
  initial,
  onPick,
  onClose,
  focusFallback,
}: PickDialogProps) {
  useRestoreFocus(focusFallback);
  const [chosen, setChosen] = useState(initial);
  const sources = entries.filter((e) => e.type === 'folder').map((e) => e.path);
  const same = !copy && entries.every((e) => parentOf(e.path) === chosen);
  const name = chosen === '/' ? controller.rootLabel : pathBaseName(chosen);
  return (
    <Modal
      open
      onClose={onClose}
      closeOnBackdrop={false}
      title={copy ? t.filesPickTitleCopy : t.filesPickTitleMove}
      texts={{ close: t.filesClose }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.filesCancel}
          </Button>
          <Button variant="primary" disabled={same} onClick={() => onPick(chosen)}>
            {copy ? t.filesPickCopy : t.filesPickMove}
          </Button>
        </>
      }
    >
      <p>{t.filesPickText}</p>
      <div className="eds-files-pick-tree">
        <FolderTree
          controller={controller}
          current={chosen}
          label={t.filesTreeLabel}
          onPick={setChosen}
          disabledPaths={sources}
          focusOnMount
        />
      </div>
      <p className="eds-files-pick-status" role="status">
        {fillTemplate(t.filesPickCurrent, { name })}
      </p>
    </Modal>
  );
}

// ---- versões -------------------------------------------------------------------------------

export interface VersionsDrawerProps extends Common {
  controller: FilesController;
  entry: FileEntry;
  canRestore: boolean;
  onPreview: (version: FileVersion) => void;
  onClose: () => void;
}

export function VersionsDrawer({
  t,
  controller,
  entry,
  canRestore,
  onPreview,
  onClose,
  focusFallback,
}: VersionsDrawerProps) {
  useRestoreFocus(focusFallback);
  const [versions, setVersions] = useState<FileVersion[] | null>(null);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    let alive = true;
    controller.versions(entry).then(
      (v) => alive && setVersions(v),
      (e: unknown) => alive && setFailed(controller.errorMessage(e as never)),
    );
    return () => {
      alive = false;
    };
  }, [controller, entry]);

  const restore = useCallback(
    async (v: FileVersion) => {
      const r = await controller.restoreVersion(entry, v);
      if (r.ok) onClose();
      else setFailed(r.message);
    },
    [controller, entry, onClose],
  );

  let body: ReactNode;
  if (failed) body = <p className="eds-error">{failed}</p>;
  else if (versions === null) body = <p role="status">{t.filesVersionsLoading}</p>;
  else {
    body = (
      <>
        {versions.length <= 1 ? <p>{t.filesVersionsEmpty}</p> : null}
        <ul className="eds-files-versions">
          {versions.map((v) => {
            const when = formatFilesDate(v.modified);
            const meta = [
              formatFilesSize(v.size),
              v.author ? fillTemplate(t.filesVersionBy, { author: v.author }) : '',
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={v.version} className="eds-files-version">
                <p className="eds-files-version-title">
                  <time dateTime={v.modified}>{when}</time>
                  {v.current ? (
                    <span className="eds-badge eds-badge-info eds-badge-sm">
                      {t.filesVersionCurrent}
                    </span>
                  ) : null}
                </p>
                <p className="eds-files-version-meta">{meta}</p>
                <div className="eds-files-version-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${t.filesVersionPreview}: ${when}`}
                    onClick={() => onPreview(v)}
                  >
                    {t.filesVersionPreview}
                  </Button>
                  <a
                    className="eds-button eds-button-ghost eds-button-sm"
                    href={controller.downloadUrl(entry, v.version)}
                    download={entry.name}
                    aria-label={`${t.filesVersionDownload}: ${when}`}
                  >
                    {t.filesVersionDownload}
                  </a>
                  {!v.current && canRestore ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`${t.filesVersionRestore}: ${when}`}
                      onClick={() => void restore(v)}
                    >
                      {t.filesVersionRestore}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }
  return (
    <Drawer
      open
      placement="start"
      onClose={onClose}
      closeOnBackdrop={false}
      title={fillTemplate(t.filesVersionsTitle, { name: entry.name })}
      texts={{ close: t.filesClose }}
    >
      {body}
    </Drawer>
  );
}

// ---- árvore em Drawer (contêiner estreito) -------------------------------------------------

export interface TreeDrawerProps extends Common {
  controller: FilesController;
  current: string;
  onPick: (path: string) => void;
  onClose: () => void;
}

export function TreeDrawer({
  t,
  controller,
  current,
  onPick,
  onClose,
  focusFallback,
}: TreeDrawerProps) {
  useRestoreFocus(focusFallback);
  return (
    <Drawer
      open
      placement="start"
      onClose={onClose}
      title={t.filesTreeLabel}
      texts={{ close: t.filesClose }}
    >
      <FolderTree
        controller={controller}
        current={current}
        label={t.filesTreeLabel}
        onPick={onPick}
        focusOnMount
      />
    </Drawer>
  );
}

export type { AnyEntry };
