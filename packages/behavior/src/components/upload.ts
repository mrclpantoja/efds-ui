import { format, getMessages } from '../core/config';
import { closeIcon, emit, focusEl } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

type UploadState = 'ready' | 'uploading' | 'done' | 'error';

interface Entry {
  file: File;
  state: UploadState;
  /** Texto da causa quando `state === 'error'`. */
  reason: string;
  /** Recusado na validação (não ocupa vaga, não vai ao input nem ao envio, sem "Tentar de novo"). */
  invalid: boolean;
  percent: number;
  xhr: XMLHttpRequest | null;
  hidden: HTMLInputElement | null;
  li: HTMLLIElement;
  removeButton: HTMLButtonElement | null;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** "850 KB", "1,2 MB" (pt-BR, sem depender de `Intl`). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (Math.round(value) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
  return `${text.replace('.', ',')} ${units[unit] ?? 'GB'}`;
}

function icon(paths: string[], className?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

const FILE_ICON = ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'];
const CHECK_ICON = ['M20 6L9 17l-5-5'];
const ALERT_ICON = ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v5', 'M12 16h.01'];

/** Confere `accept` (extensão, `tipo/*` ou MIME exato). Sem `accept`, tudo vale. */
function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * FileUpload: arrastar e soltar + lista de arquivos sobre um `input[type=file]`. Modo formulário
 * (padrão): acumula as seleções e mantém `input.files` (o form envia tudo). Modo imediato
 * (`data-eds-upload-url`): cada arquivo vai por XHR e vira um `input[type=hidden]` com o id.
 */
export const uploadBehavior: Behavior = {
  name: 'upload',
  selector: '[data-eds-upload]',
  bind(root) {
    const input = root.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) return;
    let list = root.querySelector<HTMLElement>('.eds-upload-list');
    if (!list) {
      list = document.createElement('ul');
      list.className = 'eds-upload-list';
      root.append(list);
    }
    const listEl = list;
    const status = root.querySelector<HTMLElement>('[role="status"]');
    const maxSize = Number(root.getAttribute('data-eds-max-size') ?? 0);
    const maxFiles = Number(root.getAttribute('data-eds-max-files') ?? 0);
    const url = root.getAttribute('data-eds-upload-url');
    const field = root.getAttribute('data-eds-upload-field') ?? 'file';
    const immediate = url !== null && url !== '';
    const inputName = input.getAttribute('name') ?? '';
    const wasRequired = input.required;
    const entries: Entry[] = [];
    let dragDepth = 0;

    const ac = new AbortController();
    const { signal } = ac;

    // Imediato: os binários já foram; o input não reenvia nada (nem exige arquivo).
    if (immediate) {
      input.removeAttribute('name');
      input.required = false;
      if (wasRequired) input.setAttribute('aria-required', 'true');
    }

    const announcer = createAnnouncer(status);
    const announce = announcer.say;

    const slots = () => entries.filter((e) => !e.invalid).length;
    const validFiles = () => entries.filter((e) => !e.invalid).map((e) => e.file);

    // ---- Validade (envio em andamento bloqueia o submit) ------------------------------------
    const syncValidity = () => {
      const m = getMessages();
      let message = '';
      if (immediate) {
        if (entries.some((e) => e.state === 'uploading')) message = m.uploadBusy;
        else if (entries.some((e) => e.state === 'error' && !e.invalid)) {
          message = m.uploadFailedPending;
        } else if (wasRequired && !entries.some((e) => e.state === 'done')) {
          message = m.uploadRequired;
        }
      }
      input.setCustomValidity(message);
    };

    /** Modo formulário: o input carrega só os arquivos válidos (acumulados). */
    const syncInput = () => {
      if (immediate || typeof DataTransfer === 'undefined') return;
      try {
        const transfer = new DataTransfer();
        for (const entry of entries) if (!entry.invalid) transfer.items.add(entry.file);
        input.files = transfer.files;
      } catch {
        /* sem suporte a DataTransfer: o input fica com a última seleção nativa */
      }
    };

    // ---- Item da lista ----------------------------------------------------------------------
    const metaText = (entry: Entry): string => {
      const m = getMessages();
      const size = formatFileSize(entry.file.size);
      if (entry.state === 'uploading') {
        return `${size} · ${format(m.uploadSending, { percent: entry.percent })}`;
      }
      if (entry.state === 'done') return `${size} · ${m.uploadDone}`;
      if (entry.state === 'error') return entry.reason;
      return size;
    };

    const render = (entry: Entry) => {
      const m = getMessages();
      const { li, file } = entry;
      const hadFocus = li.contains(document.activeElement);
      li.textContent = '';
      li.setAttribute('data-state', entry.state);

      const body = document.createElement('div');
      body.className = 'eds-upload-item-body';
      const name = document.createElement('span');
      name.className = 'eds-upload-item-name';
      name.textContent = file.name;
      const meta = document.createElement('span');
      meta.className = 'eds-upload-item-meta';
      if (entry.state === 'done') meta.append(icon(CHECK_ICON));
      else if (entry.state === 'error') meta.append(icon(ALERT_ICON));
      meta.append(document.createTextNode(metaText(entry)));
      body.append(name, meta);
      if (entry.state === 'uploading') {
        const progress = document.createElement('progress');
        progress.className = 'eds-upload-progress';
        progress.max = 100;
        progress.value = entry.percent;
        progress.setAttribute('aria-label', format(m.uploadSendingLabel, { name: file.name }));
        body.append(progress);
      }

      li.append(icon(FILE_ICON, 'eds-upload-item-icon'), body);

      if (entry.state === 'error' && !entry.invalid) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'eds-button eds-button-ghost eds-button-sm';
        retry.textContent = m.uploadRetry;
        retry.setAttribute('aria-label', format(m.uploadRetryLabel, { name: file.name }));
        retry.disabled = input.disabled;
        retry.addEventListener('click', () => {
          if (!input.disabled) send(entry);
        });
        li.append(retry);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'eds-button eds-button-ghost eds-button-icon eds-button-sm';
      remove.setAttribute('aria-label', format(m.uploadRemove, { name: file.name }));
      remove.disabled = input.disabled;
      remove.append(closeIcon());
      remove.addEventListener('click', () => removeEntry(entry));
      li.append(remove);
      entry.removeButton = remove;

      if (hadFocus) remove.focus();
    };

    const renderProgress = (entry: Entry) => {
      const progress = entry.li.querySelector<HTMLProgressElement>('progress');
      if (progress) progress.value = entry.percent;
      const meta = entry.li.querySelector('.eds-upload-item-meta');
      if (meta) meta.textContent = metaText(entry);
    };

    const createEntry = (file: File, reason: string): Entry => {
      const li = document.createElement('li');
      li.className = 'eds-upload-item';
      const entry: Entry = {
        file,
        state: reason ? 'error' : 'ready',
        reason,
        invalid: reason !== '',
        percent: 0,
        xhr: null,
        hidden: null,
        li,
        removeButton: null,
      };
      entries.push(entry);
      listEl.append(li);
      render(entry);
      return entry;
    };

    // ---- Envio imediato ---------------------------------------------------------------------
    const fail = (entry: Entry) => {
      const m = getMessages();
      entry.xhr = null;
      entry.state = 'error';
      entry.reason = m.uploadFailed;
      render(entry);
      announce(
        format(m.uploadRejected, { name: entry.file.name, reason: lowerFirst(m.uploadFailed) }),
      );
      emit(root, 'upload-error', { file: entry.file, message: m.uploadFailed });
      syncValidity();
    };

    const succeed = (entry: Entry, response: unknown, id: string) => {
      entry.xhr = null;
      entry.state = 'done';
      entry.percent = 100;
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = inputName;
      hidden.value = id;
      root.append(hidden);
      entry.hidden = hidden;
      render(entry);
      announce(format(getMessages().uploadSent, { name: entry.file.name }));
      emit(root, 'upload-complete', { file: entry.file, response });
      syncValidity();
    };

    function send(entry: Entry): void {
      if (!url) return;
      const xhr = new XMLHttpRequest();
      entry.xhr = xhr;
      entry.state = 'uploading';
      entry.percent = 0;
      entry.reason = '';
      render(entry);
      syncValidity();
      xhr.open('POST', url);
      // O PageLoader automático não deve bloquear a página por um envio que tem progresso próprio.
      xhr.setRequestHeader('X-EDS-Loader', 'off');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.addEventListener('progress', (event) => {
        if (!entries.includes(entry) || !event.lengthComputable || event.total === 0) return;
        entry.percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        renderProgress(entry);
        emit(root, 'upload-progress', { file: entry.file, percent: entry.percent });
      });
      xhr.addEventListener('load', () => {
        if (!entries.includes(entry)) return;
        let response: unknown = null;
        try {
          response = JSON.parse(xhr.responseText) as unknown;
        } catch {
          response = null;
        }
        const id =
          typeof response === 'object' && response !== null && 'id' in response
            ? (response as { id: unknown }).id
            : undefined;
        if (xhr.status >= 200 && xhr.status < 300 && id !== undefined && id !== null && id !== '') {
          succeed(entry, response, String(id));
        } else fail(entry);
      });
      const onFailure = () => {
        if (entries.includes(entry)) fail(entry);
      };
      xhr.addEventListener('error', onFailure);
      xhr.addEventListener('timeout', onFailure);
      const body = new FormData();
      body.append(field, entry.file, entry.file.name);
      xhr.send(body);
    }

    // ---- Remover ----------------------------------------------------------------------------
    const removeEntry = (entry: Entry, quiet = false) => {
      const index = entries.indexOf(entry);
      if (index < 0) return;
      entries.splice(index, 1);
      const xhr = entry.xhr;
      entry.xhr = null;
      xhr?.abort();
      entry.hidden?.remove();
      entry.li.remove();
      if (quiet) return;
      const target = entries[index] ?? entries[index - 1];
      if (!focusEl(target?.removeButton)) focusEl(input);
      announce(format(getMessages().uploadRemoved, { name: entry.file.name }));
      syncInput();
      syncValidity();
      emit(root, 'upload-change', validFiles());
    };

    // ---- Adicionar --------------------------------------------------------------------------
    const addFiles = (incoming: File[]) => {
      const m = getMessages();
      let files = incoming;
      const added: Entry[] = [];
      const notes: string[] = [];
      let skipped = 0;
      if (!input.multiple) {
        for (const entry of [...entries]) removeEntry(entry, true);
        if (files.length > 1) notes.push(m.uploadSingleOnly);
        files = files.slice(0, 1);
      }
      const key = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
      let limit = false;
      for (const file of files) {
        if (entries.some((e) => key(e.file) === key(file))) {
          notes.push(format(m.uploadDuplicate, { name: file.name }));
          continue;
        }
        let reason = '';
        if (!matchesAccept(file, input.accept)) reason = m.uploadBadType;
        else if (maxSize > 0 && file.size > maxSize) {
          reason = format(m.uploadTooLarge, { size: formatFileSize(maxSize) });
        }
        if (reason) {
          createEntry(file, reason);
          notes.push(format(m.uploadRejected, { name: file.name, reason: lowerFirst(reason) }));
          continue;
        }
        if (maxFiles > 0 && slots() >= maxFiles) {
          limit = true;
          skipped += 1;
          continue;
        }
        added.push(createEntry(file, ''));
      }
      const parts: string[] = [];
      const [first] = added;
      if (added.length === 1 && first) {
        parts.push(format(m.uploadAddedOne, { name: first.file.name }));
      } else if (added.length > 1) parts.push(format(m.uploadAddedMany, { count: added.length }));
      parts.push(...notes);
      if (limit) {
        parts.push(
          maxFiles === 1 ? m.uploadMaxFilesOne : format(m.uploadMaxFilesMany, { max: maxFiles }),
        );
        parts.push(
          skipped === 1 ? m.uploadNotAddedOne : format(m.uploadNotAddedMany, { count: skipped }),
        );
      }
      if (parts.length > 0) announce(parts.join(' '));
      syncInput();
      if (immediate) for (const entry of added) send(entry);
      syncValidity();
      emit(root, 'upload-change', validFiles());
    };

    // ---- Eventos ----------------------------------------------------------------------------
    input.addEventListener(
      'change',
      () => {
        const picked = Array.from(input.files ?? []);
        if (picked.length === 0) {
          syncInput();
          return;
        }
        addFiles(picked);
        if (immediate) {
          try {
            input.value = '';
          } catch {
            /* o mesmo arquivo pode não disparar change de novo; sem consequência */
          }
        }
      },
      { signal },
    );

    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');

    root.addEventListener(
      'dragenter',
      (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        if (input.disabled) return;
        dragDepth += 1;
        root.setAttribute('data-dragover', '');
      },
      { signal },
    );
    root.addEventListener(
      'dragover',
      (event) => {
        if (!hasFiles(event)) return;
        // Sempre cancela: senão o navegador abriria o arquivo e a página (e o form) se perderia.
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = input.disabled ? 'none' : 'copy';
        if (input.disabled) return;
        root.setAttribute('data-dragover', '');
      },
      { signal },
    );
    root.addEventListener(
      'dragleave',
      () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) root.removeAttribute('data-dragover');
      },
      { signal },
    );
    root.addEventListener(
      'drop',
      (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth = 0;
        root.removeAttribute('data-dragover');
        if (input.disabled) return;
        addFiles(Array.from(event.dataTransfer?.files ?? []));
      },
      { signal },
    );

    const form = input.form;
    form?.addEventListener(
      'reset',
      () => {
        setTimeout(() => {
          for (const entry of [...entries]) removeEntry(entry, true);
          syncInput();
          syncValidity();
          announce('');
        }, 0);
      },
      { signal },
    );

    syncValidity();

    // `disabled` do input vale também para os botões da lista.
    const disabledObserver = new MutationObserver(() => {
      for (const button of listEl.querySelectorAll('button')) button.disabled = input.disabled;
    });
    disabledObserver.observe(input, { attributes: true, attributeFilter: ['disabled'] });

    return () => {
      disabledObserver.disconnect();
      announcer.dispose();
      ac.abort();
      for (const entry of [...entries]) {
        const xhr = entry.xhr;
        entry.xhr = null;
        xhr?.abort();
      }
      input.setCustomValidity('');
      if (immediate) {
        if (inputName) input.setAttribute('name', inputName);
        input.required = wasRequired;
        if (wasRequired) input.removeAttribute('aria-required');
      }
      root.removeAttribute('data-dragover');
    };
  },
};

export function initUpload(root: ParentNode = document): () => void {
  return bindAll(root, [uploadBehavior]);
}
