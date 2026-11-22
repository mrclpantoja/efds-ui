import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Fieldset,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  useToast,
} from '@efds-ui/react';
import {
  aparenciaPadrao,
  aplicarAparencia,
  gravarPreferencias,
  lerAparencia,
  lerPreferencias,
  type Aparencia,
} from '../preferencias';
import { caminhos, Shell, type ShellBaseProps } from '../Shell';

const temas = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'purple', label: 'Roxo' },
  { value: 'orange', label: 'Laranja' },
  { value: 'neutral', label: 'Neutro' },
] as const;

const modos = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
] as const;

const densidades = [
  { value: 'compact', label: 'Compacta' },
  { value: 'comfortable', label: 'Média' },
  { value: 'spacious', label: 'Ampla' },
] as const;

const formas = [
  { value: 'sharp', label: 'Reta' },
  { value: 'soft', label: 'Suave' },
  { value: 'rounded', label: 'Arredondada' },
] as const;

const tempos = [
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
  { value: '0', label: 'Nunca encerrar' },
] as const;

interface ConfiguracoesProps extends ShellBaseProps {
  sessao: number;
  onSessaoChange: (minutos: number) => void;
}

export function Configuracoes({ sessao, onSessaoChange, ...props }: ConfiguracoesProps) {
  const toast = useToast();
  const [aparencia, setAparencia] = useState(lerAparencia);

  /** Aparência vale na hora (prévia) e fica guardada neste navegador. */
  const mudar = <K extends keyof Aparencia>(eixo: K, valor: string) => {
    const nova = { ...aparencia, [eixo]: valor as Aparencia[K] };
    setAparencia(nova);
    aplicarAparencia(nova);
  };

  const salvarPreferencias = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    gravarPreferencias({
      ...lerPreferencias(),
      emailNotificacoes: dados.has('emailNotificacoes'),
      resumoSemanal: dados.has('resumoSemanal'),
      sons: dados.has('sons'),
    });
    toast.show({ variant: 'success', message: 'Preferências salvas.' });
  };

  const salvarSessao = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutos = Number(new FormData(event.currentTarget).get('sessao'));
    gravarPreferencias({ ...lerPreferencias(), sessao: minutos });
    onSessaoChange(minutos);
    toast.show({ variant: 'success', message: 'Tempo de sessão atualizado.' });
  };

  const preferencias = lerPreferencias();

  return (
    <Shell
      {...props}
      rota="configuracoes"
      titulo="Configurações"
      descricao="Aparência, preferências e segurança da sua conta neste navegador."
      trilha={[{ label: 'Início', href: caminhos.inicio }, { label: 'Configurações' }]}
      largura="lg"
    >
      <Card role="region" aria-labelledby="cfg-aparencia-t">
        <CardHeader>
          <CardTitle level={2} id="cfg-aparencia-t">
            Aparência
          </CardTitle>
        </CardHeader>
        <CardBody className="eds-stack eds-gap-4">
          <p className="pn-muted">As mudanças valem na hora e ficam guardadas neste navegador.</p>
          <Field label="Tema">
            <Select
              name="tema"
              value={aparencia.theme}
              onChange={(e) => mudar('theme', e.target.value)}
            >
              {temas.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <SegmentedControl
            legend="Modo"
            name="modo"
            options={modos}
            value={aparencia.mode}
            onChange={(v) => mudar('mode', v)}
          />
          <SegmentedControl
            legend="Densidade"
            name="densidade"
            options={densidades}
            value={aparencia.density}
            onChange={(v) => mudar('density', v)}
          />
          <SegmentedControl
            legend="Forma"
            name="forma"
            options={formas}
            value={aparencia.shape}
            onChange={(v) => mudar('shape', v)}
          />
        </CardBody>
        <CardFooter>
          <Button
            onClick={() => {
              setAparencia(aparenciaPadrao);
              aplicarAparencia(aparenciaPadrao);
            }}
          >
            Restaurar padrão
          </Button>
        </CardFooter>
      </Card>

      <form className="eds-card" aria-labelledby="cfg-pref-t" onSubmit={salvarPreferencias}>
        <CardHeader>
          <CardTitle level={2} id="cfg-pref-t">
            Preferências
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Fieldset legend="Avisos">
            <Stack gap={3}>
              <Switch name="emailNotificacoes" defaultChecked={preferencias.emailNotificacoes}>
                Receber notificações por e-mail
              </Switch>
              <Switch name="resumoSemanal" defaultChecked={preferencias.resumoSemanal}>
                Receber resumo semanal
              </Switch>
              <Switch name="sons" defaultChecked={preferencias.sons}>
                Tocar som nos alertas
              </Switch>
            </Stack>
          </Fieldset>
        </CardBody>
        <CardFooter>
          <Button type="submit" variant="primary">
            Salvar preferências
          </Button>
        </CardFooter>
      </form>

      <form className="eds-card" aria-labelledby="cfg-sessao-t" onSubmit={salvarSessao}>
        <CardHeader>
          <CardTitle level={2} id="cfg-sessao-t">
            Sessão
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Field
            label="Encerrar a sessão após inatividade"
            helper="Um aviso aparece 1 minuto antes, com a opção de continuar conectado."
          >
            <Select name="sessao" defaultValue={String(sessao)}>
              {tempos.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" variant="primary">
            Salvar sessão
          </Button>
        </CardFooter>
      </form>
    </Shell>
  );
}
