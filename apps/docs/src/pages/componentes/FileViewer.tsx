import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Acoes from '../../examples/file-viewer/acoes';
import acoesSource from '../../examples/file-viewer/acoes.tsx?raw';
import Basico from '../../examples/file-viewer/basico';
import basicoHtml from '../../examples/file-viewer/basico.html?raw';
import basicoSource from '../../examples/file-viewer/basico.tsx?raw';
import Foto from '../../examples/file-viewer/foto';
import fotoHtml from '../../examples/file-viewer/foto.html?raw';
import fotoSource from '../../examples/file-viewer/foto.tsx?raw';

const codigoJs = `// Abre uma lista de arquivos no segundo item (compilação completa, eds-behavior.js)
const controle = EDS.viewer.open(
  [
    { src: '/arquivos/12?inline=1', name: 'Contrato social.pdf', type: 'application/pdf',
      downloadUrl: '/arquivos/12' },
    { src: '/arquivos/13?inline=1', name: 'Fachada.jpg', type: 'image/jpeg' },
  ],
  1,
  { download: false }, // opções desta chamada
);
controle.next(); // também prev(), go(i), close(), current e index
EDS.viewer.close();

// Configuração para o sistema todo
EDS.configure({ viewer: { pdf: 'auto', loadTimeout: 20000, maxTextBytes: 1048576 } });`;

const codigoAcoes = `// O detalhe de eds:viewer-open traz o diálogo: preencha o espaço de ações do autor.
document.addEventListener('eds:viewer-open', (event) => {
  const { dialog, item } = event.detail;
  const espaco = dialog.querySelector('.eds-viewer-actions');
  espaco.replaceChildren();
  const aprovar = document.createElement('button');
  aprovar.type = 'button';
  aprovar.className = 'eds-button eds-button-primary';
  aprovar.textContent = 'Aprovar';
  aprovar.addEventListener('click', () => registrarAprovacao(item.meta?.id));
  espaco.append(aprovar);
});`;

export default function FileViewerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Mostra um arquivo do sistema sem sair da página: PDF, imagem (com zoom e giro), vídeo, áudio
        e texto, num diálogo modal, com navegação entre os arquivos de um grupo. Tipos que o
        navegador não mostra ganham um aviso com Baixar e Abrir em nova aba.
      </p>

      <UseCases
        use={[
          'Para anexos de processos, contratos e chamados que a pessoa confere antes de decidir.',
          'Como visualização de um gerenciador de arquivos ou de uma tabela de documentos.',
          'Quando o arquivo vem de uma URL do próprio sistema, autenticada ou assinada por pouco tempo.',
        ]}
        avoid={[
          'Para um conjunto de fotos para folhear: use Galeria, que tem miniaturas e legendas.',
          'Para documentos do Office (Word, Excel): não há visualizador externo, por privacidade; eles mostram “Sem pré-visualização” e oferecem Baixar.',
          'Para arquivos que o sistema não pode expor no navegador: sirva uma versão em PDF ou deixe só o download.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Anexos do processo"
          description="Seis tipos no mesmo grupo: PDF, imagem, vídeo, áudio, texto e um ZIP (sem pré-visualização). Use as setas do teclado, Home e End para percorrer; Esc fecha."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Imagem com zoom e giro"
          description="Com um arquivo só não aparecem Anterior, Próximo nem o contador. Na imagem: + e - dão zoom, 0 ajusta, 1 mostra o tamanho real e R gira; arraste a imagem ampliada ou use Shift e as setas."
          html={fotoHtml}
          react={{ Component: Foto, source: fotoSource }}
        />
        <Example
          title="Ações do autor no rodapé"
          description="O espaço entre Anterior e Próximo é livre para o sistema: aqui, Aprovar e Recusar para o arquivo mostrado."
          react={{ Component: Acoes, source: acoesSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert tone="info" title="Funciona sem JavaScript">
          <p>
            Sem o <a href="/comecar/comportamento">@efds-ui/behavior</a> o link abre o arquivo em
            outra página, o que já resolve. Com a compilação completa (<code>eds-behavior.js</code>;
            a compilação core não inclui o visualizador), o clique abre o diálogo. Clique com Ctrl,
            Cmd ou Shift segue o link normal.
          </p>
        </Alert>
        <ClassTable
          caption="Atributos do gatilho (link ou botão)"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-viewer',
              effect: 'Liga o gatilho. O href do link é a URL de visualização (inline).',
            },
            {
              name: 'data-eds-viewer-src',
              effect: 'URL de visualização num botão (que não tem href).',
            },
            {
              name: 'data-eds-viewer-group',
              effect:
                'Gatilhos com o mesmo grupo navegam entre si, na ordem do documento. Sem grupo, o arquivo fica sozinho.',
            },
            {
              name: 'data-eds-viewer-type',
              effect:
                'MIME do arquivo. Sem ele, o tipo vem da extensão do nome (e, na falta, da URL).',
            },
            {
              name: 'data-eds-viewer-name',
              effect: 'Nome mostrado. Padrão: o texto do link.',
            },
            {
              name: 'data-eds-viewer-download',
              effect: 'URL de baixar. Padrão: a própria URL de visualização.',
            },
            {
              name: 'data-eds-viewer-kind',
              effect: 'Força o tipo: pdf, image, video, audio, text ou other.',
            },
            { name: 'data-eds-viewer-poster', effect: 'Imagem de capa do vídeo.' },
            {
              name: 'data-eds-viewer-size',
              effect: 'Tamanho em bytes, só informativo (aparece no aviso).',
            },
          ]}
        />
        <p>
          Para abrir a partir de código (uma linha de tabela, um menu), use{' '}
          <code>EDS.viewer.open(arquivos, indice, opcoes)</code>. O foco volta ao elemento que o
          tinha ao abrir.
        </p>
        <CodeBlock code={codigoJs} label="Código JavaScript: abrir o visualizador" />
        <p>
          O diálogo é criado ao abrir e removido ao fechar. Para pôr botões do sistema no espaço
          entre Anterior e Próximo, preencha-o no evento de abertura (ou entregue o{' '}
          <code>&lt;dialog class=&quot;eds-viewer&quot;&gt;</code> pronto no HTML: o visualizador
          usa o que encontrar e o mantém).
        </p>
        <CodeBlock code={codigoAcoes} label="Código JavaScript: ações no rodapé" />
      </Section>

      <Section title="Tipos de arquivo">
        <ClassTable
          caption="O que cada tipo mostra"
          headers={['Tipo', 'Quando e como é mostrado']}
          rows={[
            {
              name: 'pdf',
              effect:
                'application/pdf ou .pdf: no leitor do próprio navegador, num iframe. Em toque e em navegadores sem leitor, vira “Sem pré-visualização” (opção pdf).',
            },
            {
              name: 'image',
              effect:
                'image/* (menos SVG) ou jpg, png, gif, webp, avif, bmp: imagem com zoom, giro e arrasto.',
            },
            {
              name: 'video / audio',
              effect:
                'video/*, audio/* ou mp4, webm, ogv, mov, mp3, ogg, wav, m4a, flac: controles nativos; vídeo aceita legendas.',
            },
            {
              name: 'text',
              effect:
                'text/plain, csv, json, md, xml, log: lido por fetch (até 1 MB) e mostrado como texto, nunca como HTML.',
            },
            {
              name: 'other',
              effect:
                'O resto (Office, ZIP...), e também SVG e HTML, de propósito: podem carregar script. Mostra Baixar e Abrir em nova aba.',
            },
          ]}
        />
      </Section>

      <Section title="Opções">
        <PropsTable
          caption="Opções do visualizador (por chamada, props do React ou EDS.configure({ viewer }))"
          rows={[
            {
              name: 'pdf',
              type: "'auto' | 'embed' | 'link'",
              default: "'auto'",
              description:
                'auto embute o PDF onde há leitor (não em toque nem sem pdfViewerEnabled); embed sempre embute; link nunca.',
            },
            {
              name: 'loadTimeout',
              type: 'number (ms)',
              default: '20000',
              description: 'Tempo até o carregamento virar erro, com Tentar de novo.',
            },
            {
              name: 'maxTextBytes',
              type: 'number (bytes)',
              default: '1048576',
              description: 'Limite do arquivo de texto; acima disso vira erro com Baixar.',
            },
            {
              name: 'download',
              type: 'boolean',
              default: 'true',
              description: 'false esconde Baixar (quando o sistema proíbe).',
            },
            {
              name: 'openInNewTab',
              type: 'boolean',
              default: 'true',
              description: 'false esconde Abrir em nova aba.',
            },
          ]}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de FileViewer"
          rows={[
            {
              name: 'items',
              type: 'ViewerItem[]',
              required: true,
              description:
                '{ src, name, type?, kind?, downloadUrl?, size?, poster?, tracks?, meta? }.',
            },
            {
              name: 'open',
              type: 'boolean',
              required: true,
              description: 'Aberto ou fechado, como o Modal.',
            },
            {
              name: 'onClose',
              type: '() => void',
              required: true,
              description:
                'Pedido de fechar (Esc ou Fechar). Quem controla passa open={false}. O fundo não fecha.',
            },
            {
              name: 'index / onIndexChange',
              type: 'number / (index: number) => void',
              description:
                'Arquivo mostrado. Sem index, o componente guarda o índice (começa em 0).',
            },
            {
              name: 'actions',
              type: '(item: ViewerItem) => ReactNode',
              description: 'Ações do autor no rodapé, para o arquivo mostrado.',
            },
            {
              name: 'pdf, loadTimeout, maxTextBytes, download, openInNewTab',
              type: 'ver Opções',
              description: 'As mesmas opções do HTML.',
            },
            {
              name: 'texts',
              type: 'Partial<FileViewerTexts>',
              description: 'Textos internos (pt-BR por padrão).',
            },
          ]}
        />
        <p>
          <code>useFileViewer()</code> devolve{' '}
          <code>{'{ open(items, index?), close(), viewerProps }'}</code>: abra de qualquer lugar e
          espalhe <code>viewerProps</code> no componente.
        </p>
      </Section>

      <Section title="Teclado">
        <ClassTable
          caption="Atalhos do visualizador"
          headers={['Tecla', 'Efeito']}
          rows={[
            { name: 'Esc', effect: 'Fecha e devolve o foco ao gatilho.' },
            {
              name: '← →, PageUp, PageDown',
              effect: 'Arquivo anterior e próximo (sem voltar ao início nas pontas).',
            },
            { name: 'Home, End', effect: 'Primeiro e último arquivo.' },
            {
              name: '+ −, 0, 1, R',
              effect:
                'Só em imagem: ampliar, reduzir, ajustar à tela, tamanho real e girar 90 graus.',
            },
            {
              name: 'Shift + setas',
              effect: 'Só em imagem: move a imagem ampliada (também se arrasta com o ponteiro).',
            },
          ]}
        />
        <p>
          Com o foco no vídeo, no áudio, no texto rolável ou no leitor de PDF as setas ficam para
          eles: a troca de arquivo fica nos botões Anterior e Próximo.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do visualizador"
          rows={[
            {
              name: 'dialog.eds-viewer',
              effect:
                'O diálogo (data-mode="dark" e o data-theme vigente). Em telas estreitas ocupa tudo.',
            },
            {
              name: '.eds-viewer-header / -title / -position / -tools / -close',
              effect: 'Cabeçalho: nome do arquivo, “2 de 5”, ferramentas e fechar.',
            },
            {
              name: '.eds-viewer-stage',
              effect: 'Palco; data-state="loading|ready|error|unsupported".',
            },
            {
              name: '.eds-viewer-image / -frame / -video / -audio / -text',
              effect: 'O conteúdo de cada tipo.',
            },
            {
              name: '.eds-viewer-footer / -prev / -next / -actions',
              effect: 'Rodapé; -actions é o espaço livre do autor.',
            },
          ]}
        />
      </Section>

      <Section title="Eventos">
        <ClassTable
          caption="Eventos do visualizador (no gatilho; se aberto por código, no diálogo)"
          headers={['Evento', 'Detalhe']}
          rows={[
            {
              name: 'eds:viewer-open',
              effect:
                '{ item, index, items, trigger, dialog }: cancelável (impede a abertura). dialog serve para preencher as ações.',
            },
            { name: 'eds:viewer-change', effect: '{ item, index }: a cada troca de arquivo.' },
            { name: 'eds:viewer-close', effect: '{ item, index }: o último arquivo visto.' },
            {
              name: 'eds:viewer-error',
              effect: "{ item, reason }: reason é 'timeout', 'network' ou 'too-large'.",
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Diálogo modal nomeado pelo arquivo:</strong> o foco fica preso, começa no Fechar
            e volta ao gatilho ao fechar. O fundo não fecha o diálogo, para não perder o que o autor
            colocou nas ações.
          </li>
          <li>
            <strong>Um anúncio por troca:</strong> “Arquivo 2 de 5: Relatório.pdf.”, além de zoom,
            giro, erro e “sem pré-visualização”, numa região de status.
          </li>
          <li>
            <strong>Tudo que se faz arrastando também se faz por botão ou tecla:</strong> zoom, giro
            e deslocamento da imagem.
          </li>
          <li>
            <strong>Texto alternativo:</strong> o iframe do PDF leva title, a imagem leva alt e o
            vídeo e o áudio levam aria-label, todos com o nome do arquivo.
          </li>
          <li>
            <strong>Vídeo:</strong> informe legendas em <code>tracks</code> quando o conteúdo tiver
            fala.
          </li>
          <li>
            <strong>Carregamento sem pressa visual:</strong> o círculo só aparece depois de 300 ms e
            não gira com “reduzir movimento”.
          </li>
        </ul>
      </Section>

      <Section title="Privacidade e segurança">
        <ul className="docs-list">
          <li>
            Arquivo é dado pessoal até prova em contrário: nada sai do navegador para terceiros. Não
            há visualizador externo (Google Docs, Office Online) nem biblioteca baixada de CDN; o
            PDF usa o leitor do próprio navegador.
          </li>
          <li>
            Use URLs do próprio sistema, autenticadas ou assinadas por pouco tempo. Para a
            visualização, sirva só PDF, imagem (sem SVG), vídeo, áudio e texto como{' '}
            <code>text/plain</code>, com <code>X-Content-Type-Options: nosniff</code>; o resto,
            sempre como download.
          </li>
          <li>
            O texto é mostrado com <code>textContent</code>: tags no arquivo aparecem como texto.
          </li>
        </ul>
      </Section>
    </>
  );
}
