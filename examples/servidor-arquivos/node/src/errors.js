// Erros da API no formato do contrato: status HTTP + { error: { code, message, path? } }.

const STATUS = {
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  invalid_name: 400,
  too_large: 413,
  type_not_allowed: 415,
  quota_exceeded: 507,
  unsupported: 501,
  internal: 500,
};

export class FilesError extends Error {
  /**
   * @param {keyof typeof STATUS} code
   * @param {string} message texto pt-BR mostrado ao usuário
   * @param {{ status?: number, path?: string }} [extra]
   */
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'FilesError';
    this.code = code;
    this.status = extra.status ?? STATUS[code] ?? 500;
    this.path = extra.path;
  }

  toJSON() {
    const error = { code: this.code, message: this.message };
    if (this.path) error.path = this.path;
    return { error };
  }
}

export const notFound = (path) => new FilesError('not_found', 'Item não encontrado.', { path });
export const forbidden = (path) =>
  new FilesError('forbidden', 'Você não tem permissão para esta operação.', { path });
export const conflict = (message, path) => new FilesError('conflict', message, { path });
export const badRequest = (message, path) => new FilesError('invalid_name', message, { path });
