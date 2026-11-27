import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { checkPassword, type PasswordLevel, type PasswordRuleId } from '@efds-ui/behavior/fields';

export type { PasswordLevel };
import { useAnnouncer } from '../../internal/announcer';
import { EyeGlyph, EyeOffGlyph } from '../../internal/glyphs-c1';
import { mergeRefs } from '../../internal/refs-d';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { Input, type InputProps } from '../Input';

export interface PasswordRule {
  /** Uma ou mais regras avaliadas; o item fica atendido quando todas são. */
  id: PasswordRuleId | readonly PasswordRuleId[];
  label: ReactNode;
}

/** Textos internos do PasswordInput (padrões em pt-BR). */
export interface PasswordInputTexts {
  /** Nome do botão (fixo; o estado vai em `aria-pressed`). */
  show: string;
  strength: (level: string) => string;
  strengthEmpty: string;
  announce: (level: string) => string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  ruleMet: string;
  ruleUnmet: string;
  /** Regras padrão de `rules`. */
  ruleLength: (min: number) => string;
  ruleCase: string;
  ruleDigit: string;
  ruleSymbol: string;
}

const defaultTexts: PasswordInputTexts = {
  show: 'Mostrar senha',
  strength: (level) => `Força: ${level}`,
  strengthEmpty: 'Força: não avaliada',
  announce: (level) => `Força da senha: ${level}.`,
  level1: 'fraca',
  level2: 'razoável',
  level3: 'boa',
  level4: 'forte',
  ruleMet: 'Atendida: ',
  ruleUnmet: 'Pendente: ',
  ruleLength: (min) => `Ao menos ${min} caracteres`,
  ruleCase: 'Letras maiúsculas e minúsculas',
  ruleDigit: 'Ao menos um número',
  ruleSymbol: 'Ao menos um símbolo',
};

export interface PasswordInputProps extends Omit<
  InputProps,
  'type' | 'mask' | 'maskOptions' | 'unmask' | 'onValueChange' | 'texts'
> {
  /** Mostra a barra e o texto da força (0 a 4), calculados no navegador (a senha não sai dele). */
  strength?: boolean;
  /** `true` para as regras padrão ou a lista das suas; cada uma mostra atendida/pendente em texto. */
  rules?: boolean | readonly PasswordRule[];
  /** Comprimento da regra de tamanho e do cálculo. Padrão: 8. */
  minLength?: number;
  /** Chamado quando o nível de força muda. */
  onStrengthChange?: (level: PasswordLevel) => void;
  texts?: Partial<PasswordInputTexts>;
}

/** O anúncio da força espera a pessoa parar de digitar (e sai ao sair do campo). */
const ANNOUNCE_DELAY_MS = 1200;

/**
 * Campo de senha com mostrar/ocultar (`aria-pressed`, nome fixo) e, opcionalmente, força e regras.
 * Dentro de um `Field`, o rótulo, a ajuda e o erro ligam ao campo como no `Input`. Use
 * `autoComplete="new-password"` ao criar a senha e `"current-password"` ao entrar.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      strength = false,
      rules = false,
      minLength = 8,
      onStrengthChange,
      texts: textsProp,
      size,
      className,
      value,
      defaultValue,
      onChange,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const t = mergeTexts(defaultTexts, textsProp);
    const uid = useId();
    const strengthId = `${uid}-str`;
    const rulesId = `${uid}-req`;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const merged = useMemo(() => mergeRefs(ref, inputRef), [ref]);
    const [shown, setShown] = useState(false);
    const [inner, setInner] = useState(defaultValue === undefined ? '' : String(defaultValue));
    const text = value !== undefined ? String(value) : inner;
    const selection = useRef<[number, number] | null>(null);

    const check = useMemo(() => checkPassword(text, minLength), [text, minLength]);
    const ruleList: readonly PasswordRule[] =
      rules === false
        ? []
        : rules === true
          ? [
              { id: 'length', label: t.ruleLength(minLength) },
              { id: ['upper', 'lower'], label: t.ruleCase },
              { id: 'digit', label: t.ruleDigit },
              { id: 'symbol', label: t.ruleSymbol },
            ]
          : rules;

    const levelName = (level: PasswordLevel): string =>
      level === 1 ? t.level1 : level === 2 ? t.level2 : level === 3 ? t.level3 : t.level4;

    const lastLevel = useRef<PasswordLevel>(check.level);
    useEffect(() => {
      if (lastLevel.current !== check.level) {
        lastLevel.current = check.level;
        onStrengthChange?.(check.level);
      }
    }, [check.level, onStrengthChange]);

    // Anúncio: por pausa na digitação ou ao sair do campo, uma vez por nível.
    const { text: said, announce } = useAnnouncer();
    const announced = useRef<number>(-1);
    const level = check.level;
    const say = (l: PasswordLevel, levelText: string) => {
      if (l === 0 || l === announced.current) return;
      announced.current = l;
      announce(levelText);
    };
    const sayRef = useRef(say);
    sayRef.current = say;
    const announceText = level === 0 ? '' : t.announce(levelName(level));
    useEffect(() => {
      if (!strength || text === '') return undefined;
      const timer = setTimeout(() => sayRef.current(level, announceText), ANNOUNCE_DELAY_MS);
      return () => clearTimeout(timer);
    }, [strength, text, level, announceText]);

    // Trocar o tipo pode zerar a seleção: devolve-a.
    useEffect(() => {
      const input = inputRef.current;
      const sel = selection.current;
      selection.current = null;
      if (input && sel) {
        try {
          input.setSelectionRange(sel[0], sel[1]);
        } catch {
          /* tipo sem seleção */
        }
      }
    }, [shown]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      setInner(event.target.value);
      onChange?.(event);
    };
    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      if (strength) sayRef.current(level, announceText);
      onBlur?.(event);
    };

    const describedBy =
      [rest['aria-describedby'], strength && strengthId, ruleList.length > 0 && rulesId]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <>
        <div className={cx('eds-input-group', size && size !== 'md' && `eds-input-group-${size}`)}>
          <Input
            {...rest}
            ref={merged}
            type={shown ? 'text' : 'password'}
            size={size}
            className={className}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-describedby={describedBy}
          />
          <Button
            type="button"
            variant="ghost"
            iconOnly
            className="eds-input-group-button"
            aria-label={t.show}
            aria-pressed={shown}
            disabled={rest.disabled}
            onPointerDown={(event) => {
              // O mouse não tira o foco do campo.
              if (document.activeElement === inputRef.current) event.preventDefault();
            }}
            onClick={() => {
              const input = inputRef.current;
              if (input && input.selectionStart !== null && input.selectionEnd !== null) {
                selection.current = [input.selectionStart, input.selectionEnd];
              }
              setShown((v) => !v);
            }}
          >
            {shown ? <EyeOffGlyph /> : <EyeGlyph />}
          </Button>
        </div>
        {strength && (
          <>
            <div className="eds-password-strength" id={strengthId} data-level={check.level}>
              <span className="eds-password-strength-bar" />
              <span className="eds-password-strength-text">
                {check.level === 0 ? t.strengthEmpty : t.strength(levelName(check.level))}
              </span>
            </div>
            <span className="eds-visually-hidden" role="status">
              {said}
            </span>
          </>
        )}
        {ruleList.length > 0 && (
          <ul className="eds-password-rules" id={rulesId}>
            {ruleList.map((rule, index) => {
              const ids: readonly PasswordRuleId[] =
                typeof rule.id === 'string' ? [rule.id] : rule.id;
              const met = ids.every((id) => check.rules[id]);
              return (
                <li key={index} data-met={met ? '' : undefined}>
                  <span className="eds-visually-hidden">{met ? t.ruleMet : t.ruleUnmet}</span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
