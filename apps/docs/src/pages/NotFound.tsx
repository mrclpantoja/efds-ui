import { Alert } from '@efds-ui/react';
import { toHref } from '../router';

export function NotFound() {
  return (
    <Alert variant="warning" title="Esta página não existe">
      <p>
        O endereço não corresponde a nenhuma página da documentação.{' '}
        <a href={toHref('/')}>Voltar à introdução</a>.
      </p>
    </Alert>
  );
}
