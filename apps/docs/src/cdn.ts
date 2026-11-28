/**
 * Endereços públicos da versão publicada (npm + jsDelivr), fonte única das páginas de instalação.
 * Ao publicar uma versão nova: trocar VERSION e recalcular os hashes SRI (sha384 do arquivo do CDN).
 */
export const VERSION = '1.0.0';

const base = (pkg: string) => `https://cdn.jsdelivr.net/npm/@efds-ui/${pkg}@${VERSION}/dist`;

export const cdn = {
  coreCss: {
    url: `${base('core')}/index.css`,
    sri: 'sha384-uypeh/ReZcnn9qqCi9cf+7hu3TF+AfcIhU8pSd47lphXuedZwXesOW21VnV3nGY5',
  },
  themesCss: {
    url: `${base('themes')}/index.css`,
    sri: 'sha384-cX9DiImFYtbC1qbw36zZmvk6rCgENQ0zAPYNMIkdVN7DPmBezG9Fg2IKnQgA/TNQ',
  },
  behavior: {
    url: `${base('behavior')}/eds-behavior.js`,
    sri: 'sha384-LjTOmBvTVvl4E+H+/WqQBWVSTi8Qqgea2GOclyocB5TF47GlS3fH6n7+TIqGeCL/',
  },
  behaviorCore: {
    url: `${base('behavior')}/eds-behavior-core.js`,
    sri: 'sha384-Y6T1Rs2ck/PVKMHMq3Mcco32WRmpxwXuMhc+9l+1SmUi+juMaaswDWJboL7gNWue',
  },
  editor: {
    url: `${base('editor')}/eds-editor.js`,
    sri: 'sha384-96lHkle0R6axzRVtgh9TAa7QJ9kclLfnrD8hyk165JAFAbziD5CP2rapBvmixlFz',
  },
} as const;

type Asset = { url: string; sri: string };

/** `<link rel="stylesheet">` com integridade. */
export const cssTag = (a: Asset, indent = '') =>
  `${indent}<link rel="stylesheet" href="${a.url}"\n${indent}      integrity="${a.sri}" crossorigin="anonymous" />`;

/** `<script defer>` com integridade; `extra` = atributos a mais (ex.: `data-eds-manual`). */
export const scriptTag = (a: Asset, indent = '', extra = '') =>
  `${indent}<script src="${a.url}"\n${indent}        integrity="${a.sri}" crossorigin="anonymous"${extra ? ` ${extra}` : ''} defer></script>`;
