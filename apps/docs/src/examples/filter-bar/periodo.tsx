import { DateRangePicker, Field, FilterBar, Input, Select } from '@efds-ui/react';

export default function Periodo() {
  return (
    <FilterBar aria-label="Filtrar lançamentos">
      <Field label="Buscar" className="eds-filter-bar-search">
        <Input type="search" placeholder="Descrição ou fornecedor" autoComplete="off" />
      </Field>
      <Field label="Situação">
        <Select defaultValue="">
          <option value="">Todas</option>
          <option value="aberto">Em aberto</option>
          <option value="pago">Pago</option>
        </Select>
      </Field>
      <Field label="Período">
        <DateRangePicker nameStart="inicio" nameEnd="fim" />
      </Field>
    </FilterBar>
  );
}
