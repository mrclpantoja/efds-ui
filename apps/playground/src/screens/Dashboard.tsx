import { useRef } from 'react';
import { useScrollRegion } from './behavior';
import { formatarData, moeda } from './data';
import { icons } from './icons';
import { ReferenceShell } from './ReferenceShell';

/**
 * KPIs fictícios. Nada depende só da cor: o sentido do valor vai no sinal e na seta; se é bom
 * ou ruim, num texto oculto (", melhora" / ", piora") além da cor do Badge.
 */
const kpis = [
  { label: 'Receita do mês', value: 'R$ 184,3 mil', delta: '+8,2%', up: true, good: true },
  { label: 'Pedidos', value: '1.248', delta: '+3,5%', up: true, good: true },
  { label: 'Ticket médio', value: moeda.format(147.7), delta: '−1,9%', up: false, good: false },
  { label: 'Pedidos em atraso', value: '17', delta: '−12%', up: false, good: true },
] as const;

const pedidoStatus = {
  pago: { label: 'Pago', badge: 'success' },
  analise: { label: 'Em análise', badge: 'info' },
  pendente: { label: 'Pendente', badge: 'warning' },
  atrasado: { label: 'Atrasado', badge: 'danger' },
} as const;

const pedidos = [
  {
    id: 'PED-0142',
    cliente: 'Aurora Comércio Exemplo',
    data: '2026-11-17',
    status: 'pago',
    valor: 1250,
  },
  {
    id: 'PED-0141',
    cliente: 'Horizonte Logística Exemplo',
    data: '2026-11-17',
    status: 'analise',
    valor: 845.5,
  },
  {
    id: 'PED-0140',
    cliente: 'Cedro Indústria Exemplo',
    data: '2026-11-16',
    status: 'pendente',
    valor: 3990,
  },
  {
    id: 'PED-0139',
    cliente: 'Farol Serviços Exemplo',
    data: '2026-11-14',
    status: 'atrasado',
    valor: 512.3,
  },
  {
    id: 'PED-0138',
    cliente: 'Prisma Tecnologia Exemplo',
    data: '2026-11-14',
    status: 'pago',
    valor: 7420,
  },
  {
    id: 'PED-0137',
    cliente: 'Jade Distribuidora Exemplo',
    data: '2026-11-13',
    status: 'pago',
    valor: 230.9,
  },
] as const;

const atividades = [
  { quem: 'Ana Exemplo', oque: 'aprovou o pedido PED-0142', quando: 'há 12 min' },
  { quem: 'Bruno Exemplo', oque: 'cadastrou o cliente Órbita Serviços Exemplo', quando: 'há 1 h' },
  { quem: 'Carla Exemplo', oque: 'emitiu a fatura FAT-0091', quando: 'há 3 h' },
  { quem: 'Diego Exemplo', oque: 'reabriu o pedido PED-0139', quando: 'ontem' },
] as const;

export function Dashboard() {
  const wrapRef = useRef<HTMLDivElement>(null);
  useScrollRegion(wrapRef, 'dash-pedidos-t');

  return (
    <ReferenceShell
      current="dashboard"
      title="Dashboard"
      description="Resumo de novembro de 2026. Dados fictícios."
      breadcrumb={[{ label: 'Início' }]}
      actions={
        <>
          <button type="button" className="eds-button eds-button-secondary">
            {icons.exportar}
            Exportar
          </button>
          <a className="eds-button eds-button-primary" href="#/formulario">
            {icons.mais}
            Novo cliente
          </a>
        </>
      }
    >
      {/* KPIs: 2 colunas desde o mobile → 4 quando o grid tem ≥ 768px (largura do grid, não da tela). */}
      <section aria-labelledby="dash-kpis-t" className="eds-stack eds-gap-3">
        <h2 id="dash-kpis-t" className="eds-visually-hidden">
          Indicadores do mês
        </h2>
        <ul className="eds-grid">
          {kpis.map((kpi) => (
            <li key={kpi.label} className="eds-card eds-col-span-6 eds-col-span-md-3">
              <div className="eds-card-body eds-stack eds-gap-2">
                <p className="eds-text-label rs-muted">{kpi.label}</p>
                {/* h3: com 2 colunas desde 320px, o valor precisa caber em ~100px sem partir o número. */}
                <p className="eds-text-h3">{kpi.value}</p>
                <p className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2 eds-text-small">
                  <span className={`eds-badge eds-badge-${kpi.good ? 'success' : 'danger'}`}>
                    {kpi.up ? icons.subiu : icons.desceu}
                    {kpi.delta}
                    <span className="eds-visually-hidden">
                      {kpi.good ? ', melhora' : ', piora'}
                    </span>
                  </span>
                  <span className="rs-muted">vs. mês anterior</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="eds-grid">
        {/* Pedidos recentes: 8 de 12 colunas quando o grid tem ≥ 1024px. */}
        <section
          className="eds-card eds-col-span-lg-8"
          aria-labelledby="dash-pedidos-t"
          id="dash-pedidos"
        >
          <header className="eds-card-header">
            <h2 className="eds-card-title" id="dash-pedidos-t">
              Pedidos recentes
            </h2>
            <div className="eds-card-actions">
              <a className="eds-button eds-button-ghost eds-button-sm" href="#/listagem">
                Ver clientes
              </a>
            </div>
          </header>
          {/* Tabela em Card: o wrap é filho direto (o core tira a borda dupla e alinha ao padding). */}
          <div className="eds-table-wrap" ref={wrapRef}>
            <table className="eds-table">
              <caption className="eds-table-caption eds-visually-hidden">
                Pedidos recentes, do mais novo para o mais antigo
              </caption>
              <thead>
                <tr>
                  <th scope="col">Pedido</th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="eds-table-num">
                    Valor
                  </th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Data</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.id}</th>
                    <td>
                      <span className={`eds-badge eds-badge-${pedidoStatus[p.status].badge}`}>
                        {pedidoStatus[p.status].label}
                      </span>
                    </td>
                    <td className="eds-table-num">{moeda.format(p.valor)}</td>
                    <td>{p.cliente}</td>
                    <td>{formatarData(p.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/*
          Coluna lateral: é um grid aninhado. No lg ocupa 4 de 12 e, estreita, empilha os
          cards; abaixo do lg vai para baixo da tabela com a largura toda e os mesmos cards
          viram 3 colunas — cada grid lê a própria largura, sem nenhuma classe a mais.
        */}
        <div className="eds-col-span-lg-4 eds-grid">
          <section
            className="eds-card eds-col-span-md-4 rs-self-start"
            aria-labelledby="dash-acoes-t"
          >
            <header className="eds-card-header">
              <h2 className="eds-card-title" id="dash-acoes-t">
                Ações rápidas
              </h2>
            </header>
            <div className="eds-card-body eds-stack eds-stack-align-start eds-gap-2">
              <a className="eds-button eds-button-secondary eds-button-sm" href="#/formulario">
                {icons.novo}
                Cadastrar cliente
              </a>
              <a className="eds-button eds-button-secondary eds-button-sm" href="#/listagem">
                {icons.clientes}
                Consultar clientes
              </a>
              <button type="button" className="eds-button eds-button-secondary eds-button-sm">
                {icons.exportar}
                Relatório do mês
              </button>
            </div>
          </section>

          <section className="eds-card eds-col-span-md-4" aria-labelledby="dash-alertas-t">
            <header className="eds-card-header">
              <h2 className="eds-card-title" id="dash-alertas-t">
                Alertas
              </h2>
            </header>
            <div className="eds-card-body eds-stack eds-gap-3">
              <div className="eds-alert eds-alert-warning">
                <div className="eds-alert-content">
                  <p className="eds-alert-title">17 pedidos em atraso</p>
                  <p>Cinco deles passaram de 30 dias.</p>
                </div>
              </div>
              <div className="eds-alert eds-alert-info">
                <div className="eds-alert-content">
                  <p className="eds-alert-title">Fechamento do mês</p>
                  <p>O período contábil fecha em 30/11.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="eds-card eds-col-span-md-4" aria-labelledby="dash-ativ-t">
            <header className="eds-card-header">
              <h2 className="eds-card-title" id="dash-ativ-t">
                Atividade recente
              </h2>
            </header>
            <ol className="eds-card-body eds-stack eds-gap-3">
              {atividades.map((a) => (
                <li key={a.oque} className="eds-stack eds-gap-1">
                  <p>
                    <strong>{a.quem}</strong> {a.oque}
                  </p>
                  <p className="eds-text-small rs-muted">{a.quando}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </ReferenceShell>
  );
}
