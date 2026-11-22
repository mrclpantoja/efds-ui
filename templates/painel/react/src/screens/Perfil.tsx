import { useState, type FormEvent } from 'react';
import {
  AvatarUpload,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  DescriptionList,
  Field,
  Grid,
  Input,
  PasswordInput,
  Select,
  useToast,
} from '@efds-ui/react';
import { ultimoAcesso, unidades, usuario } from '../data';
import { caminhos, Shell, type ShellBaseProps } from '../Shell';
import { focarPrimeiroErro, validar } from '../validacao';

export function Perfil(props: ShellBaseProps) {
  const toast = useToast();
  const [errosDados, setErrosDados] = useState<Record<string, string>>({});
  const [errosSenha, setErrosSenha] = useState<Record<string, string>>({});

  const salvarDados = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const erros = validar(form);
    setErrosDados(erros);
    if (Object.keys(erros).length > 0) return focarPrimeiroErro(form);
    // Num sistema real, aqui vai o envio ao servidor.
    toast.show({ variant: 'success', message: 'Dados pessoais salvos.' });
  };

  const trocarSenha = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const erros = validar(form);
    const dados = new FormData(form);
    if (!erros.confirmacao && dados.get('nova') !== dados.get('confirmacao')) {
      erros.confirmacao = 'A confirmação não confere com a nova senha.';
    }
    setErrosSenha(erros);
    if (Object.keys(erros).length > 0) return focarPrimeiroErro(form);
    form.reset();
    toast.show({ variant: 'success', message: 'Senha alterada.' });
  };

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
          noValidate
          onSubmit={salvarDados}
        >
          <CardHeader>
            <CardTitle level={2} id="per-dados-t">
              Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Grid>
              <Field
                label="Nome completo"
                required
                error={errosDados.nome}
                className="eds-col-span-md-6"
              >
                <Input name="nome" autoComplete="name" defaultValue={usuario.nome} />
              </Field>
              <Field label="E-mail" required error={errosDados.email} className="eds-col-span-md-6">
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={usuario.email}
                />
              </Field>
              <Field label="Telefone" error={errosDados.telefone} className="eds-col-span-md-6">
                <Input
                  name="telefone"
                  mask="telefone"
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
            <Button type="submit" variant="primary">
              Salvar alterações
            </Button>
          </CardFooter>
        </form>

        <form
          className="eds-card eds-col-span-lg-8"
          aria-labelledby="per-senha-t"
          noValidate
          onSubmit={trocarSenha}
        >
          <CardHeader>
            <CardTitle level={2} id="per-senha-t">
              Trocar senha
            </CardTitle>
          </CardHeader>
          <CardBody className="eds-stack eds-gap-4">
            <Field label="Senha atual" required error={errosSenha.atual}>
              <PasswordInput name="atual" autoComplete="current-password" />
            </Field>
            <Field label="Nova senha" required error={errosSenha.nova}>
              <PasswordInput name="nova" autoComplete="new-password" minLength={8} strength rules />
            </Field>
            <Field label="Confirme a nova senha" required error={errosSenha.confirmacao}>
              <PasswordInput name="confirmacao" autoComplete="new-password" />
            </Field>
          </CardBody>
          <CardFooter>
            <Button type="submit" variant="primary">
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
