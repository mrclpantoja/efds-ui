import { format, getMessages } from '../core/config';
import { emit, ensureId, flag, normalizeText, uid } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

/** Item da paleta (da marcação, do JSON ou da fonte remota). */
export interface CommandItem {
  value: string;
  label: string;
  description?: string;
  group?: string;
  href?: string;
  shortcut?: string;
  keywords?: string;
  disabled?: boolean;
}

interface Entry extends CommandItem {
  /** Elemento da marcação do autor (preserva ícone e atalho); ausente nos itens gerados. */
  template: HTMLElement | null;
}

const DEFAULT_SHORTCUT = 'mod+k';
const DEBOUNCE_MS = 250;
const STATUS_MS = 400;
const RECENT_KEY = 'eds:command-recent';
const RECENT_DEFAULT = 5;
const RECENT_MAX = 10;

type FetchInit = RequestInit & { edsLoader?: false };

/** `mod+k`, `ctrl+k`, `/`: o último termo é a tecla; `mod` aceita Ctrl ou Cmd. */
export function matchesShortcut(event: KeyboardEvent, spec: string): boolean {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts.pop();
  if (!key || event.key.toLowerCase() !== key) return false;
  const mod = parts.includes('mod');
  const want = (name: string) => parts.includes(name);
  const ctrl = event.ctrlKey;
  const meta = event.metaKey;
  if (mod) {
    if (!ctrl && !meta) return false;
  } else if (ctrl !== want('ctrl') || meta !== (want('meta') || want('cmd'))) return false;
  return event.altKey === want('alt') && event.shiftKey === want('shift');
}

function readRecent(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(storageKey: string, ids: string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    /* armazenamento indisponível: segue sem lembrar */
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function searchIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const circle = doc.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '11');
  circle.setAttribute('cy', '11');
  circle.setAttribute('r', '7');
  const line = doc.createElementNS(SVG_NS, 'path');
  line.setAttribute('d', 'M20 20l-3.5-3.5');
  svg.append(circle, line);
  return svg;
}

function cleanItem(raw: unknown): CommandItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === 'string' ? r.label : '';
  const value = r.value !== undefined ? String(r.value) : typeof r.id === 'string' ? r.id : label;
  if (label === '') return null;
  const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
  return {
    value,
    label,
    description: str(r.description),
    group: str(r.group),
    href: str(r.href),
    shortcut: str(r.shortcut),
    keywords: str(r.keywords),
    disabled: r.disabled === true,
  };
}

/**
 * Paleta de comandos / busca global: `<dialog class="eds-modal eds-command" data-eds-command>`.
 * Abre com Ctrl/Cmd+K (`data-eds-command-shortcut="mod+k"`; `="false"` desliga) ou por
 * `[data-eds-open]`. Padrão APG combobox com lista: o foco fica no campo, a opção ativa vai em
 * `aria-activedescendant`, setas movem, Enter escolhe, Esc fecha (nativo) e o foco volta a quem
 * abriu. Itens: da própria marcação (`.eds-command-item`, com ícone e atalho do autor), de um
 * `<script type="application/json" data-eds-command-items>` ou remotos (`data-eds-source`, com a
 * busca no fim da URL e `[{value,label,description?,group?,href?,shortcut?}]` de volta).
 * "Recentes" é opcional (`data-eds-command-recent="5"`; só ids em `localStorage`, chave em
 * `data-eds-command-storage`). Evento `eds:command-select` (cancelável): `detail { value, label, href }`;
 * sem cancelar, um item com `href` navega.
 */
export const commandBehavior: Behavior = {
  name: 'command',
  selector: 'dialog[data-eds-command]',
  bind(dialog) {
    if (!(dialog instanceof HTMLDialogElement)) return;
    const doc = dialog.ownerDocument;
    const ac = new AbortController();
    const { signal } = ac;
    const m = () => getMessages();

    // ---- Estrutura (completa o que o autor não escreveu) ----------------------------------
    const make = <K extends keyof HTMLElementTagNameMap>(
      tag: K,
      className: string,
    ): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(tag);
      node.className = className;
      return node;
    };
    let input = dialog.querySelector<HTMLInputElement>(
      'input[role="combobox"], .eds-command-input',
    );
    if (!input) {
      const search = make('div', 'eds-command-search');
      search.append(searchIcon(doc));
      input = make('input', 'eds-command-input');
      input.type = 'text';
      search.append(input);
      dialog.prepend(search);
    }
    let listbox = dialog.querySelector<HTMLElement>('[role="listbox"]');
    if (!listbox) {
      listbox = make('div', 'eds-command-list');
      listbox.setAttribute('role', 'listbox');
      input.closest('.eds-command-search')?.after(listbox);
      if (!listbox.isConnected) dialog.append(listbox);
    }
    let empty = dialog.querySelector<HTMLElement>('.eds-command-empty');
    if (!empty) {
      empty = make('p', 'eds-command-empty');
      empty.hidden = true;
      listbox.after(empty);
    }
    let status = dialog.querySelector<HTMLElement>('[role="status"]');
    if (!status) {
      status = make('span', 'eds-visually-hidden');
      status.setAttribute('role', 'status');
      dialog.append(status);
    }
    const list = listbox;
    const field = input;
    const emptyEl = empty;
    const statusEl = status;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', ensureId(list, 'command-list'));
    input.setAttribute('aria-expanded', 'false');
    if (!input.hasAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
    if (!input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
      input.setAttribute('aria-label', m().commandSearch);
    }
    if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
      dialog.setAttribute('aria-label', m().commandTitle);
    }
    if (!list.hasAttribute('aria-label') && !list.hasAttribute('aria-labelledby')) {
      list.setAttribute('aria-label', m().commandTitle);
    }

    const announcer = createAnnouncer(statusEl);

    // ---- Itens ----------------------------------------------------------------------------
    const source = dialog.getAttribute('data-eds-source');
    const minChars = Math.max(0, Number(dialog.getAttribute('data-eds-min-chars') ?? 0) || 0);
    const recentAttr = dialog.getAttribute('data-eds-command-recent');
    const recentMax =
      recentAttr === null || recentAttr === 'false'
        ? 0
        : Math.min(RECENT_MAX, Math.max(1, Number(recentAttr) || RECENT_DEFAULT));
    const storageKey = dialog.getAttribute('data-eds-command-storage') || RECENT_KEY;

    const readDomEntries = (): Entry[] =>
      Array.from(list.querySelectorAll<HTMLElement>('[role="option"]')).map((el) => {
        const label =
          el.querySelector('.eds-command-label')?.textContent?.trim() ??
          (el.textContent ?? '').trim();
        const group = el.closest('[role="group"]');
        const groupLabel = group?.querySelector('.eds-command-group-label')?.textContent?.trim();
        return {
          value: el.getAttribute('data-value') ?? label,
          label,
          description: el.querySelector('.eds-command-description')?.textContent?.trim(),
          group: groupLabel,
          href: el.getAttribute('data-href') ?? undefined,
          keywords: el.getAttribute('data-keywords') ?? undefined,
          disabled: el.getAttribute('aria-disabled') === 'true',
          template: el,
        };
      });

    const readJsonEntries = (): Entry[] => {
      const script = dialog.querySelector<HTMLScriptElement>(
        'script[type="application/json"][data-eds-command-items]',
      );
      if (!script) return [];
      try {
        const data: unknown = JSON.parse(script.textContent ?? '[]');
        return (Array.isArray(data) ? data : [])
          .map(cleanItem)
          .filter((i): i is CommandItem => i !== null)
          .map((i) => ({ ...i, template: null }));
      } catch {
        return [];
      }
    };

    const hasDomItems = list.querySelector('[role="option"]') !== null;
    const local: Entry[] = hasDomItems ? readDomEntries() : readJsonEntries();
    // Todos os itens já vistos (inclui os remotos), para os Recentes poderem reconstruí-los.
    const known = new Map<string, Entry>(local.map((e) => [e.value, e]));
    const authored = hasDomItems;
    // Itens da marcação saem do DOM e voltam quando a busca os pede: o modelo é a lista.
    const templates = new Map<string, HTMLElement>();
    if (authored) {
      for (const e of local) if (e.template) templates.set(e.value, e.template);
    }

    let entries: Entry[] = local;
    let highlighted: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let statusTimer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let errored = false;

    // ---- Renderização ---------------------------------------------------------------------
    const options = () => Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
    const enabled = () => options().filter((o) => o.getAttribute('aria-disabled') !== 'true');

    const buildItem = (entry: Entry, idSuffix = ''): HTMLElement => {
      let item: HTMLElement;
      const tpl = entry.template ?? templates.get(entry.value) ?? null;
      if (tpl) {
        item = tpl.cloneNode(true) as HTMLElement;
        item.removeAttribute('hidden');
        item.removeAttribute('aria-selected');
      } else {
        item = make('div', 'eds-command-item');
        item.setAttribute('role', 'option');
        const label = make('span', 'eds-command-label');
        label.textContent = entry.label;
        item.append(label);
        if (entry.description) {
          const description = make('span', 'eds-command-description');
          description.textContent = entry.description;
          item.append(description);
        }
        if (entry.shortcut) {
          const kbd = make('kbd', 'eds-command-shortcut');
          kbd.textContent = entry.shortcut;
          item.append(kbd);
        }
        item.setAttribute('data-value', entry.value);
        if (entry.href) item.setAttribute('data-href', entry.href);
        if (entry.disabled) item.setAttribute('aria-disabled', 'true');
      }
      item.id = uid(`command-opt${idSuffix}`);
      return item;
    };

    const buildGroup = (label: string | undefined, items: HTMLElement[]): HTMLElement => {
      if (!label) {
        const bare = make('div', 'eds-command-group');
        bare.append(...items);
        return bare;
      }
      const group = make('div', 'eds-command-group');
      group.setAttribute('role', 'group');
      const title = make('div', 'eds-command-group-label');
      title.id = uid('command-group');
      title.textContent = label;
      group.setAttribute('aria-labelledby', title.id);
      group.append(title, ...items);
      return group;
    };

    const setHighlight = (option: HTMLElement | null, scroll = true) => {
      if (highlighted && highlighted !== option) highlighted.removeAttribute('aria-selected');
      highlighted = option;
      if (option) {
        option.setAttribute('aria-selected', 'true');
        field.setAttribute('aria-activedescendant', option.id);
        if (scroll && typeof option.scrollIntoView === 'function') {
          option.scrollIntoView({ block: 'nearest' });
        }
      } else field.removeAttribute('aria-activedescendant');
    };

    const matches = (entry: Entry, query: string): boolean => {
      const needle = normalizeText(query.trim());
      if (needle === '') return true;
      const hay = normalizeText(
        `${entry.label} ${entry.description ?? ''} ${entry.keywords ?? ''} ${entry.group ?? ''}`,
      );
      return needle.split(/\s+/).every((word) => hay.includes(word));
    };

    const recents = (): Entry[] => {
      if (recentMax === 0) return [];
      return readRecent(storageKey)
        .map((id) => known.get(id))
        .filter((e): e is Entry => e !== undefined && e.disabled !== true)
        .slice(0, recentMax);
    };

    const render = (query: string): void => {
      list.textContent = '';
      setHighlight(null);
      const shown = entries.filter((e) => matches(e, query));
      const blocks: HTMLElement[] = [];
      if (query.trim() === '') {
        const recent = recents();
        if (recent.length > 0) {
          blocks.push(
            buildGroup(
              m().commandRecent,
              recent.map((e) => buildItem(e, '-r')),
            ),
          );
        }
      }
      // Grupos na ordem em que aparecem; itens sem grupo ficam num bloco sem rótulo.
      const order: (string | undefined)[] = [];
      const byGroup = new Map<string | undefined, Entry[]>();
      for (const e of shown) {
        if (!byGroup.has(e.group)) {
          byGroup.set(e.group, []);
          order.push(e.group);
        }
        byGroup.get(e.group)?.push(e);
      }
      for (const g of order) {
        blocks.push(
          buildGroup(
            g,
            (byGroup.get(g) ?? []).map((e) => buildItem(e)),
          ),
        );
      }
      list.append(...blocks);
      if (errored) {
        emptyEl.textContent = m().commandError;
        emptyEl.hidden = false;
      } else if (shown.length === 0) {
        emptyEl.textContent = format(m().commandEmpty, { query: query.trim() });
        emptyEl.hidden = false;
      } else emptyEl.hidden = true;
      setHighlight(enabled()[0] ?? null, false);
    };

    const resultsText = (): string => {
      const count = enabled().length;
      return count === 0
        ? format(m().commandEmpty, { query: field.value.trim() })
        : count === 1
          ? m().comboboxResultsOne
          : format(m().comboboxResultsMany, { count });
    };
    const scheduleStatus = () => {
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        statusTimer = null;
        if (dialog.open) announcer.say(resultsText());
      }, STATUS_MS);
    };

    // ---- Busca ----------------------------------------------------------------------------
    const fetchRemote = async (query: string) => {
      if (!source) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      errored = false;
      dialog.setAttribute('aria-busy', 'true');
      // Busca remota: quem usa leitor de tela ouve que está carregando (o resultado vem depois).
      announcer.say(m().comboboxLoading);
      try {
        const init: FetchInit = {
          signal: current.signal,
          headers: { Accept: 'application/json' },
          edsLoader: false,
        };
        const response = await fetch(source + encodeURIComponent(query), init);
        if (!response.ok) throw new Error(String(response.status));
        const data: unknown = await response.json();
        if (current.signal.aborted) return;
        entries = (Array.isArray(data) ? data : [])
          .map(cleanItem)
          .filter((i): i is CommandItem => i !== null)
          .map((i) => ({ ...i, template: null }));
        for (const e of entries) known.set(e.value, e);
      } catch {
        if (current.signal.aborted) return;
        entries = [];
        errored = true;
      } finally {
        if (controller === current) {
          controller = null;
          dialog.removeAttribute('aria-busy');
        }
      }
      if (current.signal.aborted) return;
      render(query);
      if (errored) announcer.say(m().commandError);
      else scheduleStatus();
    };

    const search = () => {
      const query = field.value;
      if (timer) clearTimeout(timer);
      timer = null;
      if (!source) {
        render(query);
        scheduleStatus();
        return;
      }
      controller?.abort();
      if (query.trim().length < minChars) {
        // Abaixo do mínimo a fonte não é consultada: valem os itens locais, se houver.
        entries = local;
        errored = false;
        render(query);
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        void fetchRemote(query);
      }, DEBOUNCE_MS);
    };

    // ---- Escolha --------------------------------------------------------------------------
    const select = (option: HTMLElement) => {
      if (option.getAttribute('aria-disabled') === 'true') return;
      const value = option.getAttribute('data-value') ?? '';
      const label = (
        option.querySelector('.eds-command-label')?.textContent ??
        option.textContent ??
        ''
      ).trim();
      const href = option.getAttribute('data-href');
      if (recentMax > 0) {
        const ids = [value, ...readRecent(storageKey).filter((id) => id !== value)].slice(
          0,
          recentMax,
        );
        writeRecent(storageKey, ids);
      }
      const proceed = emit(dialog, 'command-select', { value, label, href, item: option }, true);
      dialog.close();
      if (proceed && href) window.location.assign(href);
    };

    const move = (step: number) => {
      const all = enabled();
      if (all.length === 0) return;
      const at = highlighted ? all.indexOf(highlighted) : -1;
      const next =
        at === -1 ? (step > 0 ? 0 : all.length - 1) : (at + step + all.length) % all.length;
      setHighlight(all[next] ?? null);
    };

    field.addEventListener('input', search, { signal });
    field.addEventListener(
      'keydown',
      (event) => {
        if (event.isComposing) return;
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            move(1);
            break;
          case 'ArrowUp':
            event.preventDefault();
            move(-1);
            break;
          case 'Home':
          case 'End':
            // Com a lista em foco virtual, Ctrl+Home/End vão ao primeiro e ao último.
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              const all = enabled();
              setHighlight((event.key === 'Home' ? all[0] : all[all.length - 1]) ?? null);
            }
            break;
          case 'Enter':
            event.preventDefault();
            if (highlighted) select(highlighted);
            break;
          default:
        }
      },
      { signal },
    );
    // O foco fica no campo: apertar numa opção não o tira dali.
    list.addEventListener('pointerdown', (event) => event.preventDefault(), { signal });
    list.addEventListener(
      'pointermove',
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
        if (option && option !== highlighted && option.getAttribute('aria-disabled') !== 'true') {
          setHighlight(option, false);
        }
      },
      { signal },
    );
    list.addEventListener(
      'click',
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
        if (option) select(option);
      },
      { signal },
    );

    // ---- Abrir e fechar -------------------------------------------------------------------
    const open = () => {
      if (dialog.open) return;
      field.value = '';
      errored = false;
      entries = local;
      dialog.showModal();
      field.setAttribute('aria-expanded', 'true');
      if (source && minChars === 0) void fetchRemote('');
      else render('');
      field.focus();
    };

    const onClose = () => {
      field.setAttribute('aria-expanded', 'false');
      field.removeAttribute('aria-activedescendant');
      controller?.abort();
      if (timer) clearTimeout(timer);
      if (statusTimer) clearTimeout(statusTimer);
      timer = statusTimer = null;
      announcer.say('');
    };
    dialog.addEventListener('close', onClose, { signal });
    // `showModal()` chamado de fora (ex.: `[data-eds-open]`): completa o estado.
    const observer = new MutationObserver(() => {
      if (dialog.open && field.getAttribute('aria-expanded') !== 'true') {
        field.value = '';
        errored = false;
        entries = local;
        field.setAttribute('aria-expanded', 'true');
        if (source && minChars === 0) void fetchRemote('');
        else render('');
        field.focus();
      }
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });

    // Atalho global.
    const shortcutAttr = (
      dialog.getAttribute('data-eds-command-shortcut') ?? DEFAULT_SHORTCUT
    ).trim();
    const shortcut = shortcutAttr === '' ? DEFAULT_SHORTCUT : shortcutAttr;
    if (flag(dialog, 'data-eds-command-shortcut', true)) {
      doc.addEventListener(
        'keydown',
        (event) => {
          if (event.defaultPrevented || event.isComposing) return;
          if (!matchesShortcut(event, shortcut)) return;
          // Teclas sem modificador ("/") não podem roubar o que se digita num campo.
          const target = event.target;
          if (
            !/[+]/.test(shortcut) &&
            target instanceof HTMLElement &&
            (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
          ) {
            return;
          }
          // Outro diálogo modal aberto não é interrompido.
          const other = doc.querySelector('dialog[open]');
          if (other && other !== dialog) return;
          event.preventDefault();
          if (dialog.open) dialog.close();
          else open();
        },
        { signal },
      );
    }

    // Itens da marcação saem do DOM: a lista é gerada a cada busca a partir do modelo. O
    // destroy devolve a marcação do autor (um novo init, como no StrictMode, a lê de novo).
    const savedMarkup = authored ? Array.from(list.childNodes) : [];
    if (authored) list.textContent = '';

    return () => {
      ac.abort();
      observer.disconnect();
      controller?.abort();
      if (timer) clearTimeout(timer);
      if (statusTimer) clearTimeout(statusTimer);
      announcer.dispose();
      if (authored) list.replaceChildren(...savedMarkup);
    };
  },
};

export function initCommand(root: ParentNode = document): () => void {
  return bindAll(root, [commandBehavior]);
}
