import { initWith } from './init-with';
import type { BehaviorOptions } from './setup';
// Exportação
import { initTableExport, tableExportBehavior } from './components/table-export';
// Máscara de entrada
import { initMask, maskBehavior } from './components/mask';
// Onda C: CEP e formatadores (só na compilação completa)
import { cepBehavior, initCep } from './components/cep';
import { formatBehavior, initFormat } from './components/format';
import { themeColorBehavior } from './components/theme-color';
// Onda D: paleta de comandos e agenda (só na compilação completa)
import { agendaBehavior, initAgenda } from './components/agenda';
import { commandBehavior, initCommand } from './components/command';

export * from './setup';

/**
 * Liga todos os componentes encontrados em `root` (e os que aparecerem depois nele) e o
 * PageLoader. Devolve `destroy()`. Nada fora de `root` é ligado.
 */
export function init(root: ParentNode = document, options?: BehaviorOptions): () => void {
  return initWith(root, options, [
    tableExportBehavior,
    maskBehavior,
    cepBehavior,
    formatBehavior,
    themeColorBehavior,
    commandBehavior,
    agendaBehavior,
  ]);
}

// Exportação
export { exportData, toCsv, toJson, toPdf, toXlsx } from './export';
export type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from './export';
export type { ExportScope } from './components/table-export';
export { initTableExport };
// Máscara de entrada
export { createMask } from './core/mask';
export type { Mask, MaskName, MaskOptions } from './core/mask';
export { initMask };
// Onda C: CEP, formatadores e campos
export { initCep, initFormat };
export { lookupCep } from './core/cep';
export type { CepAddress, CepResult } from './core/cep';
export {
  formatBy,
  formatCep,
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhone,
  formatRelative,
  maskCpf,
  parseDate,
  parseNumber,
} from './core/format';
export type { FormatName } from './core/format';
export { checkPassword } from './core/fields';
export type { PasswordCheck, PasswordLevel, PasswordRuleId } from './core/fields';
// Onda C: tema por cor da organização
export { createTheme, applyTheme, contrastRatio, normalizeHex } from './theme/create-theme';
export type { ContrastCheck, ThemeOptions, ThemeResult, ThemeStep } from './theme/create-theme';
// Onda D: paleta de comandos e agenda
export { initAgenda, initCommand };
export type { AgendaEvent, AgendaTone } from './components/agenda';
export type { CommandItem } from './components/command';
