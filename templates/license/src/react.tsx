import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Button, ErrorState } from '@efds-ui/react';
import { verifyLicense, type VerifyResult } from './core';
import { LICENSE_DOCS_URL, defaultLicenseTexts, type LicenseTexts } from './messages';
import { PUBLIC_KEY } from './public-key';

export interface LicenseGateProps {
  /** Conteúdo de `efds-license.json`. */
  license: unknown;
  /** Chave (`VITE_EFDS_LICENSE_KEY`). */
  licenseKey: string | undefined;
  /** Padrão: `location.hostname`. */
  hostname?: string;
  /** Chave pública; o padrão é a de produção (troque só em testes). */
  publicKey?: string | Uint8Array;
  texts?: Partial<Omit<LicenseTexts, 'reasons'>> & { reasons?: Partial<LicenseTexts['reasons']> };
  children: ReactNode;
}

function Blocked({
  reason,
  texts,
}: {
  reason: Extract<VerifyResult, { ok: false }>['reason'];
  texts: LicenseTexts;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const title = ref.current?.querySelector<HTMLElement>('.eds-empty-title');
    if (title) {
      title.tabIndex = -1;
      title.focus();
    }
  }, []);
  const message = texts.reasons[reason];
  return (
    <main className="eds-container eds-container-md" data-efds-license-block={reason}>
      <ErrorState
        ref={ref}
        announce
        headingLevel={2}
        title={message.title}
        description={
          <>
            {message.description} {message.action}
          </>
        }
        actions={
          <Button variant="primary" href={LICENSE_DOCS_URL}>
            {texts.docsLink}
          </Button>
        }
      />
    </main>
  );
}

/** Só renderiza o app com uma licença válida; senão mostra a tela de bloqueio. */
export function LicenseGate({
  license,
  licenseKey,
  hostname,
  publicKey = PUBLIC_KEY,
  texts,
  children,
}: LicenseGateProps) {
  const host = hostname ?? (typeof location === 'undefined' ? '' : location.hostname);
  const result = useMemo(
    () => verifyLicense(license, licenseKey, { publicKey, hostname: host }),
    [license, licenseKey, publicKey, host],
  );
  if (result.ok) return <>{children}</>;
  const merged: LicenseTexts = {
    docsLink: texts?.docsLink ?? defaultLicenseTexts.docsLink,
    reasons: { ...defaultLicenseTexts.reasons, ...texts?.reasons },
  };
  return <Blocked reason={result.reason} texts={merged} />;
}
