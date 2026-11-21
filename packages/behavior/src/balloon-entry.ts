/**
 * Entrada `@efds-ui/behavior/balloon`: os comportamentos de Tooltip e Popover como `Behavior`
 * avulsos (sem `init` nem observador), para o `@efds-ui/react` ligar o mesmo código do HTML.
 */
export { tooltipBehavior, TOOLTIP_SHOW_DELAY } from './components/tooltip';
export { popoverBehavior } from './components/popover';
export type { Behavior } from './core/registry';
export type { Placement } from './core/position';
