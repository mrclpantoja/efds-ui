import { verifyLicense } from './core';
import { LICENSE_DOCS_URL, defaultLicenseTexts, type LicenseBlockReason } from './messages';
import { PUBLIC_KEY } from './public-key';

interface GateWindow extends Window {
  EFDS_LICENSE?: unknown;
  EFDS_LICENSE_KEY?: string;
  EDS?: { init?: () => unknown };
}

export interface GateOptions {
  /** Chave pública; o padrão é a de produção. */
  publicKey?: string | Uint8Array;
  win?: GateWindow;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Esconde o conteúdo da página e mostra a tela de bloqueio. */
export function showBlock(doc: Document, reason: LicenseBlockReason): HTMLElement {
  for (const child of Array.from(doc.body.children)) {
    child.setAttribute('inert', '');
    child.setAttribute('hidden', '');
  }
  const message = defaultLicenseTexts.reasons[reason];

  const main = el(doc, 'main', 'eds-container eds-container-md');
  main.dataset.efdsLicenseBlock = reason;
  const box = el(doc, 'div', 'eds-empty eds-empty-error');
  box.setAttribute('role', 'alert');

  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'eds-empty-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');
  const circle = doc.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '9');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M12 8v4M12 16h.01');
  svg.append(circle, path);

  const title = el(doc, 'h1', 'eds-empty-title', message.title);
  title.tabIndex = -1;
  const actions = el(doc, 'div', 'eds-empty-actions');
  const link = el(doc, 'a', 'eds-button eds-button-primary', defaultLicenseTexts.docsLink);
  link.href = LICENSE_DOCS_URL;
  actions.append(link);
  box.append(
    svg,
    title,
    el(doc, 'p', 'eds-empty-text', message.description),
    el(doc, 'p', 'eds-empty-text', message.action),
    actions,
  );
  main.append(box);
  doc.body.append(main);
  title.focus();
  return main;
}

function fail(win: GateWindow, reason: LicenseBlockReason): void {
  showBlock(win.document, reason);
  win.dispatchEvent(new CustomEvent('efds:license-error', { detail: { reason } }));
}

/** Verifica a licença e, se válida, liga o behavior. */
export function runLicenseGate(options: GateOptions = {}): void {
  const win = options.win ?? (window as GateWindow);
  const result = verifyLicense(win.EFDS_LICENSE, win.EFDS_LICENSE_KEY, {
    publicKey: options.publicKey ?? PUBLIC_KEY,
    hostname: win.location.hostname,
  });
  if (!result.ok) {
    fail(win, result.reason);
    return;
  }
  if (typeof win.EDS?.init !== 'function') {
    fail(win, 'no-behavior');
    return;
  }
  win.EDS.init();
  win.dispatchEvent(new CustomEvent('efds:license-ok', { detail: { license: result.license } }));
}

/** Roda no DOMContentLoaded (ou já, se o documento foi lido). */
export function scheduleLicenseGate(options: GateOptions = {}): void {
  const win = options.win ?? (window as GateWindow);
  if (win.document.readyState === 'loading') {
    win.document.addEventListener('DOMContentLoaded', () => runLicenseGate(options), {
      once: true,
    });
  } else {
    runLicenseGate(options);
  }
}
