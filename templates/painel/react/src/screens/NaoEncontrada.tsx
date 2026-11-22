import { Button, ErrorState } from '@efds-ui/react';
import { caminhos, Shell, type ShellBaseProps } from '../Shell';

export function NaoEncontrada(props: ShellBaseProps) {
  return (
    <Shell
      {...props}
      rota="nao-encontrada"
      titulo="Erro 404"
      trilha={[{ label: 'Início', href: caminhos.inicio }, { label: 'Erro 404' }]}
      largura="lg"
    >
      <ErrorState
        headingLevel={2}
        title="Página não encontrada"
        description="O endereço pode ter mudado ou a página foi removida. Confira o endereço ou volte ao início."
        detail="Código: 404"
        actions={
          <Button variant="primary" href={caminhos.inicio}>
            Ir para o início
          </Button>
        }
      />
    </Shell>
  );
}
