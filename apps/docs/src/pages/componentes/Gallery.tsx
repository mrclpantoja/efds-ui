import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/gallery/basico';
import basicoHtml from '../../examples/gallery/basico.html?raw';
import basicoSource from '../../examples/gallery/basico.tsx?raw';
import Proporcao from '../../examples/gallery/proporcao';
import proporcaoHtml from '../../examples/gallery/proporcao.html?raw';
import proporcaoSource from '../../examples/gallery/proporcao.tsx?raw';

export default function GalleryPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Grade de miniaturas que abre num visualizador (lightbox) com contador, legenda, setas,
        teclado e deslizar no toque. Sem JavaScript, cada miniatura é um link para a imagem grande.
      </p>

      <UseCases
        use={[
          'Para um conjunto de fotos que a pessoa quer ver ampliadas e percorrer em sequência.',
          'Quando cada foto tem legenda curta e o contador “3 de 12” ajuda a se situar.',
        ]}
        avoid={[
          'Para uma imagem só: use Image, com um link para a versão grande se precisar.',
          'Como carrossel de destaque ou banner rotativo: não há rotação automática.',
          'Para vídeos ou documentos: o visualizador mostra apenas imagens.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Galeria com legendas"
          description="Clique ou Enter numa miniatura abre o visualizador. As setas do teclado, Home, End e Esc funcionam; no toque, deslize para os lados."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Miniaturas 4x3"
          description="Por padrão as miniaturas são quadradas; eds-gallery-4x3 usa a proporção 4 por 3."
          html={proporcaoHtml}
          react={{ Component: Proporcao, source: proporcaoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Funciona sem JavaScript">
          <p>
            Sem o <a href="/comecar/comportamento">@efds-ui/behavior</a> o link abre a imagem grande
            numa página própria, o que já é uma boa experiência. Com a compilação completa (
            <code>eds-behavior.js</code>; a compilação core não inclui o visualizador), o clique
            abre o diálogo <code>eds-lightbox</code>, escuro no tema vigente. O <code>alt</code> da
            imagem grande é o da miniatura; <code>data-eds-caption</code> é a legenda. Clique com
            Ctrl, Cmd ou Shift segue o link normal.
          </p>
        </Alert>
        <p>
          Quem quiser chamar o comportamento a partir de código usa{' '}
          <code>EDS.initGallery(raiz)</code>. O visualizador é criado ao abrir e removido ao fechar;
          as miniaturas podem ser acrescentadas depois (o comportamento observa a raiz).
        </p>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Gallery"
          rows={[
            {
              name: 'label',
              type: 'string',
              required: true,
              description: 'Nome da galeria; também nomeia o visualizador.',
            },
            {
              name: 'items',
              type: '{ src, thumb, alt, caption?, width?, height? }[]',
              required: true,
              description:
                'src é a imagem grande; thumb, a miniatura. width e height reservam o espaço da miniatura.',
            },
            {
              name: 'ratio',
              type: "'1x1' | '4x3'",
              default: "'1x1'",
              description: 'Proporção das miniaturas.',
            },
            {
              name: 'onIndexChange',
              type: '(index: number) => void',
              description: 'A imagem mostrada mudou (ou o visualizador abriu).',
            },
            {
              name: 'texts',
              type: '{ close, prev, next, counter(atual, total), unavailable }',
              description: 'Textos internos (pt-BR por padrão).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes da galeria e do visualizador"
          rows={[
            { name: '.eds-gallery', effect: 'A grade de miniaturas (lista).' },
            { name: '.eds-gallery-4x3', effect: 'Miniaturas em 4 por 3.' },
            { name: '.eds-gallery-item', effect: 'O link de cada miniatura.' },
            {
              name: 'dialog.eds-modal.eds-lightbox',
              effect: 'O visualizador (data-mode="dark" e o data-theme vigente).',
            },
            {
              name: '.eds-lightbox-prev / -next',
              effect: 'Botões de navegação; disabled nas pontas, sem volta ao início.',
            },
            {
              name: '.eds-lightbox-header / -counter',
              effect: 'Cabeçalho com o contador “3 de 12” e o botão de fechar.',
            },
            {
              name: '.eds-lightbox-stage',
              effect: 'Onde fica a imagem; data-state="loading|error".',
            },
            { name: '.eds-lightbox-caption', effect: 'A legenda (oculta quando vazia).' },
          ]}
        />
      </Section>

      <Section title="Eventos">
        <ClassTable
          caption="Eventos da galeria"
          headers={['Evento', 'Detalhe']}
          rows={[
            { name: 'eds:gallery-open', effect: '{ index, total, trigger } (na galeria).' },
            {
              name: 'eds:gallery-change',
              effect: '{ index, total, src }: a cada troca de imagem.',
            },
            { name: 'eds:gallery-close', effect: '{ index, total }: a última imagem vista.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Diálogo modal:</strong> o foco fica preso, Esc fecha e, ao fechar, o foco volta
            à miniatura da última imagem vista (não à primeira).
          </li>
          <li>
            <strong>Teclado:</strong> setas esquerda e direita trocam, Home e End vão às pontas. Nas
            pontas o botão fica desabilitado e o foco passa ao outro lado.
          </li>
          <li>
            <strong>Anúncio a cada troca:</strong> a região polida lê “3 de 12” e a legenda.
          </li>
          <li>
            <strong>Texto alternativo:</strong> a imagem grande leva o alt da miniatura; descreva
            cada foto, não a galeria.
          </li>
          <li>
            <strong>Sem armadilha de gesto:</strong> tudo que se faz deslizando também se faz pelos
            botões.
          </li>
        </ul>
      </Section>
    </>
  );
}
