import { useState } from 'react';
import { Field, FilterBar, Input, Select } from '@eds-ui/react';

const situacoes: Record<string, string> = {
  ativo: 'Ativo',
  pendente: 'Pendente',
  cancelado: 'Cancelado',
};

export default function Basico() {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('ativo');
  // O que foi aplicado (o que os chips mostram) só muda ao enviar.
  const [aplicado, setAplicado] = useState({ busca: '', situacao: 'ativo' });

  const ativos = [
    ...(aplicado.busca
      ? [
          {
            key: 'busca',
            label: `Buscar: ${aplicado.busca}`,
            onRemove: () => {
              setBusca('');
              setAplicado((a) => ({ ...a, busca: '' }));
            },
          },
        ]
      : []),
    ...(aplicado.situacao
      ? [
          {
            key: 'situacao',
            label: `Situação: ${situacoes[aplicado.situacao]}`,
            onRemove: () => {
              setSituacao('');
              setAplicado((a) => ({ ...a, situacao: '' }));
            },
          },
        ]
      : []),
  ];

  return (
    <FilterBar
      aria-label="Filtrar pedidos"
      active={ativos}
      onSubmit={() => setAplicado({ busca, situacao })}
      onClear={() => {
        setBusca('');
        setSituacao('');
        setAplicado({ busca: '', situacao: '' });
      }}
    >
      <Field label="Buscar" className="eds-filter-bar-search">
        <Input
          type="search"
          placeholder="Código ou cliente"
          autoComplete="off"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </Field>
      <Field label="Situação">
        <Select value={situacao} onChange={(e) => setSituacao(e.target.value)}>
          <option value="">Todas</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </Select>
      </Field>
    </FilterBar>
  );
}
