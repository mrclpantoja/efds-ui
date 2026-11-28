import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  DatePicker,
  EmptyState,
  ErrorSummary,
  Field,
  FileUpload,
  Grid,
  IconDisc,
  Input,
  InputGroup,
  Lookup,
  OptionCard,
  OptionCardGroup,
  Select,
  Spinner,
  Stack,
  Stepper,
  Textarea,
  useCep,
  useDialog,
  useFormValidation,
  useSectionProgress,
  useSubmit,
  useToast,
  useUnsavedChanges,
  type LookupItem,
} from '@efds-ui/react';
import { SearchIcon } from '@efds-ui/icons';
import { cidades, situacoes, ufs, type Fornecedor, type Situacao, type Tipo } from '../data';
import { CEP_URL } from '../mock';
import { Shell } from '../Shell';
import { useStore } from '../store';

/*
 * Cadastro de fornecedor: seções em cards (cada uma um fieldset), com um Stepper no topo que indica a
 * seção lida. A validação é declarativa (`required`, `validate="cnpj"`...) e visível: mensagem por campo
 * e um resumo de erros com links no topo (`useFormValidation` + `ErrorSummary`). O envio mostra
 * "Salvando…" e bloqueia o duplo envio (`useSubmit`). Nada é enviado a lugar nenhum.
 */

interface Valores {
  tipo: Tipo;
  cnpj: string;
  cpf: string;
  docEstrangeiro: string;
  pais: string;
  razao: string;
  fantasia: string;
  /** Código da categoria (o Lookup guarda o código; o cadastro guarda a descrição). */
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

const vazio: Valores = {
  tipo: 'pj',
  cnpj: '',
  cpf: '',
  docEstrangeiro: '',
  pais: '',
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

const SECOES = [
  { id: 'sec-dados', label: 'Dados' },
  { id: 'sec-contato', label: 'Contato' },
  { id: 'sec-end', label: 'Endereço' },
  { id: 'sec-contrato', label: 'Documentos' },
];

const reais = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Pictograma de um cartão de opção (decorativo). */
function Pictograma({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
const visto = <Pictograma d="M5 12l5 5 9-10" />;

/** Seção: card com título; o fieldset é nomeado pelo título (aria-labelledby), sem legend dupla. */
function Secao({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card id={id}>
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
  const { salvar, proximoId, categorias, adicionarCategoria } = useStore();
  const { show } = useToast();
  const { prompt } = useDialog();
  const [inicial] = useState<Valores>(() => {
    if (!editando) return vazio;
    const f = editando;
    return {
      tipo: f.tipo,
      cnpj: f.tipo === 'pj' ? f.documento : '',
      cpf: f.tipo === 'pf' ? f.documento : '',
      docEstrangeiro: f.tipo === 'est' ? f.documento : '',
      pais: f.pais ?? '',
      razao: f.razao,
      fantasia: f.fantasia,
      categoria: categorias.find((c) => c.description === f.categoria)?.code ?? '',
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
  });
  const [v, setV] = useState<Valores>(inicial);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [cepAplicado, setCepAplicado] = useState<unknown>(null);
  const registroSalvo = useRef<Fornecedor | null>(null);

  const mudar = (patch: Partial<Valores>) => setV((atual) => ({ ...atual, ...patch }));
  const dirty = !salvo && (JSON.stringify(v) !== JSON.stringify(inicial) || arquivos.length > 0);
  useUnsavedChanges(dirty, {
    message: 'Há alterações não salvas neste fornecedor. Sair mesmo assim?',
  });

  // Stepper como indicador de seções: a seção lida e as concluídas vêm do próprio formulário.
  const { current, states } = useSectionProgress(SECOES);

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

  // O CEP preencheu endereço, cidade e UF por código (sem digitação): os avisos de "campo obrigatório"
  // desses campos, se estavam na tela, saem junto com o resumo. A validação reavalia a cada `input`.
  useEffect(() => {
    if (!cepAplicado) return undefined;
    // Depois do quadro: o Combobox atualiza o texto da cidade em um efeito próprio.
    const timer = setTimeout(() => {
      for (const id of ['f-logradouro', 'f-cidade', 'f-uf']) {
        document.getElementById(id)?.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [cepAplicado]);

  /**
   * Monta o registro, grava no estado e devolve-o. O código da categoria vem do envio (o campo do
   * Lookup), porque digitar o código e enviar logo em seguida pode chegar antes de ele ser resolvido.
   */
  const gravar = (codigoCategoria: string): Fornecedor => {
    const cidade = cidades.find((c) => c.value === v.cidade) ?? cidades[0]!;
    const categoria = categorias.find(
      (c) => c.code.toLowerCase() === codigoCategoria.trim().toLowerCase(),
    );
    const agora = new Date();
    const data = agora.toISOString().slice(0, 10);
    const hora = agora.toTimeString().slice(0, 5);
    const registro: Fornecedor = {
      id: editando?.id ?? proximoId(),
      tipo: v.tipo,
      pais: v.tipo === 'est' ? v.pais.trim() : '',
      razao: v.razao.trim(),
      fantasia: v.tipo !== 'pf' ? v.fantasia.trim() : '',
      documento: v.tipo === 'pj' ? v.cnpj : v.tipo === 'pf' ? v.cpf : v.docEstrangeiro.trim(),
      categoria: categoria?.description ?? codigoCategoria.trim(),
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
    return registro;
  };

  // Envio: o botão mostra "Salvando…" (aria-busy), o duplo envio é bloqueado e o resultado vira "Salvo".
  // O servidor é simulado (900 ms); depois a página do fornecedor abre e mostra o aviso.
  const envio = useSubmit(
    async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 900));
      registroSalvo.current = gravar(String(data.get('categoria') ?? ''));
    },
    {
      onSuccess: () => {
        const registro = registroSalvo.current;
        if (!registro) return;
        setSalvo(true);
        show({ tone: 'success', message: `Fornecedor ${registro.razao} salvo (simulação).` });
        // O botão fica um instante em "Salvo" antes de a página trocar.
        setTimeout(() => {
          window.location.hash = `#/fornecedor/${registro.id}`;
        }, 700);
      },
    },
  );

  // Validação declarativa e visível; só um envio válido chega ao `useSubmit`.
  const { formProps, errorOf, summaryProps } = useFormValidation({
    onSubmit: (event) => envio.handleSubmit(event),
  });

  const buscarCategorias = async (texto: string): Promise<LookupItem[]> => {
    const alvo = normalizar(texto.trim());
    return categorias
      .filter((c) => alvo === '' || normalizar(`${c.code} ${c.description}`).includes(alvo))
      .map((c) => ({ ...c }));
  };

  /** "Cadastrar novo…": aqui, um diálogo pergunta o nome (em produção, abra o seu cadastro). */
  const cadastrarCategoria = async (texto: string) => {
    const nome = await prompt(
      'Nome da nova categoria. Ela fica disponível nos próximos cadastros (simulação).',
      texto,
      'Cadastrar categoria',
      { okText: 'Cadastrar' },
    );
    if (!nome?.trim()) return;
    const existente = categorias.some((c) => normalizar(c.description) === normalizar(nome.trim()));
    const item = adicionarCategoria(nome);
    mudar({ categoria: item.code });
    if (!existente) {
      show({ tone: 'success', message: `Categoria ${item.description} cadastrada (simulação).` });
    }
  };

  const erroCep =
    errorOf('cep') ??
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
      <Stepper
        aria-label="Seções do cadastro"
        current={current}
        steps={SECOES.map((s, i) => ({ label: s.label, href: `#${s.id}`, state: states[i] }))}
      />

      <form {...formProps}>
        <Stack gap={5}>
          <ErrorSummary {...summaryProps} />
          <Secao id="sec-dados" title="Dados do fornecedor">
            <div className="eds-col-span-12">
              <OptionCardGroup
                legend="Tipo de fornecedor"
                name="tipo"
                value={v.tipo}
                onValueChange={(tipo) => mudar({ tipo: tipo as Tipo })}
              >
                <OptionCard
                  type="radio"
                  value="pj"
                  title="Pessoa jurídica"
                  description="Empresa com CNPJ."
                  icon={
                    <IconDisc tone="info">
                      <Pictograma d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
                    </IconDisc>
                  }
                  mark={visto}
                />
                <OptionCard
                  type="radio"
                  value="pf"
                  title="Pessoa física"
                  description="Autônomo, com CPF."
                  icon={
                    <IconDisc tone="success">
                      <Pictograma d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />
                    </IconDisc>
                  }
                  mark={visto}
                />
                <OptionCard
                  type="radio"
                  value="est"
                  title="Estrangeiro"
                  description="Empresa ou pessoa de outro país."
                  icon={
                    <IconDisc tone="warning">
                      <Pictograma d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                    </IconDisc>
                  }
                  mark={visto}
                />
              </OptionCardGroup>
            </div>
            {v.tipo === 'pj' ? (
              <Field
                className="eds-col-span-sm-6"
                controlId="f-cnpj"
                label="CNPJ"
                required
                helper="Fictício. Aceita o CNPJ alfanumérico. Ex.: 11.222.333/0001-81 ou 12.ABC.345/01DE-35"
                error={errorOf('cnpj')}
              >
                <Input
                  name="cnpj"
                  mask="cnpj"
                  validate="cnpj"
                  autoComplete="off"
                  value={v.cnpj}
                  onChange={(e) => mudar({ cnpj: e.target.value })}
                />
              </Field>
            ) : v.tipo === 'pf' ? (
              <Field
                className="eds-col-span-sm-6"
                controlId="f-cpf"
                label="CPF"
                required
                helper="Fictício. Ex.: 529.982.247-25"
                error={errorOf('cpf')}
              >
                <Input
                  name="cpf"
                  mask="cpf"
                  validate="cpf"
                  autoComplete="off"
                  value={v.cpf}
                  onChange={(e) => mudar({ cpf: e.target.value })}
                />
              </Field>
            ) : (
              <>
                <Field
                  className="eds-col-span-sm-6"
                  controlId="f-docest"
                  label="Passaporte ou identificação fiscal"
                  required
                  helper="Fictício. Ex.: SE556000-0100"
                  error={errorOf('docEstrangeiro')}
                >
                  <Input
                    name="docEstrangeiro"
                    autoComplete="off"
                    value={v.docEstrangeiro}
                    onChange={(e) => mudar({ docEstrangeiro: e.target.value })}
                  />
                </Field>
                <Field
                  className="eds-col-span-sm-6"
                  controlId="f-pais"
                  label="País de origem"
                  required
                  error={errorOf('pais')}
                >
                  <Input
                    name="pais"
                    autoComplete="off"
                    value={v.pais}
                    onChange={(e) => mudar({ pais: e.target.value })}
                  />
                </Field>
              </>
            )}
            <Field
              className="eds-col-span-sm-6"
              controlId="f-razao"
              label="Razão social ou nome"
              required
              error={errorOf('razao')}
            >
              <Input
                name="razao"
                autoComplete="off"
                placeholder="Ex.: Aurora Papelaria Exemplo Ltda."
                value={v.razao}
                onChange={(e) => mudar({ razao: e.target.value })}
              />
            </Field>
            {v.tipo !== 'pf' ? (
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
              helper="Digite o código ou parte do nome (MAT, Serviços…). Não achou? Cadastre."
              error={errorOf('categoria')}
            >
              <Lookup
                name="categoria"
                search={buscarCategorias}
                value={v.categoria}
                onValueChange={(code) => mudar({ categoria: code })}
                onCreate={(texto) => void cadastrarCategoria(texto)}
                texts={{ open: 'Buscar categoria', title: 'Buscar categoria' }}
              />
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
                error={errorOf('motivo')}
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

          <Secao id="sec-contato" title="Contato">
            <Field
              className="eds-col-span-sm-6"
              controlId="f-email"
              label="E-mail"
              required
              error={errorOf('email')}
            >
              <Input
                name="email"
                type="email"
                validate="email"
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
              error={errorOf('telefone')}
            >
              <Input
                name="telefone"
                type="tel"
                mask="telefone"
                validate="telefone"
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
                error={errorOf('emailAlt')}
              >
                <Input
                  name="emailAlt"
                  type="email"
                  validate="email"
                  inputMode="email"
                  autoComplete="off"
                  value={v.emailAlt}
                  onChange={(e) => mudar({ emailAlt: e.target.value })}
                />
              </Field>
            ) : null}
          </Secao>

          <Secao id="sec-end" title="Endereço">
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
                  validate="cep"
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
              error={errorOf('logradouro')}
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
              error={errorOf('numero')}
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
              error={errorOf('f-cidade')}
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
              error={errorOf('uf')}
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

          <Secao id="sec-contrato" title="Contrato e documentos">
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
              error={errorOf('f-contratoEm')}
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
            <Button type="submit" variant="primary" {...envio.buttonProps}>
              {envio.loading ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar fornecedor'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Shell>
  );
}
