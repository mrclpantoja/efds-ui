import { Alert } from '@efds-ui/react';
import { configure } from '@efds-ui/behavior';
import { createMemoryAdapter } from '@efds-ui/behavior/files';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import { toHref } from '../../router';
import Basico from '../../examples/files/basico';
import basicoHtml from '../../examples/files/basico.html?raw';
import basicoSource from '../../examples/files/basico.tsx?raw';
import Eventos from '../../examples/files/eventos';
import eventosSource from '../../examples/files/eventos.tsx?raw';
import SomenteLeitura from '../../examples/files/somente-leitura';
import somenteLeituraHtml from '../../examples/files/somente-leitura.html?raw';
import somenteLeituraSource from '../../examples/files/somente-leitura.tsx?raw';

// Nesta documentação os exemplos em HTML usam um adaptador em memória (dados fictícios) no lugar
// da API: cada gerenciador ganha o seu. Em produção, `data-eds-files-api` basta.
configure({ files: { adapter: () => createMemoryAdapter(undefined, { latency: 120 }) } });

const codigoJs = `const el = document.querySelector('[data-eds-files]');

// Eventos (todos sobem pelo contêiner)
el.addEventListener('eds:files-navigate', (e) => console.log(e.detail.path));
el.addEventListener('eds:files-select',   (e) => console.log(e.detail.items));
el.addEventListener('eds:files-change',   (e) => console.log(e.detail.action, e.detail.items));
el.addEventListener('eds:files-error',    (e) => console.warn(e.detail.action, e.detail.status));

// Cancelável: com preventDefault o visualizador não abre (abra o arquivo do seu jeito)
el.addEventListener('eds:files-open', (e) => {
  if (e.detail.item.name.endsWith('.zip')) e.preventDefault();
});

// CSRF e outros cabeçalhos de toda requisição
EDS.configure({ files: { headers: { 'X-CSRF-Token': token }, credentials: 'same-origin' } });
// ou, por requisição:
el.addEventListener('eds:files-request', (e) => { e.detail.init.headers['X-Trace'] = id; });

// Controle programático
const gerenciador = EDS.files(el);
await gerenciador.navigate('/Contratos');
gerenciador.select(['/Contratos/Aditivo 01.pdf']);
gerenciador.upload([new File(['conteúdo'], 'nota.txt', { type: 'text/plain' })]);
await gerenciador.refresh();`;

const codigoAdaptador = `import { createHttpAdapter, type FilesAdapter } from '@efds-ui/behavior/files';

// Padrão do <FileManager api="...">: o cliente HTTP, com cabeçalhos e credenciais.
const http = createHttpAdapter('/api/arquivos', { headers: () => ({ 'X-CSRF-Token': csrf() }) });

// Qualquer fonte que cumpra FilesAdapter serve (GraphQL, tRPC, mock). Troque só o que precisa:
const meu: FilesAdapter = { ...http, list: (path, opts) => minhaConsulta(path, opts) };

<FileManager adapter={meu} />;`;

export default function FileManagerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Navega por pastas, envia, renomeia, move, copia, exclui e restaura arquivos de um sistema:
        trilha, árvore de pastas, lista ou grade, busca, lixeira com “Desfazer” e versões. Ele fala
        só com a API do seu sistema (o navegador nunca vê o S3 nem o disco) e abre os arquivos no{' '}
        <a href="/componentes/file-viewer">Visualizador de arquivos</a>.
      </p>

      <UseCases
        use={[
          'Para anexos e documentos de processos, contratos, prontuários e cadastros que a equipe organiza em pastas.',
          'Quando as regras de acesso, a cota e a retenção ficam no servidor e a interface só as obedece.',
          'Em portais e painéis internos que já têm uma API de arquivos (disco, S3, banco) por trás.',
        ]}
        avoid={[
          'Para escolher um arquivo num formulário: use o campo de arquivo ou o envio por arrastar.',
          'Para folhear fotos: use a Galeria.',
          'Para sincronizar com serviços externos (Drive, OneDrive): não há integração; os arquivos ficam no seu servidor.',
        ]}
      />

      <Alert tone="info" title="Dados pessoais">
        <p>
          Arquivo é dado pessoal até prova em contrário. Sem <code>api</code> configurada o
          componente não faz nenhuma requisição; nada vai a terceiros e nenhuma biblioteca é
          carregada de CDN. O servidor decide quem vê o quê e responde a cada chamada (veja o{' '}
          <a href={toHref('/comecar/servidor-arquivos')}>contrato do servidor de arquivos</a>).
        </p>
      </Alert>

      <Section title="Exemplos">
        <Example
          title="Gerenciador completo"
          description="Dados fictícios na memória da página. Experimente: abrir pastas pela trilha e pela árvore, ordenar, arrastar um item para uma pasta (Ctrl copia), recortar e colar (Ctrl+X e Ctrl+V), Excluir e Desfazer, Lixeira, Versões do Contrato social e enviar arquivos."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Somente leitura, em grade"
          description="Para quem só consulta: sem envio, sem edição e sem lixeira de edição."
          html={somenteLeituraHtml}
          react={{ Component: SomenteLeitura, source: somenteLeituraSource }}
        />
        <Example
          title="Pasta controlada e eventos"
          description="A pasta aberta vem do estado do seu app (útil para sincronizar com a rota). onOpen devolvendo false impede o visualizador (aqui, para o Leia-me.txt)."
          react={{ Component: Eventos, source: eventosSource }}
        />
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="Atributos do contêiner [data-eds-files]"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-files-api',
              effect:
                'Base da API HTTP. Obrigatório: sem ela (e sem adaptador configurado) nada é requisitado.',
            },
            { name: 'data-eds-files-path', effect: 'Pasta inicial (padrão /).' },
            { name: 'data-eds-files-view', effect: 'list (padrão) ou grid.' },
            {
              name: 'data-eds-files-readonly',
              effect: 'Esconde as ações de escrita. O servidor também deve recusá-las.',
            },
            {
              name: 'data-eds-files-root-label',
              effect: 'Nome da raiz na trilha (padrão “Arquivos”).',
            },
          ]}
        />
        <Alert tone="info" title="Compilação completa">
          <p>
            O gerenciador faz parte de <code>eds-behavior.js</code> (completa); a compilação core
            não o inclui. Sem JavaScript, o servidor pode entregar a lista como links comuns.
          </p>
        </Alert>
        <CodeBlock code={codigoJs} label="Código JavaScript: eventos, cabeçalhos e controle" />
        <ClassTable
          caption="Eventos (detail)"
          headers={['Evento', 'Quando']}
          rows={[
            { name: 'eds:files-navigate', effect: '{ path } ao abrir outra pasta.' },
            { name: 'eds:files-select', effect: '{ items } quando a seleção muda.' },
            {
              name: 'eds:files-open',
              effect: '{ item }, cancelável: com preventDefault o visualizador não abre.',
            },
            {
              name: 'eds:files-change',
              effect:
                '{ action, items, target? } depois de cada operação: createFolder, rename, move, copy, delete, upload, restore, deleteForever, emptyTrash, restoreVersion.',
            },
            {
              name: 'eds:files-error',
              effect: '{ action, status, error } quando uma operação falha.',
            },
            {
              name: 'eds:files-request',
              effect: '{ url, init } antes de cada requisição, com init mutável (cabeçalhos).',
            },
          ]}
        />
      </Section>

      <Section title="React">
        <PropsTable
          caption="Props do FileManager (além dos atributos de div)"
          rows={[
            {
              name: 'api',
              type: 'string',
              description:
                'Base da API (usa o cliente HTTP). Sem api nem adapter, nada é requisitado.',
            },
            {
              name: 'adapter',
              type: 'FilesAdapter',
              description:
                'Adaptador próprio; tem prioridade sobre api. createMemoryAdapter serve a testes e demos.',
            },
            {
              name: 'path / defaultPath / onPathChange',
              type: 'string',
              default: "'/'",
              description: 'Pasta aberta, controlada ou não.',
            },
            {
              name: 'view / defaultView / onViewChange',
              type: "'list' | 'grid'",
              default: "'list'",
              description: 'Modo de exibição.',
            },
            {
              name: 'readOnly',
              type: 'boolean',
              default: 'false',
              description: 'Esconde a escrita (além do que capabilities.write já informa).',
            },
            {
              name: 'rootLabel',
              type: 'string',
              default: "'Arquivos'",
              description: 'Nome da raiz na trilha.',
            },
            {
              name: 'texts',
              type: 'Partial<FilesTexts>',
              description: 'Textos (modelos com {chave}); padrões em pt-BR.',
            },
            {
              name: 'onOpen',
              type: '(entry) => boolean | void',
              description: 'Ao abrir um arquivo; false impede o visualizador.',
            },
            {
              name: 'onChange / onError',
              type: 'função',
              description: 'Depois de cada operação e quando uma falha.',
            },
            {
              name: 'requestInit',
              type: '{ headers, credentials }',
              description: 'Cabeçalhos (CSRF, token) e credenciais do cliente HTTP.',
            },
          ]}
        />
        <p>
          Toasts e o “Desfazer” da exclusão usam o <code>ToastProvider</code> mais próximo. O
          componente depende do <code>@efds-ui/behavior</code> (subentradas <code>/files</code> e{' '}
          <code>/internal</code>).
        </p>
        <CodeBlock code={codigoAdaptador} label="Código TypeScript: adaptador próprio" />
      </Section>

      <Section title="Teclado e acessibilidade">
        <ClassTable
          caption="Atalhos (com o foco na lista, na grade ou na árvore)"
          headers={['Tecla', 'Efeito']}
          rows={[
            { name: 'Enter', effect: 'Abre a pasta ou o arquivo em foco (é um link).' },
            {
              name: 'Setas, Home, End',
              effect:
                'Movem o foco entre os itens da lista ou da grade; na árvore, entre as pastas (→ expande, ← recolhe).',
            },
            { name: 'Espaço', effect: 'Marca o checkbox em foco.' },
            { name: 'Ctrl+A', effect: 'Seleciona todos os itens carregados.' },
            {
              name: 'Ctrl+X, Ctrl+C, Ctrl+V',
              effect: 'Recortar, copiar e colar na pasta aberta (alternativa ao arrastar).',
            },
            { name: 'F2', effect: 'Renomeia o item em foco.' },
            {
              name: 'Delete',
              effect:
                'Exclui a seleção ou o item em foco (com lixeira, vai para ela, com Desfazer por 8 s).',
            },
            { name: 'Backspace, Alt+↑', effect: 'Sobe para a pasta de cima.' },
            {
              name: 'Shift+F10, tecla Menu',
              effect: 'Abre o menu do item (o mesmo do botão “⋯”).',
            },
            { name: 'Esc', effect: 'Fecha o menu ou o diálogo; na lista, limpa a seleção.' },
          ]}
        />
        <ul>
          <li>
            Tudo que o arrasto faz tem alternativa por clique e teclado (WCAG 2.5.7): recortar e
            colar, “Mover para…” e “Copiar para…” com escolha da pasta numa árvore.
          </li>
          <li>
            A lista é uma <code>&lt;table&gt;</code> semântica (sem{' '}
            <code>role=&quot;grid&quot;</code>
            ), a trilha é <code>nav</code> com <code>aria-current</code> e cada operação é anunciada
            numa região <code>role=&quot;status&quot;</code> (“3 itens movidos para Arquivo
            morto.”).
          </li>
          <li>
            Ao navegar, o foco vai para o título da pasta; diálogos devolvem o foco a quem os abriu.
          </li>
          <li>
            Em contêiner estreito (menos de 48rem) a árvore sai da coluna e vira o painel “Pastas”.
          </li>
          <li>
            Conflito de nome (409): “Substituir”, “Manter os dois” ou “Pular”, com “Aplicar a
            todos”. Envios acima do limite ou de tipo não aceito são recusados antes de enviar.
          </li>
          <li>
            Limitação: arrastar pastas do sistema operacional não envia a pasta (só arquivos); o
            arrasto por toque não é suportado pelo navegador, use o menu.
          </li>
        </ul>
      </Section>
    </>
  );
}
