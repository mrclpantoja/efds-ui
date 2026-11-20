/**
 * Entrada do pacote para <script src defer>: expõe `window.EDS` e liga tudo sozinho.
 * Configuração pela própria tag:
 *   data-eds-manual                   não liga sozinho (chame EDS.init())
 *   data-eds-loader="auto|manual|off" PageLoader (padrão: auto)
 *   data-eds-loader-title / -text     textos padrão do loader
 *   data-eds-loader-slow-after="ms"   quando oferecer "Fechar" / "Continuar aguardando"
 *   data-eds-loader-trigger="all|user" todo fetch/XHR (padrão) ou só os iniciados pelo usuário
 *   data-eds-native-alert             window.alert vira EDS.alert (não bloqueia)
 */
import { configure, init } from './index';
import type { LoaderOptions } from './components/loader';

export * from './index';

let nativeAlert = false;

function startWhenReady(): void {
  const start = () => {
    init(document, nativeAlert ? { nativeAlert: true } : undefined);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

const script = document.currentScript;
if (script instanceof HTMLScriptElement) {
  const mode = script.getAttribute('data-eds-loader');
  const trigger = script.getAttribute('data-eds-loader-trigger');
  const slow = script.getAttribute('data-eds-loader-slow-after');
  const title = script.getAttribute('data-eds-loader-title');
  const text = script.getAttribute('data-eds-loader-text');
  const loader: LoaderOptions = {};
  if (mode === 'auto' || mode === 'manual' || mode === 'off') loader.mode = mode;
  if (trigger === 'all' || trigger === 'user') loader.trigger = trigger;
  if (slow !== null && slow.trim() !== '' && !Number.isNaN(Number(slow))) {
    loader.slowAfter = Number(slow);
  }
  if (title !== null) loader.title = title;
  if (text !== null) loader.text = text;
  if (Object.keys(loader).length > 0) configure({ loader });
  nativeAlert = script.hasAttribute('data-eds-native-alert');
  if (!script.hasAttribute('data-eds-manual')) startWhenReady();
} else {
  startWhenReady();
}
