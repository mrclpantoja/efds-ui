import { useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Fieldset,
  Grid,
  Input,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Textarea,
} from '@eds-ui/react';
import { segmentos } from './data';
import { ReferenceShell } from './ReferenceShell';

/*
 * Cadastro de cliente: seções em cards, cada uma um grupo (fieldset) com grid de 12 colunas
 * que responde ao CONTÊINER: 1 coluna até o grid ter 640px, 2 a partir daí. Sem Tabs: com
 * validação no envio, erro em aba oculta não pode ser focado pelo resumo; página única é
 * mais simples e mais acessível.
 * Validação: só no envio (noValidate desliga os balões nativos). Depois do primeiro envio,
 * as mensagens por campo se atualizam ao editar; o resumo é o retrato do último envio.
 * Cortes do grid: só 6/6 e 4/8 (sm), repetidos, para as bordas dos campos se alinharem.
 * autocomplete="off": é o cadastro de um TERCEIRO (o cliente); o WCAG 1.3.5 vale para dados
 * do próprio usuário, e o preenchimento automático traria os dados de quem digita.
 * Nada é enviado a lugar nenhum.
 */

type Erros = Record<string, string>;

const ufs =
  'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');

/** Rótulos usados no resumo de erros, na ordem do formulário. */
const rotulos: Record<string, string> = {
  razao: 'Razão social',
  segmento: 'Segmento',
  site: 'Site',
  responsavel: 'Responsável',
  email: 'E-mail',
  telefone: 'Telefone',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  uf: 'UF',
  cidade: 'Cidade',
  aceite: 'Declaração',
};

function validar(data: FormData): Erros {
  const v = (name: string) => String(data.get(name) ?? '').trim();
  const erros: Erros = {};
  if (!v('razao')) erros.razao = 'Informe a razão social.';
  if (!v('segmento')) erros.segmento = 'Escolha um segmento.';
  if (v('site') && !/^https?:\/\/\S+\.\S+$/.test(v('site')))
    erros.site = 'Informe o endereço completo, como https://www.example.com.';
  if (!v('responsavel')) erros.responsavel = 'Informe o nome do responsável.';
  if (!v('email')) erros.email = 'Informe o e-mail.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')))
    erros.email = 'Informe um e-mail válido, como nome@example.com.';
  const tel = v('telefone').replace(/\D/g, '');
  if (tel && (tel.length < 10 || tel.length > 11))
    erros.telefone = 'Use DDD e número, com 10 ou 11 dígitos.';
  if (!v('cep')) erros.cep = 'Informe o CEP.';
  else if (!/^\d{5}-?\d{3}$/.test(v('cep'))) erros.cep = 'Use o formato 00000-000.';
  if (!v('logradouro')) erros.logradouro = 'Informe o logradouro.';
  if (!v('numero')) erros.numero = 'Informe o número (ou "s/n").';
  if (!v('cidade')) erros.cidade = 'Informe a cidade.';
  if (!v('uf')) erros.uf = 'Escolha a UF.';
  if (!data.get('aceite')) erros.aceite = 'Confirme que os dados são fictícios para salvar.';
  return erros;
}

/** Campo do cadastro: id fixo (`cli-<name>`) para o resumo de erros focar o controle. */
function Campo({
  name,
  label,
  required,
  helper,
  error,
  span = 'eds-col-span-sm-6',
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  span?: string;
  children: ReactNode;
}) {
  return (
    <Field
      className={span}
      controlId={`cli-${name}`}
      label={label}
      required={required}
      helper={helper}
      error={error}
    >
      {children}
    </Field>
  );
}

/** Seção: card com título; o fieldset é nomeado pelo título (aria-labelledby), sem legend dupla. */
function Secao({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle level={2} id={`${id}-t`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <fieldset className="eds-fieldset" aria-labelledby={`${id}-t`}>
          <Grid>{children}</Grid>
        </fieldset>
      </CardBody>
    </Card>
  );
}

export function Formulario() {
  const [erros, setErros] = useState<Erros>({});
  const [resumo, setResumo] = useState<[string, string][]>([]);
  const [salvo, setSalvo] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const encontrados = validar(new FormData(event.currentTarget));
    const campos = Object.keys(rotulos).flatMap((k): [string, string][] =>
      encontrados[k] ? [[k, encontrados[k]]] : [],
    );
    flushSync(() => {
      setEnviado(true);
      setErros(encontrados);
      setResumo(campos);
      setSalvo(campos.length === 0);
    });
    (campos.length ? summaryRef : successRef).current?.focus();
  };

  // Depois do primeiro envio, a mensagem de cada campo acompanha a edição.
  const onChange = (event: FormEvent<HTMLFormElement>) => {
    if (enviado) setErros(validar(new FormData(event.currentTarget)));
  };

  // O hash é a rota: o link do resumo foca o campo sem trocar o hash.
  const irPara = (name: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(`cli-${name}`)?.focus();
  };

  return (
    <ReferenceShell
      current="formulario"
      title="Novo cliente"
      description="Campos com * são obrigatórios. Nada é enviado: o salvamento é simulado."
      breadcrumb={[
        { label: 'Início', href: '#/dashboard' },
        { label: 'Clientes', href: '#/listagem' },
        { label: 'Novo cliente' },
      ]}
      width="lg"
    >
      {resumo.length > 0 ? (
        <Alert
          ref={summaryRef}
          variant="danger"
          tabIndex={-1}
          role="group"
          aria-labelledby="cli-resumo-t"
          title={
            <span id="cli-resumo-t">
              {resumo.length === 1
                ? 'Último envio: 1 campo com erro'
                : `Último envio: ${resumo.length} campos com erro`}
            </span>
          }
        >
          {/* role="list": o reset tira os marcadores e o Safari deixa de expor a lista. */}
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ul role="list">
            {resumo.map(([name, msg]) => (
              <li key={name}>
                <a href={`#cli-${name}`} onClick={irPara(name)}>
                  {rotulos[name]}: {msg}
                </a>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {salvo ? (
        <Alert
          ref={successRef}
          variant="success"
          tabIndex={-1}
          role="group"
          aria-labelledby="cli-ok-t"
          title={<span id="cli-ok-t">Cliente salvo (simulação).</span>}
        >
          <p>
            Nenhum dado foi enviado. <a href="#/listagem">Voltar para a lista de clientes</a>
          </p>
        </Alert>
      ) : null}

      <form noValidate onSubmit={onSubmit} onChange={onChange}>
        <Stack gap={5}>
          <Secao id="cli-empresa" title="Dados da empresa">
            <Campo name="razao" label="Razão social" required error={erros.razao}>
              <Input
                name="razao"
                autoComplete="off"
                placeholder="Ex.: Aurora Comércio Exemplo Ltda."
              />
            </Campo>
            <Campo name="fantasia" label="Nome fantasia">
              <Input name="fantasia" autoComplete="off" />
            </Campo>
            <Campo name="segmento" label="Segmento" required error={erros.segmento}>
              <Select name="segmento" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {segmentos.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Campo>
            <Campo
              name="site"
              label="Site"
              helper="Opcional. Endereço completo, com https://."
              error={erros.site}
            >
              <Input
                name="site"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.example.com"
              />
            </Campo>
          </Secao>

          <Secao id="cli-contato" title="Contato">
            <Campo name="responsavel" label="Responsável" required error={erros.responsavel}>
              <Input name="responsavel" autoComplete="off" />
            </Campo>
            <Campo name="cargo" label="Cargo">
              <Input name="cargo" autoComplete="off" />
            </Campo>
            <Campo name="email" label="E-mail" required error={erros.email}>
              <Input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nome@example.com"
              />
            </Campo>
            <Campo
              name="telefone"
              label="Telefone"
              helper="Opcional. Com DDD."
              error={erros.telefone}
            >
              <Input
                name="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(00) 00000-0000"
              />
            </Campo>
          </Secao>

          <Secao id="cli-endereco" title="Endereço">
            <Campo name="cep" label="CEP" required span="eds-col-span-sm-4" error={erros.cep}>
              <Input name="cep" inputMode="numeric" autoComplete="off" placeholder="00000-000" />
            </Campo>
            <Campo
              name="logradouro"
              label="Logradouro"
              required
              span="eds-col-span-sm-8"
              error={erros.logradouro}
            >
              <Input name="logradouro" autoComplete="off" />
            </Campo>
            <Campo
              name="numero"
              label="Número"
              required
              span="eds-col-span-sm-4"
              error={erros.numero}
            >
              <Input name="numero" autoComplete="off" />
            </Campo>
            <Campo name="complemento" label="Complemento" span="eds-col-span-sm-8">
              <Input name="complemento" autoComplete="off" />
            </Campo>
            <Campo name="uf" label="UF" required span="eds-col-span-sm-4" error={erros.uf}>
              <Select name="uf" autoComplete="off" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {ufs.map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
              </Select>
            </Campo>
            <Campo
              name="cidade"
              label="Cidade"
              required
              span="eds-col-span-sm-8"
              error={erros.cidade}
            >
              <Input name="cidade" autoComplete="off" />
            </Campo>
          </Secao>

          <Secao id="cli-pref" title="Preferências">
            <RadioGroup
              className="eds-col-span-sm-6"
              legend="Condição de pagamento"
              name="pagamento"
              defaultValue="avista"
            >
              <Radio value="avista">À vista</Radio>
              <Radio value="30">30 dias</Radio>
              <Radio value="30-60">30/60 dias</Radio>
            </RadioGroup>
            <Fieldset className="eds-col-span-sm-6" legend="Comunicação">
              <Switch name="avisos" defaultChecked>
                Receber avisos de pedidos por e-mail
              </Switch>
              <Switch name="boletim">Receber boletim mensal</Switch>
            </Fieldset>
            <Campo
              name="observacoes"
              label="Observações"
              helper="Máximo de 500 caracteres."
              span="eds-col-span-12"
            >
              <Textarea name="observacoes" maxLength={500} />
            </Campo>
            <div className="eds-field eds-col-span-12">
              <Checkbox
                id="cli-aceite"
                name="aceite"
                required
                invalid={erros.aceite ? true : undefined}
                aria-describedby={erros.aceite ? 'cli-aceite-e' : undefined}
              >
                Confirmo que os dados deste cadastro são fictícios (obrigatório)
              </Checkbox>
              {erros.aceite ? (
                <p className="eds-error" id="cli-aceite-e">
                  {erros.aceite}
                </p>
              ) : null}
            </div>
          </Secao>

          <Stack direction="row" wrap justify="end" gap={3}>
            <Button href="#/listagem">Cancelar</Button>
            <Button type="submit" variant="primary">
              Salvar cliente
            </Button>
          </Stack>
        </Stack>
      </form>
    </ReferenceShell>
  );
}
