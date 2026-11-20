import { initWith } from './init-with';
import type { BehaviorOptions } from './setup';
// Exportação
import { initTableExport, tableExportBehavior } from './components/table-export';
// Máscara de entrada
import { initMask, maskBehavior } from './components/mask';

export * from './setup';

/**
 * Liga todos os componentes encontrados em `root` (e os que aparecerem depois nele) e o
 * PageLoader. Devolve `destroy()`. Nada fora de `root` é ligado.
 */
export function init(root: ParentNode = document, options?: BehaviorOptions): () => void {
  return initWith(root, options, [tableExportBehavior, maskBehavior]);
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
