import type { FilesAdapter } from './types';

/** Configuração global do Gerenciador de arquivos (`configure({ files })`). Só estado de módulo. */
export interface FilesConfig {
  /** Cabeçalhos de toda requisição ao servidor (CSRF, token). Função: lida a cada chamada. */
  headers?: Record<string, string> | (() => Record<string, string>);
  credentials?: RequestCredentials;
  /**
   * Adaptador próprio no lugar do cliente HTTP (GraphQL, tRPC, demos). Função: recebe o valor de
   * `data-eds-files-api` e o elemento.
   */
  adapter?: FilesAdapter | ((api: string, el: HTMLElement) => FilesAdapter);
}

let config: FilesConfig = {};

export function getFilesConfig(): FilesConfig {
  return config;
}

export function setFilesConfig(value: FilesConfig | undefined): void {
  if (value) config = { ...config, ...value };
}

export function resetFilesConfig(): void {
  config = {};
}
