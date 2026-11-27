import { format, getMessages } from '../core/config';
import { checkPassword, type PasswordLevel, type PasswordRuleId } from '../core/fields';
import { emit, flag } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

/** O anúncio da força espera a pessoa parar de digitar (e também sai ao sair do campo). */
const ANNOUNCE_DELAY_MS = 1200;

/** Regras de um item: `data-rule` ou, na falta, palavras do texto ("Letras maiúsculas e minúsculas" são duas). */
function ruleIdsOf(item: HTMLElement): PasswordRuleId[] {
  const declared = item.getAttribute('data-rule');
  if (declared) {
    return declared
      .split(/[\s,]+/)
      .filter((id): id is PasswordRuleId =>
        ['length', 'lower', 'upper', 'digit', 'symbol'].includes(id),
      );
  }
  const text = (item.textContent ?? '').toLowerCase();
  const ids: PasswordRuleId[] = [];
  if (/caracteres|tamanho|comprimento/.test(text)) ids.push('length');
  if (/maiúscul|maiuscul/.test(text)) ids.push('upper');
  if (/minúscul|minuscul/.test(text)) ids.push('lower');
  if (/número|numero|dígito|digito/.test(text)) ids.push('digit');
  if (/símbolo|simbolo|especia/.test(text)) ids.push('symbol');
  return ids;
}

/**
 * Senha: `input[data-eds-password]` com o botão `[data-eds-password-toggle]` (mostrar/ocultar, com
 * `aria-pressed` e nome fixo), e, com `data-eds-password-strength`, a força (`.eds-password-strength`,
 * `data-level` 0 a 4, texto sempre visível) e as regras (`.eds-password-rules > li`, `data-met`).
 * A senha nunca sai do navegador. O anúncio da força é por pausa na digitação ou ao sair do campo
 * (nunca por tecla). Ao enviar o formulário o campo volta a ser oculto. Evento `eds:password-strength-change`
 * (`{ level, rules }`).
 */
export const passwordBehavior: Behavior = {
  name: 'password',
  selector: 'input[data-eds-password]',
  bind(el) {
    if (!(el instanceof HTMLInputElement)) return;
    const input = el;
    const scope =
      input.closest<HTMLElement>('.eds-field, .eds-secret') ?? input.parentElement ?? input;
    const toggle = scope.querySelector<HTMLElement>('[data-eds-password-toggle]');
    const meter = flag(input, 'data-eds-password-strength')
      ? scope.querySelector<HTMLElement>('.eds-password-strength')
      : null;
    const rulesList = scope.querySelector<HTMLElement>('.eds-password-rules');
    const min = Number(
      input.getAttribute('data-eds-password-min') ?? input.getAttribute('minlength') ?? 8,
    );

    const ac = new AbortController();
    const { signal } = ac;
    const cleanups: (() => void)[] = [];

    // ---- Mostrar / ocultar -----------------------------------------------------------------
    if (toggle) {
      if (!toggle.hasAttribute('aria-pressed')) toggle.setAttribute('aria-pressed', 'false');
      if (!toggle.hasAttribute('aria-label') && (toggle.textContent ?? '').trim() === '') {
        toggle.setAttribute('aria-label', getMessages().passwordShow);
      }
      // Clicar no botão com o mouse não tira o foco do campo.
      toggle.addEventListener(
        'pointerdown',
        (event) => {
          if (document.activeElement === input) event.preventDefault();
        },
        { signal },
      );
      toggle.addEventListener(
        'click',
        () => {
          const start = input.selectionStart;
          const end = input.selectionEnd;
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          toggle.setAttribute('aria-pressed', String(show));
          // Trocar o tipo pode zerar a seleção em alguns navegadores.
          if (start !== null && end !== null) {
            try {
              input.setSelectionRange(start, end);
            } catch {
              /* tipo sem seleção */
            }
          }
        },
        { signal },
      );
      // Envio e restauração de página: o campo volta a ficar oculto.
      const hide = () => {
        if (input.type === 'text') {
          input.type = 'password';
          toggle.setAttribute('aria-pressed', 'false');
        }
      };
      input.form?.addEventListener('submit', hide, { signal });
    }

    // ---- Força e regras --------------------------------------------------------------------
    if (meter || rulesList) {
      const text = meter
        ? (meter.querySelector<HTMLElement>('.eds-password-strength-text') ?? null)
        : null;
      const status = meter ? document.createElement('span') : null;
      if (meter && status) {
        status.className = 'eds-visually-hidden';
        status.setAttribute('role', 'status');
        meter.after(status);
        cleanups.push(() => status.remove());
      }
      const announcer = createAnnouncer(status);
      const items = rulesList
        ? Array.from(rulesList.querySelectorAll<HTMLElement>(':scope > li')).map((item) => {
            // O texto oculto "Atendida: "/"Pendente: " pode já vir no HTML; senão é criado.
            let hint = item.querySelector<HTMLElement>(':scope > .eds-visually-hidden');
            if (!hint) {
              const made = document.createElement('span');
              made.className = 'eds-visually-hidden';
              item.prepend(made);
              cleanups.push(() => made.remove());
              hint = made;
            }
            return { item, hint, ids: ruleIdsOf(item) };
          })
        : [];

      let lastLevel = -1;
      let lastAnnounced = -1;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const levelName = (level: PasswordLevel): string => {
        const m = getMessages();
        return level === 1
          ? m.passwordLevelWeak
          : level === 2
            ? m.passwordLevelFair
            : level === 3
              ? m.passwordLevelGood
              : m.passwordLevelStrong;
      };
      const announce = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        const { level } = checkPassword(input.value, min);
        if (level === 0 || level === lastAnnounced) return;
        lastAnnounced = level;
        announcer.say(format(getMessages().passwordStrengthAnnounce, { level: levelName(level) }));
      };
      const update = () => {
        const m = getMessages();
        const result = checkPassword(input.value, min);
        if (meter) {
          meter.setAttribute('data-level', String(result.level));
          if (text) {
            text.textContent =
              result.level === 0
                ? m.passwordStrengthEmpty
                : format(m.passwordStrength, { level: levelName(result.level) });
          }
        }
        for (const { item, hint, ids } of items) {
          if (ids.length === 0) continue;
          const met = ids.every((id) => result.rules[id]);
          item.toggleAttribute('data-met', met);
          hint.textContent = met ? m.passwordRuleMet : m.passwordRuleUnmet;
        }
        if (result.level !== lastLevel) {
          lastLevel = result.level;
          emit(input, 'password-strength-change', { level: result.level, rules: result.rules });
        }
      };
      update();
      input.addEventListener(
        'input',
        () => {
          update();
          if (timer) clearTimeout(timer);
          timer = setTimeout(announce, ANNOUNCE_DELAY_MS);
        },
        { signal },
      );
      input.addEventListener('blur', announce, { signal });
      cleanups.push(() => {
        if (timer) clearTimeout(timer);
        announcer.dispose();
      });
    }

    return () => {
      ac.abort();
      for (const stop of cleanups) stop();
    };
  },
};

export function initPassword(root: ParentNode = document): () => void {
  return bindAll(root, [passwordBehavior]);
}
