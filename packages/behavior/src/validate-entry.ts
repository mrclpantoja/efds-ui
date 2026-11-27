/**
 * Entrada `@efds-ui/behavior/validate`: validadores brasileiros (funções puras, sem dependência) e
 * as regras de texto do resumo de erros, para o `@efds-ui/react` usar exatamente a mesma lógica do
 * HTML por atributos (`data-eds-validate`).
 */
export {
  VALIDATOR_MESSAGE_KEY,
  VALIDATOR_NAMES,
  isCep,
  isCnpj,
  isCpf,
  isCpfOuCnpj,
  isDataValida,
  isEmail,
  isIntervaloDatas,
  isPis,
  isPlaca,
  isTelefone,
  isTituloEleitor,
  isValidatorName,
  onlyDigits,
  parseData,
  validateBy,
  validationMessages,
} from './core/validate';
export type {
  DataOptions,
  DateParts,
  TelefoneOptions,
  ValidateOptions,
  ValidationMessages,
  ValidatorName,
} from './core/validate';
export {
  applyValidator,
  applyValidatorBy,
  isFormControl,
  representativeOf,
  validatableControls,
  composeErrorText,
  fieldLabel,
  fieldMessage,
  summaryTitle,
  validatorMessage,
} from './core/form-errors';
export type { FormControl, InvalidField } from './core/form-errors';
