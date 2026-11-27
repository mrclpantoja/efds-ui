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
  Combobox,
  DatePicker,
  EmptyState,
  Field,
  FileUpload,
  Grid,
  Input,
  InputGroup,
  Select,
  Spinner,
  Stack,
  Textarea,
  useCep,
  useToast,
  useUnsavedChanges,
} from '@efds-ui/react';
import { SearchIcon } from '@efds-ui/icons';
import {
  categorias,
  cidades,
  situacoes,
  ufs,
  type Fornecedor,
  type Situacao,
  type Tipo,
} from '../data';
import { CEP_URL } from '../mock';
import { Shell } from '../Shell';
import { useStore } from '../store';

/*
 * Cadastro de fornecedor: seções em cards (cada uma um fieldset). Validação só no envio (noValidate
 * desliga os balões nativos); depois do primeiro envio as mensagens por campo acompanham a edição e
 * o resumo, com links para os campos, é o retrato do último envio. Nada é enviado a lugar nenhum.
 */

interface Valores {
  tipo: Tipo;
  cnpj: string;
  cpf: string;
  razao: string;
  fantasia: string;
  categoria: string;
  situacao: Situacao;
  motivo: string;
  email: string;
  telefone: string;
  altContato: boolean;
  emailAlt: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  limite: string;
  contratoEm: string;
  obs: string;
}

type Erros = Partial<Record<keyof Valores, string>>;

const vazio: Valores = {
  tipo: 'pj',
  cnpj: '',
  cpf: '',
  razao: '',
  fantasia: '',
  categoria: '',
  situacao: 'ativo',
  motivo: '',
  email: '',
  telefone: '',
  altContato: false,
  emailAlt: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  limite: '',
  contratoEm: '',
  obs: '',
};

const ROTULOS: Partial<Record<keyof Valores, string>> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  razao: 'Razão social ou nome',
  categoria: 'Categoria',
  motivo: 'Motivo da inativação',
  email: 'E-mail',
  emailAlt: 'E-mail alternativo',
  telefone: 'Telefone',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  cidade: 'Cidade',
  uf: 'UF',
  contratoEm: 'Início do contrato',
};

const digitos = (texto: string) => texto.replace(/\D/g, '');
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(v: Valores): Erros {
  const e: Erros = {};
  if (v.tipo === 'pj') {
    if (!v.cnpj.trim()) e.cnpj = 'Informe o CNPJ.';
    else if (v.cnpj.replace(/[^0-9A-Za-z]/g, '').length !== 14)
      e.cnpj = 'Use 14 caracteres, no formato 00.000.000/0000-00.';
  } else if (!v.cpf.trim()) e.cpf = 'Informe o CPF.';
  else if (digitos(v.cpf).length !== 11) e.cpf = 'Use 11 dígitos, no formato 000.000.000-00.';
  if (!v.razao.trim()) e.razao = 'Informe a razão social ou o nome.';
  if (!v.categoria) e.categoria = 'Escolha uma categoria.';
  if (v.situacao === 'inativo' && !v.motivo.trim()) e.motivo = 'Informe o motivo da inativação.';
  if (!v.email.trim()) e.email = 'Informe o e-mail.';
  else if (!email.test(v.email.trim()))
    e.email = 'Informe um e-mail válido, como nome@example.com.';
  if (v.altContato && v.emailAlt.trim() && !email.test(v.emailAlt.trim()))
    e.emailAlt = 'Informe um e-mail válido, como nome@example.com.';
  const tel = digitos(v.telefone);
  if (tel && (tel.length < 10 || tel.length > 11))
    e.telefone = 'Use DDD e número, com 10 ou 11 dígitos.';
  if (!v.cep.trim()) e.cep = 'Informe o CEP.';
  else if (digitos(v.cep).length !== 8) e.cep = 'Use o formato 00000-000.';
  if (!v.logradouro.trim()) e.logradouro = 'Informe o logradouro.';
  if (!v.numero.trim()) e.numero = 'Informe o número (ou "s/n").';
  if (!v.cidade) e.cidade = 'Escolha a cidade na lista.';
  if (!v.uf) e.uf = 'Escolha a UF.';
  if (!v.contratoEm) e.contratoEm = 'Informe a data de início do contrato.';
  return e;
}

const reais = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function deFornecedor(f: Fornecedor): Valores {
  return {
    tipo: f.tipo,
    cnpj: f.tipo === 'pj' ? f.documento : '',
    cpf: f.tipo === 'pf' ? f.documento : '',
    razao: f.razao,
    fantasia: f.fantasia,
    categoria: f.categoria,
    situacao: f.situacao,
    motivo: f.motivo ?? '',
    email: f.email,
    telefone: f.telefone,
    altContato: Boolean(f.emailAlt),
    emailAlt: f.emailAlt ?? '',
    cep: f.cep,
    logradouro: f.logradouro,
    numero: f.numero,
    bairro: f.bairro,
    cidade: f.cidade,
    uf: f.uf,
    limite: reais(f.limite),
    contratoEm: f.contratoEm,
    obs: f.obs ?? '',
  };
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

export function FormPage({ id }: { id?: string }) {
  const { achar } = useStore();
  const editando = id ? achar(id) : undefined;

  if (id && !editando) {
    return (
      <Shell
        current="lista"
        title="Fornecedor não encontrado"
        breadcrumb={[
          { label: 'Início', href: '#/' },
          { label: 'Fornecedores', href: '#/' },
          { label: 'Não encontrado' },
        ]}
      >
        <EmptyState
          icon={<SearchIcon />}
          headingLevel={2}
          title="Fornecedor não encontrado"
          description="O código informado não existe nesta lista. Ele pode ter sido excluído."
          actions={
            <Button variant="primary" href="#/">
              Voltar para a lista
            </Button>
          }
        />
      </Shell>
    );
  }
  return <Formulario editando={editando} />;
}

function Formulario({ editando }: { editando?: Fornecedor }) {
  const { salvar, proximoId } = useStore();
  const { show } = useToast();
  const [inicial] = useState<Valores>(() => (editando ? deFornecedor(editando) : vazio));
  const [v, setV] = useState<Valores>(inicial);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviado, setEnviado] = useState(false);
  const [resumo, setResumo] = useState<[keyof Valores, string][]>([]);
  const [cepAplicado, setCepAplicado] = useState<unknown>(null);
  const resumoRef = useRef<HTMLDivElement>(null);

  const mudar = (patch: Partial<Valores>) => setV((atual) => ({ ...atual, ...patch }));
  const dirty = JSON.stringify(v) !== JSON.stringify(inicial) || arquivos.length > 0;
  useUnsavedChanges(dirty, {
    message: 'Há alterações não salvas neste fornecedor. Sair mesmo assim?',
  });

  // CEP: o serviço (aqui um mock local) preenche o endereço quando o CEP fica completo.
  const cep = useCep(v.cep, { url: CEP_URL });
  if (cep.status === 'found' && cep.data && cep.data !== cepAplicado && v.cep !== inicial.cep) {
    setCepAplicado(cep.data);
    const cidade = cidades.find((c) => c.label === cep.data?.localidade);
    mudar({
      logradouro: String(cep.data.logradouro ?? ''),
      bairro: String(cep.data.bairro ?? ''),
      ...(cidade ? { cidade: cidade.value, uf: cidade.uf } : { uf: String(cep.data.uf ?? '') }),
    });
  }

  const erros: Erros = enviado ? validar(v) : {};
  const erroCep =
    erros.cep ??
    (cep.status === 'notfound' ? (
      'CEP não encontrado. Preencha o endereço à mão.'
    ) : cep.status === 'error' ? (
      <span>
        Não foi possível consultar o CEP.{' '}
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-sm"
          onClick={cep.retry}
        >
          Tentar de novo
        </button>
      </span>
    ) : undefined);

  const irPara = (name: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(`f-${name}`)?.focus();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const encontrados = validar(v);
    const campos = (Object.keys(encontrados) as (keyof Valores)[]).map(
      (k): [keyof Valores, string] => [k, encontrados[k] ?? ''],
    );
    if (campos.length > 0) {
      flushSync(() => {
        setEnviado(true);
        setResumo(campos);
      });
      resumoRef.current?.focus();
      return;
    }
    const cidade = cidades.find((c) => c.value === v.cidade) ?? cidades[0]!;
    const agora = new Date();
    const data = agora.toISOString().slice(0, 10);
    const hora = agora.toTimeString().slice(0, 5);
    const registro: Fornecedor = {
      id: editando?.id ?? proximoId(),
      tipo: v.tipo,
      razao: v.razao.trim(),
      fantasia: v.tipo === 'pj' ? v.fantasia.trim() : '',
      documento: v.tipo === 'pj' ? v.cnpj : v.cpf,
      categoria: v.categoria,
      situacao: v.situacao,
      motivo: v.situacao === 'inativo' ? v.motivo.trim() : '',
      cidade: cidade.value,
      cidadeNome: cidade.label,
      uf: v.uf,
      email: v.email.trim(),
      emailAlt: v.altContato ? v.emailAlt.trim() : '',
      telefone: v.telefone,
      cep: v.cep,
      logradouro: v.logradouro.trim(),
      numero: v.numero.trim(),
      bairro: v.bairro.trim(),
      limite: Number(v.limite.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
      contratoEm: v.contratoEm,
      obs: v.obs,
      documentos: [
        ...(editando?.documentos ?? []),
        ...arquivos.map((a) => ({
          nome: a.name,
          tamanho: `${Math.max(1, Math.round(a.size / 1024))} kB`,
        })),
      ],
      historico: [
        {
          titulo: editando ? 'Cadastro atualizado' : 'Fornecedor cadastrado',
          data,
          hora,
          autor: 'Ana Exemplo',
          tom: editando ? 'info' : 'success',
        },
        ...(editando?.historico ?? []),
      ],
    };
    salvar(registro);
    show({ tone: 'success', message: `Fornecedor ${registro.razao} salvo (simulação).` });
    window.location.hash = `#/fornecedor/${registro.id}`;
  };

  const titulo = editando ? 'Editar fornecedor' : 'Novo fornecedor';

  return (
    <Shell
      current={editando ? 'lista' : 'novo'}
      title={titulo}
      description="Campos com * são obrigatórios. Nada é enviado a um servidor: o salvamento é simulado no navegador."
      breadcrumb={[
        { label: 'Início', href: '#/' },
        { label: 'Fornecedores', href: '#/' },
        { label: editando ? 'Editar' : 'Novo fornecedor' },
      ]}
    >
      {resumo.length > 0 ? (
        <Alert
          ref={resumoRef}
          tone="danger"
          tabIndex={-1}
          role="group"
          aria-labelledby="f-resumo-t"
          title={
            <span id="f-resumo-t">
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
                <a href={`#f-${name}`} onClick={irPara(name)}>
                  {ROTULOS[name]}: {msg}
                </a>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <form noValidate onSubmit={onSubmit}>
        <Stack gap={5}>
          <Secao id="f-dados" title="Dados do fornecedor">
            <Field className="eds-col-span-sm-6" controlId="f-tipo" label="Tipo de pessoa" required>
              <Select
                name="tipo"
                value={v.tipo}
                onChange={(e) => mudar({ tipo: e.target.value as Tipo })}
              >
                <option value="pj">Pessoa jurídica</option>
                <option value="pf">Pessoa física</option>
              </Select>
            </Field>
            {v.tipo === 'pj' ? (
              <Field
                className="eds-col-span-sm-6"
                controlId="f-cnpj"
                label="CNPJ"
                required
                helper="Fictício. Ex.: 10.000.100/0001-13"
                error={erros.cnpj}
              >
                <Input
                  name="cnpj"
                  mask="cnpj"
                  autoComplete="off"
                  value={v.cnpj}
                  onChange={(e) => mudar({ cnpj: e.target.value })}
                />
              </Field>
            ) : (
              <Field
                className="eds-col-span-sm-6"
                controlId="f-cpf"
                label="CPF"
                required
                helper="Fictício. Ex.: 000.000.100-13"
                error={erros.cpf}
              >
                <Input
                  name="cpf"
                  mask="cpf"
                  autoComplete="off"
                  value={v.cpf}
                  onChange={(e) => mudar({ cpf: e.target.value })}
                />
              </Field>
            )}
            <Field
              className="eds-col-span-sm-6"
              controlId="f-razao"
              label="Razão social ou nome"
              required
              error={erros.razao}
            >
              <Input
                name="razao"
                autoComplete="off"
                placeholder="Ex.: Aurora Papelaria Exemplo Ltda."
                value={v.razao}
                onChange={(e) => mudar({ razao: e.target.value })}
              />
            </Field>
            {v.tipo === 'pj' ? (
              <Field className="eds-col-span-sm-6" controlId="f-fantasia" label="Nome fantasia">
                <Input
                  name="fantasia"
                  autoComplete="off"
                  value={v.fantasia}
                  onChange={(e) => mudar({ fantasia: e.target.value })}
                />
              </Field>
            ) : null}
            <Field
              className="eds-col-span-sm-6"
              controlId="f-categoria"
              label="Categoria"
              required
              error={erros.categoria}
            >
              <Select
                name="categoria"
                value={v.categoria}
                onChange={(e) => mudar({ categoria: e.target.value })}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field className="eds-col-span-sm-6" controlId="f-situacao" label="Situação" required>
              <Select
                name="situacao"
                value={v.situacao}
                onChange={(e) => mudar({ situacao: e.target.value as Situacao })}
              >
                {(Object.keys(situacoes) as Situacao[]).map((s) => (
                  <option key={s} value={s}>
                    {situacoes[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            {v.situacao === 'inativo' ? (
              <Field
                className="eds-col-span-12"
                controlId="f-motivo"
                label="Motivo da inativação"
                required
                error={erros.motivo}
              >
                <Input
                  name="motivo"
                  autoComplete="off"
                  value={v.motivo}
                  onChange={(e) => mudar({ motivo: e.target.value })}
                />
              </Field>
            ) : null}
          </Secao>

          <Secao id="f-contato" title="Contato">
            <Field
              className="eds-col-span-sm-6"
              controlId="f-email"
              label="E-mail"
              required
              error={erros.email}
            >
              <Input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nome@example.com"
                value={v.email}
                onChange={(e) => mudar({ email: e.target.value })}
              />
            </Field>
            <Field
              className="eds-col-span-sm-6"
              controlId="f-telefone"
              label="Telefone"
              helper="Opcional. Com DDD."
              error={erros.telefone}
            >
              <Input
                name="telefone"
                type="tel"
                mask="telefone"
                autoComplete="off"
                value={v.telefone}
                onChange={(e) => mudar({ telefone: e.target.value })}
              />
            </Field>
            <div className="eds-col-span-12">
              <Checkbox
                name="altContato"
                checked={v.altContato}
                onChange={(e) => mudar({ altContato: e.target.checked })}
              >
                Informar contato alternativo
              </Checkbox>
            </div>
            {v.altContato ? (
              <Field
                className="eds-col-span-sm-6"
                controlId="f-emailAlt"
                label="E-mail alternativo"
                error={erros.emailAlt}
              >
                <Input
                  name="emailAlt"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={v.emailAlt}
                  onChange={(e) => mudar({ emailAlt: e.target.value })}
                />
              </Field>
            ) : null}
          </Secao>

          <Secao id="f-endereco" title="Endereço">
            <Field
              className="eds-col-span-sm-4"
              controlId="f-cep"
              label="CEP"
              required
              helper="Teste 90010-100 ou 88010-000."
              error={erroCep}
            >
              <InputGroup
                aria-busy={cep.status === 'loading' || undefined}
                suffix={
                  cep.status === 'loading' ? (
                    <span className="eds-input-group-text">
                      <Spinner size="sm" label="Buscando endereço" />
                    </span>
                  ) : undefined
                }
              >
                <Input
                  name="cep"
                  mask="cep"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="00000-000"
                  value={v.cep}
                  onChange={(e) => mudar({ cep: e.target.value })}
                />
              </InputGroup>
            </Field>
            <Field
              className="eds-col-span-sm-8"
              controlId="f-logradouro"
              label="Logradouro"
              required
              error={erros.logradouro}
            >
              <Input
                name="logradouro"
                autoComplete="off"
                value={v.logradouro}
                onChange={(e) => mudar({ logradouro: e.target.value })}
              />
            </Field>
            <Field
              className="eds-col-span-sm-4"
              controlId="f-numero"
              label="Número"
              required
              error={erros.numero}
            >
              <Input
                name="numero"
                autoComplete="off"
                value={v.numero}
                onChange={(e) => mudar({ numero: e.target.value })}
              />
            </Field>
            <Field className="eds-col-span-sm-8" controlId="f-bairro" label="Bairro">
              <Input
                name="bairro"
                autoComplete="off"
                value={v.bairro}
                onChange={(e) => mudar({ bairro: e.target.value })}
              />
            </Field>
            <Field
              className="eds-col-span-sm-8"
              controlId="f-cidade"
              label="Cidade"
              required
              error={erros.cidade}
            >
              <Combobox
                name="cidade"
                options={cidades.map((c) => ({ value: c.value, label: c.label }))}
                value={v.cidade}
                onValueChange={(valor) => {
                  const cidade = cidades.find((c) => c.value === valor);
                  mudar({ cidade: valor, ...(cidade ? { uf: cidade.uf } : {}) });
                }}
              />
            </Field>
            <Field
              className="eds-col-span-sm-4"
              controlId="f-uf"
              label="UF"
              required
              error={erros.uf}
            >
              <Select name="uf" value={v.uf} onChange={(e) => mudar({ uf: e.target.value })}>
                <option value="" disabled>
                  Selecione
                </option>
                {ufs.map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
              </Select>
            </Field>
          </Secao>

          <Secao id="f-contrato" title="Contrato e documentos">
            <Field className="eds-col-span-sm-6" controlId="f-limite" label="Limite de compra">
              <Input
                name="limite"
                mask="moeda"
                inputMode="numeric"
                autoComplete="off"
                value={v.limite}
                onChange={(e) => mudar({ limite: e.target.value })}
              />
            </Field>
            <Field
              className="eds-col-span-sm-6"
              controlId="f-contratoEm"
              label="Início do contrato"
              required
              error={erros.contratoEm}
            >
              <DatePicker
                name="contratoEm"
                value={v.contratoEm || null}
                onValueChange={(iso) => mudar({ contratoEm: iso ?? '' })}
              />
            </Field>
            <Field
              className="eds-col-span-12"
              controlId="f-obs"
              label="Observações"
              helper="Máximo de 500 caracteres."
            >
              <Textarea
                name="obs"
                maxLength={500}
                value={v.obs}
                onChange={(e) => mudar({ obs: e.target.value })}
              />
            </Field>
            <Field
              className="eds-col-span-12"
              controlId="f-docs"
              label="Documentos"
              helper={
                editando && editando.documentos.length > 0
                  ? `Já enviados: ${editando.documentos.map((d) => d.nome).join(', ')}. Novos arquivos são acrescentados.`
                  : undefined
              }
            >
              <FileUpload
                name="documentos[]"
                accept=".pdf,.jpg,.png"
                hint="PDF, JPG ou PNG. Os arquivos não saem do navegador neste exemplo."
                onValueChange={setArquivos}
              />
            </Field>
          </Secao>

          <Stack direction="row" wrap justify="end" gap={3}>
            <Button href={editando ? `#/fornecedor/${editando.id}` : '#/'}>Cancelar</Button>
            <Button type="submit" variant="primary">
              {editando ? 'Salvar alterações' : 'Salvar fornecedor'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Shell>
  );
}
