import './layout-demo.css';
import type { ReactNode } from 'react';

const twelve = Array.from({ length: 12 }, (_, i) => i + 1);
const tags = ['Financeiro', 'Compras', 'Estoque', 'Fiscal', 'Contábil', 'Logística', 'RH'];

function Box({ children }: { children: ReactNode }) {
  return <div className="ld-box">{children}</div>;
}

/** Grade responsiva reutilizada na página e dentro de um painel estreito. */
function KpiGrid() {
  return (
    <div className="eds-grid">
      {['Receita', 'Pedidos', 'Clientes', 'Ticket médio'].map((label) => (
        <div key={label} className="eds-col-span-sm-6 eds-col-span-lg-3">
          <Box>{label}</Box>
        </div>
      ))}
    </div>
  );
}

export function LayoutDemo() {
  return (
    <div className="eds-stack eds-gap-0">
      <section className="ld-section" aria-labelledby="ld-container">
        <div className="eds-container eds-container-2xl eds-stack">
          <h2 id="ld-container" className="eds-text-h2">
            Container
          </h2>
          <p className="eds-text-body ld-muted">
            Só estrutura: largura máxima, centralização e padding lateral responsivo. A borda
            tracejada é da demonstração.
          </p>
          {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
            <div key={size} className={`eds-container eds-container-${size} eds-container-flush`}>
              <Box>.eds-container-{size}</Box>
            </div>
          ))}
          <div className="eds-container eds-container-fluid ld-frame">
            <Box>.eds-container-fluid (padding lateral responsivo)</Box>
          </div>
        </div>
      </section>

      <section className="ld-section" aria-labelledby="ld-grid">
        <div className="eds-container eds-container-2xl eds-stack">
          <h2 id="ld-grid" className="eds-text-h2">
            Grid de 12 colunas
          </h2>
          <div className="eds-grid">
            {twelve.map((n) => (
              <div key={n} className="eds-col-span-1">
                <Box>{n}</Box>
              </div>
            ))}
            <div className="eds-col-span-8">
              <Box>span 8</Box>
            </div>
            <div className="eds-col-span-4">
              <Box>span 4</Box>
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="eds-col-span-4">
                <Box>span 4</Box>
              </div>
            ))}
          </div>

          <h3 className="eds-text-h3">Responsivo pelo próprio grid (container query)</h3>
          <p className="eds-text-body ld-muted">
            Mesmo markup (<code>eds-col-span-sm-6 eds-col-span-lg-3</code>): 1 coluna abaixo de
            640px de grid, 2 a partir de 640px, 4 a partir de 1024px. No painel lateral, a grade é
            estreita e empilha — independente da viewport.
          </p>
          <div className="eds-grid">
            <div className="eds-col-span-lg-8">
              <div className="ld-panel eds-stack">
                <span className="eds-text-label">Área principal</span>
                <KpiGrid />
              </div>
            </div>
            <div className="eds-col-span-lg-4">
              <div className="ld-panel eds-stack">
                <span className="eds-text-label">Painel lateral</span>
                <KpiGrid />
              </div>
            </div>
          </div>

          <h3 className="eds-text-h3">Intrínseco: .eds-grid-auto</h3>
          <p className="eds-text-body ld-muted">
            Sem nenhum span: as colunas cabem com mínimo de 256px e quebram sozinhas.
          </p>
          <div className="eds-grid eds-grid-auto">
            {['A', 'B', 'C', 'D', 'E'].map((n) => (
              <Box key={n}>Cartão {n}</Box>
            ))}
          </div>

          <h3 className="eds-text-h3">Subgrid: .eds-grid-subgrid</h3>
          <p className="eds-text-body ld-muted">
            O bloco interno ocupa as colunas 1–12 do pai e reutiliza as trilhas dele: os campos se
            alinham às mesmas linhas da régua acima.
          </p>
          <div className="eds-grid">
            {twelve.map((n) => (
              <div key={n} className="eds-col-span-1">
                <Box>{n}</Box>
              </div>
            ))}
            <div
              className="eds-grid eds-grid-subgrid ld-frame"
              role="group"
              aria-labelledby="ld-endereco"
            >
              <span id="ld-endereco" className="eds-text-label">
                Endereço (subgrid)
              </span>
              <div className="eds-col-span-md-9">
                <Box>Logradouro</Box>
              </div>
              <div className="eds-col-span-md-3">
                <Box>Número</Box>
              </div>
              <div className="eds-col-span-md-6">
                <Box>Cidade</Box>
              </div>
              <div className="eds-col-span-md-6">
                <Box>UF</Box>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ld-section" aria-labelledby="ld-stack">
        <div className="eds-container eds-container-2xl eds-stack">
          <h2 id="ld-stack" className="eds-text-h2">
            Stack
          </h2>
          <div className="eds-grid">
            <div className="eds-col-span-md-4">
              <div className="eds-stack eds-gap-2 ld-panel">
                <span className="eds-text-label">Vertical, gap 2</span>
                <Box>Item 1</Box>
                <Box>Item 2</Box>
                <Box>Item 3</Box>
              </div>
            </div>
            <div className="eds-col-span-md-8">
              <div className="eds-stack eds-gap-4 ld-panel">
                <span className="eds-text-label">Horizontal, justify between</span>
                <div className="eds-stack eds-stack-row eds-stack-wrap eds-stack-justify-between eds-gap-3">
                  <Box>Título da página</Box>
                  <div className="eds-stack eds-stack-row eds-gap-2">
                    <Box>Exportar</Box>
                    <Box>Novo</Box>
                  </div>
                </div>
                <span className="eds-text-label">Horizontal com quebra (wrap)</span>
                <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2">
                  {tags.map((tag) => (
                    <Box key={tag}>{tag}</Box>
                  ))}
                </div>
                <span className="eds-text-label">Alinhamento ao fim, centralizado</span>
                <div className="eds-stack eds-stack-row eds-stack-align-end eds-stack-justify-center">
                  <Box>baixo</Box>
                  <div className="eds-stack eds-gap-1">
                    <Box>alto</Box>
                    <Box>alto</Box>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
