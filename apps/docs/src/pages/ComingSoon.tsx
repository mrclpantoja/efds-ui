import { Alert } from '@efds-ui/react';

/** Corpo das rotas que ainda não têm página (o h1 vem do Layout, a partir do registro). */
export function ComingSoon() {
  return (
    <Alert tone="info" title="Em breve">
      <p>
        Esta página ainda não foi escrita. Enquanto isso, o contrato de markup de cada componente
        está nos exemplos do playground (<code>apps/playground/src/demos</code>) e o CSS em{' '}
        <code>packages/core/src/components</code>.
      </p>
    </Alert>
  );
}
