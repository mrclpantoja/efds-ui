/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Chave de licença do template (assinatura Ed25519 do efds-license.json). */
  readonly VITE_EFDS_LICENSE_KEY?: string;
}
