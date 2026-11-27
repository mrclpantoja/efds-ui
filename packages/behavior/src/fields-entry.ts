/**
 * Entrada `@efds-ui/behavior/fields`: regras puras dos campos (força da senha, distribuição
 * do OTP, aritmética do NumberInput e consulta de CEP), sem DOM e sem `init`, para o
 * `@efds-ui/react` usar exatamente a mesma lógica do HTML por atributos.
 */
export {
  PASSWORD_RULE_IDS,
  checkPassword,
  clampNumber,
  decimalsOf,
  otpFill,
  otpSanitize,
  roundTo,
  stepNumber,
  toLookupItem,
} from './core/fields';
export type {
  LookupItem,
  NumberRange,
  OtpKind,
  PasswordCheck,
  PasswordLevel,
  PasswordRuleId,
} from './core/fields';
export { cepDigits, cepRequestUrl, lookupCep } from './core/cep';
export type { CepAddress, CepResult } from './core/cep';
