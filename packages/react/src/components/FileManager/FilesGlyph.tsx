import { FILES_ICONS, type FilesIcon } from '@efds-ui/behavior/internal';
import { Glyph } from '../../internal/Glyph';

/** Ícone do Gerenciador de arquivos (contornos comuns ao HTML, em `@efds-ui/behavior/internal`). */
export function FilesGlyph({ name, className }: { name: FilesIcon; className?: string }) {
  return <Glyph d={FILES_ICONS[name]} className={className || undefined} />;
}
