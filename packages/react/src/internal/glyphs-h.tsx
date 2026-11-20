import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifo privado do lote H (exportação de tabelas). Não exportado pelo pacote. */
export const DownloadGlyph = (p: P) => <Glyph d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" {...p} />;
