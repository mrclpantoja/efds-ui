// Trilha de auditoria: quem, o quê, quando. Nunca grava o conteúdo dos arquivos.

/** @param {(line: string) => void} [write] padrão: stdout (uma linha JSON por evento) */
export function createAudit(write = (line) => process.stdout.write(line + '\n')) {
  return function audit({ user, action, paths = [], outcome = 'ok', code }) {
    write(
      JSON.stringify({
        ts: new Date().toISOString(),
        type: 'files.audit',
        user: user?.id ?? null,
        action,
        paths,
        outcome,
        ...(code ? { code } : {}),
      }),
    );
  };
}
