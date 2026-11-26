import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LicenseGate } from './react';
import { baseLicense, makeKeys, sign } from './test-keys';

const { secretKey, publicKey } = makeKeys();

afterEach(cleanup);

describe('LicenseGate', () => {
  it('renderiza o app com licença válida', () => {
    const license = baseLicense();
    render(
      <LicenseGate license={license} licenseKey={sign(license, secretKey)} publicKey={publicKey}>
        <p>App</p>
      </LicenseGate>,
    );
    expect(screen.getByText('App')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sem chave mostra o bloqueio, com foco no título, e não renderiza o app', () => {
    render(
      <LicenseGate license={baseLicense()} licenseKey={undefined} publicKey={publicKey}>
        <p>App</p>
      </LicenseGate>,
    );
    expect(screen.queryByText('App')).toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Chave de licença ausente');
    const heading = screen.getByRole('heading', { name: 'Chave de licença ausente' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'https://efds-ui.com.br/templates/licenca',
    );
  });

  it('chave adulterada e domínio errado bloqueiam', () => {
    const license = baseLicense({ type: 'single', domains: ['exemplo.gov.br'] });
    const key = sign(license, secretKey);
    const { unmount } = render(
      <LicenseGate license={license} licenseKey={key} hostname="outro.com" publicKey={publicKey}>
        <p>App</p>
      </LicenseGate>,
    );
    expect(screen.getByRole('heading', { name: 'Domínio não coberto pela licença' })).toBeTruthy();
    unmount();
    render(
      <LicenseGate
        license={license}
        licenseKey={sign(baseLicense(), secretKey)}
        hostname="exemplo.gov.br"
        publicKey={publicKey}
      >
        <p>App</p>
      </LicenseGate>,
    );
    expect(
      screen.getByRole('heading', { name: 'Chave não corresponde ao arquivo de licença' }),
    ).toBeTruthy();
  });

  it('permite trocar textos', () => {
    render(
      <LicenseGate
        license={baseLicense()}
        licenseKey={undefined}
        texts={{
          reasons: {
            'missing-key': { title: 'Falta a chave', description: 'D', action: 'A' },
          },
        }}
      >
        <p>App</p>
      </LicenseGate>,
    );
    expect(screen.getByRole('heading', { name: 'Falta a chave' })).toBeTruthy();
  });
});
