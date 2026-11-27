import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Foto from '../../examples/cropper/foto';
import fotoHtml from '../../examples/cropper/foto.html?raw';
import fotoSource from '../../examples/cropper/foto.tsx?raw';
import Inline from '../../examples/cropper/inline';
import inlineSource from '../../examples/cropper/inline.tsx?raw';

export default function ImageCropperPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Corte de foto de perfil: a pessoa escolhe a imagem, arrasta, amplia e gira, e o navegador
        entrega um arquivo pronto (recortado, redimensionado e comprimido). Funciona com o File
        Input e com o File Upload.
      </p>

      <Alert tone="info" title="Privacidade (LGPD)">
        <p>
          A foto de uma pessoa é dado pessoal. O corte roda <strong>só no navegador</strong>: nada é
          enviado a lugar nenhum pelo efDS.ui, não há chamada externa e a imagem não é guardada. Ela
          só segue adiante quando o seu formulário (ou o seu código) a envia, e isso é decisão e
          responsabilidade do autor, com base legal e aviso ao titular.
        </p>
      </Alert>

      <UseCases
        use={[
          'Para foto de perfil e logotipo, onde o tamanho final é conhecido (ex.: 256 por 256).',
          'Para reduzir o peso do envio: o arquivo sai em WebP (ou JPEG) já comprimido.',
        ]}
        avoid={[
          'Para edição de fotos (filtros, ajuste de cor, várias camadas): o cortador só posiciona, amplia e gira.',
          'Para documentos digitalizados: o recorte e a compressão podem prejudicar a leitura.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Foto do perfil"
          description="Escolha uma imagem do seu computador: o diálogo “Ajustar foto” abre; Aplicar põe no campo o arquivo pronto e atualiza o avatar. Nada é enviado."
          html={fotoHtml}
          react={{ Component: Foto, source: fotoSource }}
        />
        <Example
          title="Cortador inline (React)"
          description="O ImageCropper sem diálogo, com a imagem fictícia do exemplo. O ref entrega o arquivo: toFile() e toBlob()."
          react={{ Component: Inline, source: inlineSource }}
        />
      </Section>

      <Section title="HTML puro">
        <p>
          Marque o <code>input type=&quot;file&quot;</code> com <code>data-eds-cropper</code>
          (compilação completa do <a href="/comecar/comportamento">@efds-ui/behavior</a>). Sem
          JavaScript o campo envia o arquivo original, sem corte.
        </p>
        <ClassTable
          caption="Atributos do input"
          headers={['Atributo', 'Efeito']}
          rows={[
            { name: 'data-eds-cropper', effect: 'Liga o corte neste input.' },
            { name: 'data-eds-cropper-size', effect: 'Maior lado da saída, em px (256).' },
            { name: 'data-eds-cropper-aspect', effect: 'Largura / altura do quadro (1).' },
            {
              name: 'data-eds-cropper-shape',
              effect: 'circle ou rect (rect): só o desenho do quadro; a saída é retangular.',
            },
            {
              name: 'data-eds-cropper-format',
              effect:
                'image/webp (padrão), image/jpeg ou image/png. Sem suporte do navegador ao WebP, cai para JPEG com fundo branco.',
            },
            {
              name: 'data-eds-cropper-quality',
              effect: 'De 0 a 1 (0,85), para formatos com perda.',
            },
            {
              name: 'data-eds-cropper-preview',
              effect: 'Seletor do avatar (ou da img) que mostra a foto aplicada.',
            },
          ]}
        />
        <p>
          Ao escolher o arquivo o <code>change</code> original é interceptado: um arquivo que não é
          imagem é recusado com erro visível ligado ao campo; uma imagem abre o diálogo. “Aplicar”
          troca <code>input.files</code> pelo arquivo cortado (<code>nome.webp</code> ou{' '}
          <code>.jpg</code>) e dispara o <code>change</code> de novo, para o File Upload seguir o
          fluxo normal (lista ou envio imediato). “Cancelar” ou Esc mantém o arquivo aceito antes,
          ou deixa o campo vazio. A orientação do EXIF é respeitada e imagens muito grandes são
          reduzidas antes de abrir, para não pesar em celulares.
        </p>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de AvatarUpload"
          rows={[
            {
              name: 'personName',
              type: 'string',
              required: true,
              description: 'Nome da pessoa: iniciais, nome acessível e tom do Avatar.',
            },
            {
              name: 'name',
              type: 'string',
              description: 'name do input real: o arquivo cortado vai no envio do formulário.',
            },
            {
              name: 'value',
              type: 'string',
              description: 'Foto atual (URL), mostrada até haver uma nova.',
            },
            {
              name: 'onValueChange',
              type: '(file: File, crop) => void',
              description: 'Uma foto nova foi aplicada: o arquivo pronto e o recorte.',
            },
            {
              name: 'outputSize, format, quality',
              type: 'number, string, number',
              description: 'Saída: 256, image/webp, 0,85.',
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'lg'",
              description: 'Tamanho do avatar.',
            },
            {
              name: 'texts',
              type: 'objeto parcial',
              description: 'Todos os textos, inclusive os do diálogo e do cortador.',
            },
          ]}
        />
        <PropsTable
          caption="Props de ImageCropper (e o ref)"
          rows={[
            {
              name: 'src',
              type: 'string',
              required: true,
              description: 'Imagem a cortar (URL, blob: ou data:).',
            },
            {
              name: 'aspect',
              type: 'number',
              default: '1',
              description: 'Largura / altura do quadro.',
            },
            {
              name: 'shape',
              type: "'circle' | 'rect'",
              default: "'rect'",
              description: 'Desenho do quadro.',
            },
            {
              name: 'value, onValueChange',
              type: 'CropState',
              description: 'Enquadramento controlado ({ x, y, scale, rotation }).',
            },
            {
              name: 'outputSize, format, quality',
              type: 'number, string, number',
              description: 'Saída padrão do ref.',
            },
            {
              name: 'ref',
              type: '{ toBlob, toFile, getCrop, reset }',
              description:
                'toFile(nome?, opções?) e toBlob(opções?) devolvem o arquivo pronto; nada é enviado.',
            },
            {
              name: 'texts',
              type: 'objeto parcial',
              description: 'Nomes, dica e status (pt-BR por padrão).',
            },
          ]}
        />
        <PropsTable
          caption="Props de ImageCropperDialog"
          rows={[
            {
              name: 'open, file, onClose',
              type: 'boolean, File | null, () => void',
              required: true,
              description: 'Controle do diálogo; o pai fecha com open=false.',
            },
            {
              name: 'onApply',
              type: '(file, blob, crop) => void',
              required: true,
              description: 'Aplicar entregou o arquivo pronto.',
            },
            {
              name: 'aspect, shape, outputSize, format, quality, texts',
              type: 'como no ImageCropper',
              description: 'Mesmos significados.',
            },
          ]}
        />
        <p>
          As funções puras (<code>loadImage</code>, <code>cropImage</code>, <code>resizeImage</code>
          , <code>buildSrcset</code>, <code>isImageFile</code> e a matemática de pan, zoom e giro)
          estão em <code>@efds-ui/behavior/image</code>, sem <code>init</code>.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do cortador"
          rows={[
            { name: '.eds-cropper[data-shape-crop]', effect: 'Raiz; circle ou rect.' },
            {
              name: '.eds-cropper-stage',
              effect:
                'Área de corte (foco, role=group). O JS só escreve --_cropper-x, -y, -scale, -rotate e -aspect, e data-dragging no arraste.',
            },
            { name: '.eds-cropper-image', effect: 'A imagem, movida pelas variáveis.' },
            { name: '.eds-cropper-frame', effect: 'O quadro de corte (decorativo, aria-hidden).' },
            {
              name: '.eds-cropper-hint',
              effect: 'Dica de uso, ligada à área por aria-describedby.',
            },
            {
              name: '.eds-cropper-controls / .eds-cropper-zoom',
              effect: 'Botões (zoom, girar, restaurar) e o zoom deslizante.',
            },
          ]}
        />
      </Section>

      <Section title="Eventos">
        <ClassTable
          caption="Eventos do corte"
          headers={['Evento', 'Detalhe']}
          rows={[
            {
              name: 'eds:cropper-apply',
              effect:
                '{ file, blob, crop: { x, y, width, height, rotation }, width, height } (no input).',
            },
            {
              name: 'eds:cropper-cancel',
              effect: '{ file }: cancelado ou fechado com Esc (no input).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Sem depender do mouse:</strong> a área de corte recebe o foco; setas movem
            (Shift, passo maior), + e - ampliam, R gira e 0 restaura. Há botões e zoom deslizante
            equivalentes.
          </li>
          <li>
            <strong>Status:</strong> “Zoom 150%” e “Girada 90 graus” são anunciados de forma polida,
            sem repetir a cada passo do arraste.
          </li>
          <li>
            <strong>Erros visíveis:</strong> arquivo que não é imagem e imagem ilegível aparecem em
            texto, ligados ao campo.
          </li>
          <li>
            <strong>Diálogo:</strong> o fundo não fecha o diálogo (evita perder o ajuste); Esc e
            Cancelar sim, e o foco volta ao campo.
          </li>
          <li>
            <strong>Aviso não bloqueante:</strong> se a imagem for menor que o tamanho final, a dica
            avisa que a foto pode ficar com pouca nitidez.
          </li>
        </ul>
      </Section>
    </>
  );
}
