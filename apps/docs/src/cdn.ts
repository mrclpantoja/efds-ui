/**
 * Endereços públicos da versão publicada (npm + jsDelivr), fonte única das páginas de instalação.
 * Ao publicar uma versão nova: trocar VERSION e recalcular os hashes SRI (sha384 do arquivo do CDN).
 */
export const VERSION = '0.1.1';

const base = (pkg: string) => `https://cdn.jsdelivr.net/npm/@efds-ui/${pkg}@${VERSION}/dist`;

export const cdn = {
  coreCss: {
    url: `${base('core')}/index.css`,
    sri: 'sha384-86azce/Jbn1TjQ3pZXURLf012TGEU87eALT5TMhof2xKBF3e+k09npoAcKADH3GS',
  },
  themesCss: {
    url: `${base('themes')}/index.css`,
    sri: 'sha384-cX9DiImFYtbC1qbw36zZmvk6rCgENQ0zAPYNMIkdVN7DPmBezG9Fg2IKnQgA/TNQ',
  },
  behavior: {
    url: `${base('behavior')}/eds-behavior.js`,
    sri: 'sha384-NvUltZTPBgKPXMnpnQp+hNYWoF0+3+gKPU+kieqFE8uSRc8MoasbkmjJHZQ8vUCo',
  },
  behaviorCore: {
    url: `${base('behavior')}/eds-behavior-core.js`,
    sri: 'sha384-InS15WwJPeLqD9xzms5HvF4WFY6aaYFR1zVmjoLC/1FS9CVvpYkuJpYPlfU+M78Z',
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
