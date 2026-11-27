/**
 * Leitura da tag `<script>` e auto-init, comum às duas compilações para <script src defer>
 * (`iife.ts` completa e `iife-core.ts` sem exportador e sem máscara).
 * Configuração pela própria tag:
 *   data-eds-manual                   não liga sozinho (chame EDS.init())
 *   data-eds-loader-mode="auto|manual|off" PageLoader (padrão: auto)
 *   data-eds-loader-title / -text     textos padrão do loader
 *   data-eds-loader-slow-after="ms"   quando oferecer "Fechar" / "Continuar aguardando"
 *   data-eds-loader-trigger="all|user" todo fetch/XHR (padrão) ou só os iniciados pelo usuário
 *   data-eds-native-alert             window.alert vira EDS.alert (não bloqueia)
 *   data-eds-cep-url="https://…/{cep}" serviço de CEP (vazio por padrão: sem chamada externa)
 */
import { flag } from './core/dom';
import type { LoaderOptions } from './components/loader';
import type { BehaviorOptions } from './setup';

/** Deve ser chamada na avaliação do script (usa `document.currentScript`). */
export function boot(
  init: (root?: ParentNode, options?: BehaviorOptions) => () => void,
  configure: (options: BehaviorOptions) => void,
): void {
  let nativeAlert = false;

  const startWhenReady = (): void => {
    const start = () => {
      init(document, nativeAlert ? { nativeAlert: true } : undefined);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  };

  const script = document.currentScript;
  if (script instanceof HTMLScriptElement) {
    const mode = script.getAttribute('data-eds-loader-mode');
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
    const cepUrl = script.getAttribute('data-eds-cep-url');
    if (cepUrl !== null && cepUrl.trim() !== '') configure({ cepUrl: cepUrl.trim() });
    nativeAlert = flag(script, 'data-eds-native-alert');
    if (!flag(script, 'data-eds-manual')) startWhenReady();
  } else {
    startWhenReady();
  }
}
