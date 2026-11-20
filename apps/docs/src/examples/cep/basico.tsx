import { useState, type ChangeEvent } from 'react';
import { Field, Grid, Input, InputGroup, Spinner, useCep } from '@eds-ui/react';

// O serviço de CEP é escolha de quem implanta: aqui, um mock local da documentação (dados
// fictícios; 90010100 existe, 00000000 não e 99999999 simula falha de rede).
const SERVICO = '/mock/cep/{cep}';

export default function Basico() {
  const [cep, setCep] = useState('');
  const { status, data, retry } = useCep(cep, { url: SERVICO });
  // O endereço do serviço preenche os campos; o que a pessoa digitar depois vale mais.
  const base = {
    logradouro: status === 'found' ? String(data?.logradouro ?? '') : '',
    bairro: status === 'found' ? String(data?.bairro ?? '') : '',
    localidade: status === 'found' ? String(data?.localidade ?? '') : '',
    uf: status === 'found' ? String(data?.uf ?? '') : '',
  };
  const [edit, setEdit] = useState<{ source: unknown; values: Partial<typeof base> }>({
    source: null,
    values: {},
  });
  const values = { ...base, ...(edit.source === data ? edit.values : {}) };
  const change = (key: keyof typeof base) => (e: ChangeEvent<HTMLInputElement>) =>
    setEdit({ source: data, values: { ...values, [key]: e.target.value } });

  const erro =
    status === 'notfound' ? (
      'CEP não encontrado.'
    ) : status === 'error' ? (
      <span>
        Não foi possível consultar o CEP.{' '}
        <button type="button" className="eds-button eds-button-ghost eds-button-sm" onClick={retry}>
          Tentar de novo
        </button>
      </span>
    ) : undefined;

  return (
    <Grid auto>
      <Field label="CEP" error={erro} helper="Teste 90010-100, 00000-000 ou 99999-999.">
        <InputGroup
          aria-busy={status === 'loading' || undefined}
          suffix={
            status === 'loading' ? (
              <span className="eds-input-group-text">
                <Spinner size="sm" label="Buscando endereço" />
              </span>
            ) : undefined
          }
        >
          <Input
            name="cep"
            mask="cep"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
          />
        </InputGroup>
      </Field>
      <Field label="Logradouro">
        <Input
          name="logradouro"
          autoComplete="address-line1"
          value={values.logradouro}
          onChange={change('logradouro')}
        />
      </Field>
      <Field label="Bairro">
        <Input name="bairro" value={values.bairro} onChange={change('bairro')} />
      </Field>
      <Field label="Cidade">
        <Input
          name="cidade"
          autoComplete="address-level2"
          value={values.localidade}
          onChange={change('localidade')}
        />
      </Field>
      <Field label="UF">
        <Input
          name="uf"
          maxLength={2}
          autoComplete="address-level1"
          value={values.uf}
          onChange={change('uf')}
        />
      </Field>
    </Grid>
  );
}
