import { useEffect } from 'react';
import { AppShell, AppShellHeader, AppShellNavToggle, useAppShell } from '@eds-ui/react';

/**
 * `useAppShell` só funciona dentro do <AppShell>. Em SPA, feche o off-canvas ao trocar de rota
 * e mova o foco para o conteúdo novo.
 */
function FocoAoNavegar({ rota }: { rota: string }) {
  const { closeNav, mainId } = useAppShell();
  useEffect(() => {
    closeNav();
    document.getElementById(mainId)?.focus();
  }, [rota, closeNav, mainId]);
  return null;
}

export default function Spa({ rota }: { rota: string }) {
  return (
    <AppShell
      header={
        <AppShellHeader aria-label="Aplicação">
          <AppShellNavToggle texts={{ label: 'Abrir menu' }} />
        </AppShellHeader>
      }
    >
      <FocoAoNavegar rota={rota} />
      <h1 className="eds-text-h1">{rota}</h1>
    </AppShell>
  );
}
