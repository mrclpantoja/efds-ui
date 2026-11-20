import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import Exportar from '../../examples/table/exportar';
import exportarHtml from '../../examples/table/exportar.html?raw';
import exportarSource from '../../examples/table/exportar.tsx?raw';

export default function ExportacaoPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Exporta uma tabela para CSV, JSON, Excel (XLSX) e PDF reais, sem nenhuma dependência: o ZIP
        com o XML do Excel e o PDF 1.4 são escritos pelo próprio pacote. Roda no navegador; nada é
        enviado a servidor.
      </p>

      <Section title="Formatos">
        <ClassTable
          caption="Formatos de exportação"
          headers={['Formato', 'Características']}
          rows={[
            {
              name: 'csv',
              effect:
                'Separador ponto e vírgula, UTF-8 com BOM (abre no Excel pt-BR), números e datas no locale.',
            },
            { name: 'json', effect: 'Lista de objetos pelas chaves das colunas; datas ISO.' },
            {
              name: 'xlsx',
              effect:
                'Planilha real: tipos por coluna (número, moeda, data, percentual), cabeçalho em destaque, larguras. Datas antes de 01/03/1900 viram texto.',
            },
            {
              name: 'pdf',
              effect:
                'PDF com título, subtítulo, data de geração e numeração de páginas; fonte Helvetica (WinAnsi).',
            },
          ]}
        />
      </Section>

      <Section title="Exemplo">
        <Example
          title="Exportar a tabela"
          description="No HTML, data-eds-export aponta para a tabela, lida do DOM. No React, TableExport recebe os dados por data ou getData. O CPF é mascarado antes de sair."
          html={exportarHtml}
          react={{ Component: Exportar, source: exportarSource }}
        />
        <p>
          A tabela completa de atributos (<code>data-eds-export-*</code>, <code>th[data-type]</code>
          , <code>td[data-value]</code>) e de props está na página{' '}
          <a href={toHref('/componentes/table')}>Table</a>.
        </p>
      </Section>

      <Section title="Contrato">
        <ClassTable
          caption="Eventos e funções"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'eds:table-beforeexport (cancelável)',
              effect:
                'detail { format, scope, filename, count, data }. Altere data (mascare CPF, tire colunas) ou cancele (justificativa, auditoria).',
            },
            {
              name: 'eds:table-export',
              effect: 'Depois de gerar: { format, scope, filename, count }.',
            },
            {
              name: 'exportData, toCsv, toJson, toXlsx, toPdf',
              effect:
                'Funções puras exportadas por @eds-ui/behavior (e por @eds-ui/react), para gerar arquivos sem tabela.',
            },
            {
              name: '<TableExport data|getData onBeforeExport>',
              effect: 'Dropdown disclosure do React com os quatro formatos.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade e cuidados">
        <ul className="docs-list">
          <li>
            <strong>Anúncio:</strong> ao terminar, uma região <code>role=&quot;status&quot;</code>{' '}
            diz &quot;Arquivo tabela-2026-03-15.xlsx gerado (3 linhas).&quot; ou que não havia
            linhas.
          </li>
          <li>
            <strong>LGPD:</strong> a exportação leva para fora da tela o que o usuário vê. Mascare
            ou retire colunas de dados pessoais em <code>eds:table-beforeexport</code> (ou{' '}
            <code>onBeforeExport</code>) e registre a auditoria no servidor quando a regra exigir.
          </li>
          <li>
            <strong>Escopo:</strong> por padrão exporta as linhas marcadas, senão as visíveis (o
            filtro local vale). Paginação no servidor exporta só a página: gere o arquivo no
            servidor para o conjunto completo.
          </li>
          <li>
            <strong>Texto:</strong> nomes de arquivo, abas, &quot;Sim/Não&quot; e rodapés do PDF são
            configuráveis em <code>configure({'{ messages }'})</code>.
          </li>
        </ul>
      </Section>
    </>
  );
}
