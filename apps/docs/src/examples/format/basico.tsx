import {
  formatCep,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhone,
  formatRelative,
  maskCpf,
} from '@efds-ui/react';

// Dados fictícios. As funções são as mesmas do `data-eds-format` do HTML.
const linhas: [string, string, string?][] = [
  ['Moeda', formatCurrency(1280.5), 'eds-text-tabular'],
  ['Número', formatNumber(1234567.891), 'eds-text-tabular'],
  ['Data', formatDate('2026-11-20')],
  ['Data e hora', formatDateTime('2026-11-20T10:30')],
  ['Relativo', formatRelative(new Date(Date.now() - 5 * 60_000))],
  ['CPF (mascarado)', maskCpf('00045678900'), 'eds-text-mono'],
  ['Telefone', formatPhone('53999990000'), 'eds-text-tabular'],
  ['CEP', formatCep('00000000'), 'eds-text-tabular'],
];

export default function Basico() {
  return (
    <dl className="eds-stack eds-gap-2">
      {linhas.map(([nome, valor, classe]) => (
        <div key={nome} className="eds-stack eds-stack-row eds-stack-wrap eds-gap-3">
          <dt className="eds-text-label">{nome}</dt>
          <dd>
            <span className={classe}>{valor}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
