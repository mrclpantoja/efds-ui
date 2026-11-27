/**
 * Entrada `@efds-ui/behavior/validate`: validadores brasileiros (funções puras, sem DOM e sem
 * dependência), os mesmos do HTML por atributos (`data-eds-validate`) e do `@efds-ui/react`.
 */
export {
  VALIDATOR_MESSAGE_KEY,
  VALIDATOR_NAMES,
  isCep,
  isCnpj,
  isCpf,
  isCpfCnpj,
  isDate,
  isEmail,
  isDateRange,
  isPis,
  isPlate,
  isPhone,
  isVoterId,
  isValidatorName,
  onlyDigits,
  parseDateParts,
  validateBy,
  validationMessages,
} from './core/validate';
export type {
  DateOptions,
  DateParts,
  PhoneOptions,
  ValidateOptions,
  ValidationMessages,
  ValidatorName,
} from './core/validate';
export type { InvalidField } from './core/form-errors';
