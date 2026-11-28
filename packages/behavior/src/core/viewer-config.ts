import type { ViewerOptions } from './viewer-logic';

/** Opções globais do Visualizador (`configure({ viewer })`); cada chamada pode sobrescrevê-las. */
let current: ViewerOptions = {};

export function getViewerConfig(): ViewerOptions {
  return current;
}

export function setViewerConfig(options: ViewerOptions | undefined): void {
  if (options) current = { ...current, ...options };
}

export function resetViewerConfig(): void {
  current = {};
}
