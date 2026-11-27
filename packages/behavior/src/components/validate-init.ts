import { bindAll } from '../core/registry';
import { errorSummaryBehavior } from './error-summary';
import { validateBehavior, validateFormBehavior } from './form-validation';

/** Liga só a validação de formulários (`data-eds-validate`, `data-eds-validate-form`, resumo de erros). */
export function initValidate(root: ParentNode = document): () => void {
  return bindAll(root, [validateBehavior, validateFormBehavior, errorSummaryBehavior]);
}
