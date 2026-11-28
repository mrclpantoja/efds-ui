import {
  AvatarUpload,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  DescriptionList,
  ErrorSummary,
  Field,
  Grid,
  Input,
  PasswordInput,
  Select,
  useFormValidation,
  useSubmit,
  useToast,
} from '@efds-ui/react';
import { ultimoAcesso, unidades, usuario } from '../data';
import { caminhos, Shell, type ShellBaseProps } from '../Shell';

/** "Servidor" fictício: responde em 900 ms. Num sistema real, troque pelo seu fetch. */
const servidor = () => new Promise<void>((ok) => window.setTimeout(ok, 900));

/** A confirmação precisa repetir a nova senha: vira a validade nativa do campo (setCustomValidity). */
function conferirSenha(form: HTMLFormElement) {
  const nova = form.elements.namedItem('nova');
  const confirmacao = form.elements.namedItem('confirmacao');
  if (!(nova instanceof HTMLInputElement) || !(confirmacao instanceof HTMLInputElement)) return;
  const confere = confirmacao.value === '' || confirmacao.value === nova.value;
  confirmacao.setCustomValidity(confere ? '' : 'A confirmação não confere com a nova senha.');
}

export function Perfil(props: ShellBaseProps) {
  const toast = useToast();

  // Cada formulário: validação (resumo + erro junto do campo) e estado de envio (botão ocupado,
  // sem duplo envio). A validação recusa o envio inválido antes de chegar ao `useSubmit`.
  const enviarDados = useSubmit(
    async () => {
      await servidor();
      toast.show({ tone: 'success', message: 'Dados pessoais salvos.' });
    },
    { texts: { success: 'Salvo' } },
  );
  const dados = useFormValidation({ onSubmit: enviarDados.handleSubmit });

  const enviarSenha = useSubmit(async (_data, event) => {
    const form = event.currentTarget;
    await servidor();
    form.reset();
    toast.show({ tone: 'success', message: 'Senha alterada.' });
  });
  const senha = useFormValidation({ onSubmit: enviarSenha.handleSubmit });

  return (
    <Shell
      {...props}
      rota="perfil"
      titulo="Meu perfil"
      descricao="Seus dados de acesso ao painel. Dados fictícios."
      trilha={[{ label: 'Início', href: caminhos.inicio }, { label: 'Meu perfil' }]}
    >
      <Grid>
        <Card
          className="eds-col-span-lg-4 pn-self-start"
          role="region"
          aria-labelledby="per-foto-t"
        >
          <CardHeader>
            <CardTitle level={2} id="per-foto-t">
              Foto
            </CardTitle>
          </CardHeader>
          <CardBody className="eds-stack eds-gap-3">
            <AvatarUpload personName={usuario.nome} name="foto" outputSize={256} size="lg" />
            <p className="eds-helper">
              O ajuste acontece no seu navegador: a foto só é enviada quando você salvar.
            </p>
          </CardBody>
        </Card>

        <form
          className="eds-card eds-col-span-lg-8"
          aria-labelledby="per-dados-t"
          {...dados.formProps}
        >
          <CardHeader>
            <CardTitle level={2} id="per-dados-t">
              Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Grid>
              <ErrorSummary {...dados.summaryProps} headingLevel={3} className="eds-col-span-12" />
              <Field
                label="Nome completo"
                required
                error={dados.errorOf('nome')}
                className="eds-col-span-md-6"
              >
                <Input name="nome" autoComplete="name" defaultValue={usuario.nome} />
              </Field>
              <Field
                label="E-mail"
                required
                error={dados.errorOf('email')}
                className="eds-col-span-md-6"
              >
                <Input
                  name="email"
                  type="email"
                  validate="email"
                  autoComplete="email"
                  defaultValue={usuario.email}
                />
              </Field>
              <Field
                label="Telefone"
                error={dados.errorOf('telefone')}
                className="eds-col-span-md-6"
              >
                <Input
                  name="telefone"
                  mask="telefone"
                  validate="telefone"
                  autoComplete="tel"
                  defaultValue={usuario.telefone}
                />
              </Field>
              <Field label="Unidade" className="eds-col-span-md-6">
                <Select name="unidade" defaultValue={usuario.unidade}>
                  {unidades.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Cargo"
                helper="Definido pela equipe de pessoal."
                className="eds-col-span-md-6"
              >
                <Input name="cargo" readOnly defaultValue={usuario.cargo} />
              </Field>
            </Grid>
          </CardBody>
          <CardFooter>
            <Button type="submit" variant="primary" {...enviarDados.buttonProps}>
              Salvar alterações
            </Button>
          </CardFooter>
        </form>

        <form
          className="eds-card eds-col-span-lg-8"
          aria-labelledby="per-senha-t"
          {...senha.formProps}
          onInput={(event) => {
            conferirSenha(event.currentTarget);
            senha.formProps.onInput(event);
          }}
        >
          <CardHeader>
            <CardTitle level={2} id="per-senha-t">
              Trocar senha
            </CardTitle>
          </CardHeader>
          <CardBody className="eds-stack eds-gap-4">
            <ErrorSummary {...senha.summaryProps} headingLevel={3} />
            <Field label="Senha atual" required error={senha.errorOf('atual')}>
              <PasswordInput name="atual" autoComplete="current-password" />
            </Field>
            <Field label="Nova senha" required error={senha.errorOf('nova')}>
              <PasswordInput name="nova" autoComplete="new-password" minLength={8} strength rules />
            </Field>
            <Field label="Confirme a nova senha" required error={senha.errorOf('confirmacao')}>
              <PasswordInput name="confirmacao" autoComplete="new-password" />
            </Field>
          </CardBody>
          <CardFooter>
            <Button type="submit" variant="primary" {...enviarSenha.buttonProps}>
              Trocar senha
            </Button>
          </CardFooter>
        </form>

        <Card
          className="eds-col-span-lg-4 pn-self-start"
          role="region"
          aria-labelledby="per-acesso-t"
        >
          <CardHeader>
            <CardTitle level={2} id="per-acesso-t">
              Acesso
            </CardTitle>
          </CardHeader>
          <CardBody>
            <DescriptionList items={ultimoAcesso} />
          </CardBody>
        </Card>
      </Grid>
    </Shell>
  );
}
