import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/description-list/basico';
import basicoHtml from '../../examples/description-list/basico.html?raw';
import basicoSource from '../../examples/description-list/basico.tsx?raw';
import Colunas from '../../examples/description-list/colunas';
import colunasHtml from '../../examples/description-list/colunas.html?raw';
import colunasSource from '../../examples/description-list/colunas.tsx?raw';
import Horizontal from '../../examples/description-list/horizontal';
import horizontalHtml from '../../examples/description-list/horizontal.html?raw';
import horizontalSource from '../../examples/description-list/horizontal.tsx?raw';
import Listrada from '../../examples/description-list/listrada';
import listradaHtml from '../../examples/description-list/listrada.html?raw';
import listradaSource from '../../examples/description-list/listrada.tsx?raw';

export default function DescriptionListPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Pares rótulo e valor de um registro: dados de um pedido, de um perfil, de uma ficha. É um{' '}
        <code>&lt;dl&gt;</code> semântico, com colunas que se ajustam à largura do contêiner.
      </p>

      <UseCases
        use={[
          'Para mostrar os dados de um único registro, em leitura.',
          'Dentro de um Card, de um Drawer de detalhe ou de uma página de consulta.',
        ]}
        avoid={[
          'Para muitos registros com as mesmas colunas: use Table.',
          'Para campos que o usuário edita: use Field com os controles.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Básico"
          description="Valor vazio mostra “—” (decorativo) e o texto oculto “não informado”, para o leitor de tela ler o motivo."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Colunas"
          description="2 ou 3 são o máximo: a lista usa menos quando o contêiner é estreito (cada coluna tem no mínimo 14rem), sem media query."
          html={colunasHtml}
          react={{ Component: Colunas, source: colunasSource }}
        />
        <Example
          title="Horizontal e dividida"
          description="Rótulo à esquerda e valor à direita; abaixo de 28rem do próprio contêiner volta a empilhar."
          html={horizontalHtml}
          react={{ Component: Horizontal, source: horizontalSource }}
        />
        <Example
          title="Listrada"
          description="Listras alternadas, para linhas longas (uma coluna)."
          html={listradaHtml}
          react={{ Component: Listrada, source: listradaSource }}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de DescriptionList"
          rows={[
            {
              name: 'items',
              type: '{ label, value?, id? }[]',
              required: true,
              description: 'Os pares. value vazio mostra “—” e “não informado”.',
            },
            { name: 'columns', type: '1 | 2 | 3', default: '1', description: 'Máximo de colunas.' },
            {
              name: 'horizontal',
              type: 'boolean',
              default: 'false',
              description: 'Rótulo ao lado do valor.',
            },
            {
              name: 'divided',
              type: 'boolean',
              default: 'false',
              description: 'Linha entre os itens.',
            },
            {
              name: 'striped',
              type: 'boolean',
              default: 'false',
              description: 'Listras alternadas.',
            },
            { name: 'texts', type: '{ empty }', description: 'Texto oculto do valor vazio.' },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da DescriptionList"
          rows={[
            {
              name: 'dl.eds-description-list',
              effect: 'A lista (div > dt + dd). Uma coluna por padrão.',
            },
            { name: '.eds-description-list-cols-2 / -cols-3', effect: 'Máximo de colunas.' },
            {
              name: '.eds-description-list-horizontal',
              effect: 'Rótulo à esquerda, valor à direita.',
            },
            { name: '.eds-description-list-divided / -striped', effect: 'Separadores ou listras.' },
            { name: '.eds-description-empty', effect: 'O “—” de valor vazio (aria-hidden).' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            O <code>&lt;dl&gt;</code> com <code>&lt;div&gt;</code> agrupando <code>dt</code> e{' '}
            <code>dd</code> é lido como lista de termos e descrições.
          </li>
          <li>
            O valor vazio diz o motivo (“não informado”) em texto oculto; o travessão é só visual.
          </li>
        </ul>
      </Section>
    </>
  );
}
