import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados do Visualizador de arquivos. Não exportados pelo pacote. */
export const ViewerDownloadGlyph = (p: P) => <Glyph d="M12 4v11M7 11l5 5 5-5M5 20h14" {...p} />;
export const ViewerOpenGlyph = (p: P) => (
  <Glyph d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" {...p} />
);
export const ViewerFullscreenGlyph = (p: P) => (
  <Glyph d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...p} />
);
export const ViewerExitFullscreenGlyph = (p: P) => (
  <Glyph d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" {...p} />
);
export const ViewerFitGlyph = (p: P) => (
  <Glyph
    d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3M9 9h6v6H9z"
    {...p}
  />
);
export const ViewerFileGlyph = (p: P) => (
  <Glyph d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" {...p} />
);
export const ViewerAlertGlyph = (p: P) => (
  <Glyph d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5M12 16h.01" {...p} />
);
