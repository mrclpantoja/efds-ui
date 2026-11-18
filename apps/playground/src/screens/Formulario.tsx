import { useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
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

interface ControlProps {
  id: string;
  name: string;
  required?: boolean;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/** Campo: rótulo, controle, ajuda e erro. O controle recebe id, aria-invalid e aria-describedby. */
function Field({
  name,
  label,
  required,
  helper,
  error,
  span = 'eds-col-span-sm-6',
  control,
}: {
  name: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  span?: string;
  control: (props: ControlProps) => ReactNode;
}) {
  const id = `cli-${name}`;
  const describedby = [error && `${id}-e`, helper && `${id}-h`].filter(Boolean).join(' ');
  return (
    <div className={`eds-field ${span}`}>
      <label className="eds-label" htmlFor={id} data-required={required || undefined}>
        {label}
      </label>
      {control({
        id,
        name,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedby || undefined,
      })}
      {helper ? (
        <p className="eds-helper" id={`${id}-h`}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p className="eds-error" id={`${id}-e`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Seção: card com título; o fieldset é nomeado pelo título (aria-labelledby), sem legend dupla. */
function Secao({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="eds-card">
      <header className="eds-card-header">
        <h2 className="eds-card-title" id={`${id}-t`}>
          {title}
        </h2>
      </header>
      <div className="eds-card-body">
        <fieldset className="eds-fieldset" aria-labelledby={`${id}-t`}>
          <div className="eds-grid">{children}</div>
        </fieldset>
      </div>
    </div>
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
        <div
          ref={summaryRef}
          className="eds-alert eds-alert-danger"
          tabIndex={-1}
          role="group"
          aria-labelledby="cli-resumo-t"
        >
          <div className="eds-alert-content">
            <p className="eds-alert-title" id="cli-resumo-t">
              {resumo.length === 1
                ? 'Último envio: 1 campo com erro'
                : `Último envio: ${resumo.length} campos com erro`}
            </p>
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
          </div>
        </div>
      ) : null}

      {salvo ? (
        <div
          ref={successRef}
          className="eds-alert eds-alert-success"
          tabIndex={-1}
          role="group"
          aria-labelledby="cli-ok-t"
        >
          <div className="eds-alert-content">
            <p className="eds-alert-title" id="cli-ok-t">
              Cliente salvo (simulação).
            </p>
            <p>
              Nenhum dado foi enviado. <a href="#/listagem">Voltar para a lista de clientes</a>
            </p>
          </div>
        </div>
      ) : null}

      <form className="eds-stack eds-gap-5" noValidate onSubmit={onSubmit} onChange={onChange}>
        <Secao id="cli-empresa" title="Dados da empresa">
          <Field
            name="razao"
            label="Razão social"
            required
            error={erros.razao}
            control={(p) => (
              <input
                {...p}
                className="eds-input"
                autoComplete="off"
                placeholder="Ex.: Aurora Comércio Exemplo Ltda."
              />
            )}
          />
          <Field
            name="fantasia"
            label="Nome fantasia"
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
          <Field
            name="segmento"
            label="Segmento"
            required
            error={erros.segmento}
            control={(p) => (
              <select {...p} className="eds-select" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {segmentos.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          />
          <Field
            name="site"
            label="Site"
            helper="Opcional. Endereço completo, com https://."
            error={erros.site}
            control={(p) => (
              <input
                {...p}
                className="eds-input"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.example.com"
              />
            )}
          />
        </Secao>

        <Secao id="cli-contato" title="Contato">
          <Field
            name="responsavel"
            label="Responsável"
            required
            error={erros.responsavel}
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
          <Field
            name="cargo"
            label="Cargo"
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
          <Field
            name="email"
            label="E-mail"
            required
            error={erros.email}
            control={(p) => (
              <input
                {...p}
                className="eds-input"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="nome@example.com"
              />
            )}
          />
          <Field
            name="telefone"
            label="Telefone"
            helper="Opcional. Com DDD."
            error={erros.telefone}
            control={(p) => (
              <input
                {...p}
                className="eds-input"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(00) 00000-0000"
              />
            )}
          />
        </Secao>

        <Secao id="cli-endereco" title="Endereço">
          <Field
            name="cep"
            label="CEP"
            required
            span="eds-col-span-sm-4"
            error={erros.cep}
            control={(p) => (
              <input
                {...p}
                className="eds-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="00000-000"
              />
            )}
          />
          <Field
            name="logradouro"
            label="Logradouro"
            required
            span="eds-col-span-sm-8"
            error={erros.logradouro}
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
          <Field
            name="numero"
            label="Número"
            required
            span="eds-col-span-sm-4"
            error={erros.numero}
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
          <Field
            name="complemento"
            label="Complemento"
            span="eds-col-span-sm-8"
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
          <Field
            name="uf"
            label="UF"
            required
            span="eds-col-span-sm-4"
            error={erros.uf}
            control={(p) => (
              <select {...p} className="eds-select" autoComplete="off" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {ufs.map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
              </select>
            )}
          />
          <Field
            name="cidade"
            label="Cidade"
            required
            span="eds-col-span-sm-8"
            error={erros.cidade}
            control={(p) => <input {...p} className="eds-input" autoComplete="off" />}
          />
        </Secao>

        <Secao id="cli-pref" title="Preferências">
          <fieldset className="eds-fieldset eds-col-span-sm-6">
            <legend className="eds-legend">Condição de pagamento</legend>
            <label className="eds-check">
              <input
                type="radio"
                name="pagamento"
                value="avista"
                className="eds-radio"
                defaultChecked
              />
              À vista
            </label>
            <label className="eds-check">
              <input type="radio" name="pagamento" value="30" className="eds-radio" />
              30 dias
            </label>
            <label className="eds-check">
              <input type="radio" name="pagamento" value="30-60" className="eds-radio" />
              30/60 dias
            </label>
          </fieldset>
          <fieldset className="eds-fieldset eds-col-span-sm-6">
            <legend className="eds-legend">Comunicação</legend>
            <label className="eds-check">
              <input
                type="checkbox"
                role="switch"
                name="avisos"
                className="eds-switch"
                defaultChecked
              />
              Receber avisos de pedidos por e-mail
            </label>
            <label className="eds-check">
              <input type="checkbox" role="switch" name="boletim" className="eds-switch" />
              Receber boletim mensal
            </label>
          </fieldset>
          <Field
            name="observacoes"
            label="Observações"
            helper="Máximo de 500 caracteres."
            span="eds-col-span-12"
            control={(p) => <textarea {...p} className="eds-textarea" maxLength={500} />}
          />
          <div className="eds-field eds-col-span-12">
            <label className="eds-check">
              <input
                id="cli-aceite"
                type="checkbox"
                name="aceite"
                className="eds-checkbox"
                required
                aria-invalid={erros.aceite ? true : undefined}
                aria-describedby={erros.aceite ? 'cli-aceite-e' : undefined}
              />
              Confirmo que os dados deste cadastro são fictícios (obrigatório)
            </label>
            {erros.aceite ? (
              <p className="eds-error" id="cli-aceite-e">
                {erros.aceite}
              </p>
            ) : null}
          </div>
        </Secao>

        <div className="eds-stack eds-stack-row eds-stack-wrap eds-stack-justify-end eds-gap-3">
          <a className="eds-button eds-button-secondary" href="#/listagem">
            Cancelar
          </a>
          <button type="submit" className="eds-button eds-button-primary">
            Salvar cliente
          </button>
        </div>
      </form>
    </ReferenceShell>
  );
}
