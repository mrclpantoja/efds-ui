import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/image/estados';
import estadosHtml from '../../examples/image/estados.html?raw';
import estadosSource from '../../examples/image/estados.tsx?raw';
import Figura from '../../examples/image/figura';
import figuraHtml from '../../examples/image/figura.html?raw';
import figuraSource from '../../examples/image/figura.tsx?raw';
import Picture from '../../examples/image/picture';
import pictureHtml from '../../examples/image/picture.html?raw';
import pictureSource from '../../examples/image/picture.tsx?raw';
import Proporcoes from '../../examples/image/proporcoes';
import proporcoesHtml from '../../examples/image/proporcoes.html?raw';
import proporcoesSource from '../../examples/image/proporcoes.tsx?raw';

const srcsetCode = `import { buildSrcset, isImageFile, resizeImage } from '@efds-ui/behavior/image';

// As versões são do seu servidor ou CDN: você só diz a URL de cada largura e formato.
const { sources, srcset, src } = buildSrcset({
  src: (largura, formato) => \`/fotos/obra-\${largura}.\${formato === 'image/webp' ? 'webp' : 'jpg'}\`,
  widths: [480, 960, 1440],
  formats: ['image/webp', 'image/jpeg'], // o último é o fallback do <img>
});
// sources -> [{ type: 'image/webp', srcset: '/fotos/obra-480.webp 480w, ...' }]
// srcset  -> '/fotos/obra-480.jpg 480w, /fotos/obra-960.jpg 960w, ...'

// Reduzir uma foto no navegador antes de enviar (nada é enviado por esta chamada):
if (isImageFile(arquivo)) {
  const blob = await resizeImage(arquivo, { maxWidth: 1600, format: 'image/webp', quality: 0.8 });
}`;

export default function ImagePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Imagem com a proporção reservada antes de carregar (sem salto de layout), estado de
        carregamento, texto de reserva quando falha, <code>&lt;picture&gt;</code> com{' '}
        <code>srcset</code> e a figura com legenda e crédito.
      </p>

      <UseCases
        use={[
          'Para fotos e ilustrações de conteúdo: o envoltório reserva o espaço e cuida de carregamento e erro.',
          'Com Figure, quando a imagem tem legenda ou crédito.',
          'Com sources/widths, para entregar a largura e o formato certos a cada tela.',
        ]}
        avoid={[
          'Para ícones e glifos de interface: use o ícone, que herda a cor do texto.',
          'Para foto de pessoa em lista ou cabeçalho: use o Avatar.',
          'Como fundo decorativo sem significado: prefira CSS e deixe a imagem de fora do conteúdo.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Proporções, ajuste e círculo"
          description="1x1, 4x3, 3x2, 16x9, 21x9, 3x4 e 4x5. Cover (padrão) preenche cortando; eds-image-contain mostra inteira; eds-image-circle recorta em círculo."
          html={proporcoesHtml}
          react={{ Component: Proporcoes, source: proporcoesSource }}
        />
        <Example
          title="Carregando e erro"
          description="data-state vai de loading a loaded ou error. Em erro, o texto de reserva aparece no lugar da imagem."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
        <Example
          title="Picture e srcset"
          description="Formatos modernos primeiro e o img como fallback. sizes diz quanto da tela a imagem ocupa."
          html={pictureHtml}
          react={{ Component: Picture, source: pictureSource }}
        />
        <Example
          title="Figura com legenda e crédito"
          description="O alt descreve a imagem; a legenda dá o contexto e o crédito vai ao lado."
          html={figuraHtml}
          react={{ Component: Figura, source: figuraSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="O estado de carregamento vem do JS (opcional)">
          <p>
            Sem JavaScript a imagem aparece normalmente e o texto de reserva fica oculto. Com o{' '}
            <a href="/comecar/comportamento">@efds-ui/behavior</a> (inclusive a compilação core),
            todo <code>.eds-image</code> ganha <code>data-state</code> sozinho, sem atributo extra:
            ele trata a imagem que já carregou ou falhou antes do script, a troca de{' '}
            <code>src</code>/<code>srcset</code> e escreve “Imagem indisponível” no{' '}
            <code>.eds-image-fallback</code> vazio (ou o cria). O texto é configurável em{' '}
            <code>
              configure({'{'} messages: {'{'} imageUnavailable {'}'} {'}'})
            </code>
            .
          </p>
        </Alert>
        <p>
          Reserve sempre a proporção (<code>eds-image-ratio-*</code>) ou os atributos{' '}
          <code>width</code> e <code>height</code> da imagem: é isso que evita o salto de layout.
          Imagens abaixo da primeira dobra usam <code>loading=&quot;lazy&quot;</code>; a imagem
          principal da página usa <code>loading=&quot;eager&quot;</code>.
        </p>
        <h3 className="eds-text-h4">Funções para código próprio</h3>
        <p>
          O subcaminho <code>@efds-ui/behavior/image</code> exporta as funções puras (sem{' '}
          <code>init</code>) que o React usa por dentro. Tudo roda no navegador: nada é enviado.
        </p>
        <CodeBlock code={srcsetCode} label="Código JavaScript: srcset e redução de imagem" />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Image"
          rows={[
            {
              name: 'src',
              type: 'string',
              required: true,
              description: 'Endereço da imagem (fallback do picture).',
            },
            {
              name: 'alt',
              type: 'string',
              required: true,
              description: 'Texto alternativo. Vazio só para imagem puramente decorativa.',
            },
            {
              name: 'ratio',
              type: "'1x1' | '4x3' | '3x2' | '16x9' | '21x9' | '3x4' | '4x5'",
              description: 'Proporção reservada. Sem ela vale a da imagem.',
            },
            {
              name: 'fit',
              type: "'cover' | 'contain'",
              default: "'cover'",
              description: 'Preencher cortando ou mostrar inteira.',
            },
            { name: 'circle', type: 'boolean', default: 'false', description: 'Recorte circular.' },
            {
              name: 'sources',
              type: '{ srcSet, type?, media?, sizes? }[]',
              description: 'Fontes extras: com elas a imagem vira <picture>.',
            },
            {
              name: 'widths, getSrc, formats',
              type: 'number[], (largura, formato?) => string, string[]',
              description:
                'Monta srcset (e um source por formato moderno) a partir de uma função de URL. O último formato é o do img.',
            },
            { name: 'srcSet, sizes', type: 'string', description: 'Repassados ao img.' },
            {
              name: 'loading',
              type: "'lazy' | 'eager'",
              default: "'lazy'",
              description: "Use 'eager' na imagem principal.",
            },
            {
              name: 'texts',
              type: '{ unavailable }',
              description: 'Texto de reserva (pt-BR por padrão).',
            },
          ]}
        />
        <PropsTable
          caption="Props de Figure"
          rows={[
            { name: 'caption', type: 'ReactNode', description: 'Legenda (figcaption).' },
            {
              name: 'credit',
              type: 'ReactNode',
              description: 'Crédito, ao lado da legenda. Só aparece com caption.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da imagem"
          rows={[
            { name: '.eds-image', effect: 'Envoltório: reserva a proporção, esconde o excesso.' },
            {
              name: '.eds-image-ratio-1x1 … 4x5',
              effect: '1x1, 4x3, 3x2, 16x9, 21x9, 3x4 e 4x5.',
            },
            { name: '.eds-image-contain', effect: 'Mostra a imagem inteira em vez de cortar.' },
            { name: '.eds-image-circle', effect: 'Recorte circular.' },
            {
              name: '[data-state="loading|loaded|error"]',
              effect: 'Estado de carregamento; em error aparece o fallback.',
            },
            { name: '.eds-image-fallback', effect: 'Ícone e texto de reserva.' },
            { name: '.eds-figure', effect: 'A figura.' },
            { name: '.eds-figure-caption', effect: 'A legenda.' },
            { name: '.eds-figure-credit', effect: 'O crédito, dentro da legenda.' },
          ]}
        />
      </Section>

      <Section title="Eventos">
        <ClassTable
          caption="Eventos da imagem"
          headers={['Evento', 'Detalhe']}
          rows={[
            { name: 'eds:image-load', effect: '{ src }: a imagem carregou (no .eds-image).' },
            { name: 'eds:image-error', effect: '{ src }: a imagem falhou (no .eds-image).' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Texto alternativo:</strong> descreve o que a imagem comunica, não “imagem de”.
            Em imagem decorativa use <code>alt=&quot;&quot;</code>.
          </li>
          <li>
            <strong>Legenda não substitui o alt:</strong> o alt diz o que se vê; a legenda dá o
            contexto.
          </li>
          <li>
            <strong>Erro sem depender da cor:</strong> o texto de reserva diz que a imagem não
            carregou.
          </li>
          <li>
            <strong>Sem salto de layout:</strong> a proporção reservada evita mover o conteúdo
            enquanto a imagem carrega.
          </li>
        </ul>
      </Section>
    </>
  );
}
