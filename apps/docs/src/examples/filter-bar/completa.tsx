import { useState } from 'react';
import { Field, FilterBar, Input, Select } from '@efds-ui/react';

interface Valores {
  busca: string;
  situacao: string;
  categoria: string;
  de: string;
}

const vazio: Valores = { busca: '', situacao: '', categoria: '', de: '' };

const rotulos: Record<keyof Valores, string> = {
  busca: 'Buscar',
  situacao: 'Situação',
  categoria: 'Categoria',
  de: 'Assinado a partir de',
};

const opcoes: Record<string, string> = {
  vigente: 'Vigente',
  encerrado: 'Encerrado',
  suspenso: 'Suspenso',
  servicos: 'Serviços',
  materiais: 'Materiais',
  obras: 'Obras',
};

const texto = (chave: keyof Valores, valor: string): string => {
  if (chave === 'de') return valor.split('-').reverse().join('/');
  return opcoes[valor] ?? valor;
};

export default function Completa() {
  const [form, setForm] = useState<Valores>({
    ...vazio,
    situacao: 'vigente',
    categoria: 'servicos',
  });
  const [aplicado, setAplicado] = useState<Valores>(form);
  const set = (chave: keyof Valores) => (valor: string) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  const remover = (chave: keyof Valores) => {
    setForm((f) => ({ ...f, [chave]: '' }));
    setAplicado((a) => ({ ...a, [chave]: '' }));
  };

  const ativos = (Object.keys(rotulos) as (keyof Valores)[])
    .filter((chave) => aplicado[chave] !== '')
    .map((chave) => ({
      key: chave,
      label: `${rotulos[chave]}: ${texto(chave, aplicado[chave])}`,
      onRemove: () => remover(chave),
    }));

  const extras = [form.categoria, form.de].filter(Boolean).length;

  return (
    <FilterBar
      aria-label="Filtrar contratos"
      active={ativos}
      onSubmit={() => setAplicado(form)}
      onClear={() => {
        setForm(vazio);
        setAplicado(vazio);
      }}
      moreCount={extras}
      more={
        <>
          <Field label="Categoria">
            <Select value={form.categoria} onChange={(e) => set('categoria')(e.target.value)}>
              <option value="">Todas</option>
              <option value="servicos">Serviços</option>
              <option value="materiais">Materiais</option>
              <option value="obras">Obras</option>
            </Select>
          </Field>
          <Field label="Assinado a partir de">
            <Input type="date" value={form.de} onChange={(e) => set('de')(e.target.value)} />
          </Field>
        </>
      }
    >
      <Field label="Buscar" className="eds-filter-bar-search">
        <Input
          type="search"
          placeholder="Número ou fornecedor"
          autoComplete="off"
          value={form.busca}
          onChange={(e) => set('busca')(e.target.value)}
        />
      </Field>
      <Field label="Situação">
        <Select value={form.situacao} onChange={(e) => set('situacao')(e.target.value)}>
          <option value="">Todas</option>
          <option value="vigente">Vigente</option>
          <option value="encerrado">Encerrado</option>
          <option value="suspenso">Suspenso</option>
        </Select>
      </Field>
    </FilterBar>
  );
}
