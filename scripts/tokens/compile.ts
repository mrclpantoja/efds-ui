/** Pipeline puro: textos JSON → CSS gerados (ou lista de problemas). */

import { parseTokenFile, type TokenFile, type TokenIssue } from './parse.ts';
import { buildOutputs } from './render.ts';
import { validateFiles } from './validate.ts';

export interface SourceInput {
  path: string;
  text: string;
}

export interface CompileResult {
  issues: TokenIssue[];
  outputs: Map<string, string>;
}

export function compileTokens(sources: SourceInput[]): CompileResult {
  const files: TokenFile[] = [];
  const issues: TokenIssue[] = [];
  for (const source of sources) {
    const result = parseTokenFile(source.path, source.text);
    issues.push(...result.issues);
    if (result.file) files.push(result.file);
  }
  // Só valida o conjunto quando todos os arquivos são estruturalmente válidos.
  if (issues.length === 0) issues.push(...validateFiles(files));
  return { issues, outputs: issues.length === 0 ? buildOutputs(files) : new Map() };
}

export function formatIssue(issue: TokenIssue): string {
  const where = issue.key ? `${issue.file} [${issue.key}]` : issue.file;
  return `${where}: ${issue.message}`;
}
