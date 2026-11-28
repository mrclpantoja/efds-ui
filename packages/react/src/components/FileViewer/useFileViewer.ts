import { useCallback, useMemo, useState } from 'react';
import type { ViewerItem } from '@efds-ui/behavior/internal';
import type { FileViewerProps } from './FileViewer';

/** Props que o hook controla; o resto (`texts`, `pdf`, `actions`...) o autor passa direto. */
export type FileViewerControlProps = Pick<
  FileViewerProps,
  'items' | 'index' | 'open' | 'onIndexChange' | 'onClose'
>;

export interface UseFileViewerResult {
  /** Abre o visualizador com `items` no `index` (padrão 0). */
  open: (items: readonly ViewerItem[], index?: number) => void;
  close: () => void;
  /** Espalhe em `<FileViewer {...viewerProps} />`. */
  viewerProps: FileViewerControlProps;
}

/**
 * Estado do `FileViewer` para abrir de qualquer lugar (um link, uma linha de tabela, um menu):
 * `const viewer = useFileViewer(); viewer.open(arquivos, 2); <FileViewer {...viewer.viewerProps} />`.
 */
export function useFileViewer(): UseFileViewerResult {
  const [state, setState] = useState<{
    items: readonly ViewerItem[];
    index: number;
    open: boolean;
  }>({ items: [], index: 0, open: false });
  const open = useCallback((items: readonly ViewerItem[], index = 0) => {
    setState({ items, index, open: items.length > 0 });
  }, []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const onIndexChange = useCallback((index: number) => setState((s) => ({ ...s, index })), []);
  const viewerProps = useMemo<FileViewerControlProps>(
    () => ({
      items: state.items,
      index: state.index,
      open: state.open,
      onIndexChange,
      onClose: close,
    }),
    [state, onIndexChange, close],
  );
  return { open, close, viewerProps };
}
