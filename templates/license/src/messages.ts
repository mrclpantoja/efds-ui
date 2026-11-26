import type { LicenseFailure } from './core';

export const LICENSE_DOCS_URL = 'https://efds-ui.com.br/templates/licenca';

export type LicenseBlockReason = LicenseFailure | 'no-behavior';

export interface LicenseMessage {
  title: string;
  description: string;
  action: string;
}

export interface LicenseTexts {
  /** Texto do link para a documentação. */
  docsLink: string;
  reasons: Record<LicenseBlockReason, LicenseMessage>;
}

export const defaultLicenseTexts: LicenseTexts = {
  docsLink: 'Ver a documentação da licença',
  reasons: {
    'missing-key': {
      title: 'Chave de licença ausente',
      description: 'Este template só funciona com a chave que acompanha o seu arquivo de licença.',
      action:
        'Cole a chave em efds-config.js (HTML) ou em VITE_EFDS_LICENSE_KEY no arquivo .env (React).',
    },
    'invalid-file': {
      title: 'Arquivo de licença inválido',
      description: 'O arquivo efds-license não foi encontrado ou está incompleto ou alterado.',
      action: 'Use o arquivo de licença original do download, sem editar.',
    },
    'bad-signature': {
      title: 'Chave não corresponde ao arquivo de licença',
      description: 'A chave informada não foi emitida para este arquivo de licença.',
      action: 'Confira se a chave e o arquivo vêm do mesmo download.',
    },
    domain: {
      title: 'Domínio não coberto pela licença',
      description: 'Esta licença não vale para o endereço em que o template está rodando.',
      action: 'Use o site licenciado ou peça uma licença para este domínio.',
    },
    'no-behavior': {
      title: 'Comportamento do efDS.ui não carregado',
      description: 'O arquivo eds-behavior.js não foi encontrado nesta página.',
      action: 'Confira a pasta vendor/efds-ui/behavior e a ordem dos scripts.',
    },
  },
};
