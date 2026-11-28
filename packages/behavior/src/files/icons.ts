/**
 * Contornos (viewBox 24, traço de 2) dos ícones do Gerenciador de arquivos, comuns ao HTML e ao
 * React. Próprios do projeto; a cor é `currentColor`.
 */
const SHEET = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5';

export const FILES_ICONS = {
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  pdf: `${SHEET}M9 13h6M9 17h6`,
  image:
    'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9.5h.01M4 17l5-5 4 4 3-3 4 4',
  video:
    'M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM16 10l5-3v10l-5-3',
  audio: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  text: `${SHEET}M9 9h2M9 13h6M9 17h4`,
  other: SHEET,
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  upload: 'M12 16V4m0 0L8 8m4-4l4 4M4 20h16',
  download: 'M12 4v12m0 0l-4-4m4 4l4-4M4 20h16',
  newFolder:
    'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM12 10v5M9.5 12.5h5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  back: 'M19 12H5m0 0l6-6m-6 6l6 6',
  close: 'M18 6L6 18M6 6l12 12',
  restore: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  paste: 'M9 4h6v3H9zM7 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2',
  chevron: 'M9 6l6 6-6 6',
  alert:
    'M12 8v5m0 3h.01M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v5l3 2',
} as const;

export type FilesIcon = keyof typeof FILES_ICONS;
