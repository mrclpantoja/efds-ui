import { Alert } from '@efds-ui/react';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

// Contrato HTTP do gerenciador e do visualizador de arquivos. Fonte: docs/architecture/arquivos.md.

const repo = 'https://github.com/mrclpantoja/efds-ui/blob/main';

const rotas = `GET   {api}/capabilities
GET   {api}/list?path=&cursor=&sort=&q=&recursive=
GET   {api}/tree?path=
POST  {api}/folders              { path, name }
POST  {api}/upload?path=&conflict=   multipart (file)
POST  {api}/upload-url           { path, name, size, type }   (opcional, S3 direto)
GET   {api}/download?path=&version=&inline=
PATCH {api}/rename               { path, name, conflict? }
POST  {api}/move | {api}/copy    { paths, target, conflict? }
POST  {api}/delete               { paths, permanent? }
GET   {api}/trash?cursor=
POST  {api}/trash/restore        { ids, conflict? }
POST  {api}/trash/delete | {api}/trash/empty   { ids? }
GET   {api}/versions?path=
POST  {api}/versions/restore     { path, version }`;

const tipos = `interface Entry {
  path: string; // lógico: "/contratos/2026"
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: string; // ISO 8601
  mime?: string;
  thumbnailUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  permissions?: { write?: boolean; delete?: boolean };
}

interface Capabilities {
  write: boolean;
  trash: boolean;
  versions: boolean;
  search: 'none' | 'folder' | 'recursive';
  directUpload: boolean;
  maxUploadBytes?: number;
  accept?: string[];
}

// Erro: status HTTP + corpo
{ "error": { "code": "conflict", "message": "Já existe um arquivo com esse nome.", "path": "/contratos/a.pdf" } }`;

const ligarHtml = `<div class="eds-files" data-eds-files data-eds-files-api="/api/arquivos"
     aria-label="Arquivos do contrato"></div>

<script>
  // Cabeçalhos de cada requisição (ex.: token CSRF do Laravel).
  EDS.configure({
    files: { headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content } },
  });
</script>`;

const ligarReact = `import { FileManager } from '@efds-ui/react';

<FileManager api="/api/arquivos" requestInit={{ credentials: 'same-origin' }} />`;

export default function ServidorArquivosPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        O <a href={toHref('/componentes/files')}>gerenciador</a> e o{' '}
        <a href={toHref('/componentes/file-viewer')}>visualizador</a> de arquivos não falam com o S3
        nem com o disco: falam com uma API HTTP do seu sistema. Esta página resume o contrato dessa
        API e aponta as implementações de referência em Laravel e Node, para S3 e disco local.
      </p>

      <Alert tone="warning" title="Arquivo é dado pessoal até prova em contrário">
        Autorize cada chamada no servidor, por pasta e por operação. Credenciais, bucket e caminhos
        reais ficam só no servidor; o navegador recebe URLs do próprio sistema ou assinadas e de
        curta duração. Nada é enviado a terceiros.
      </Alert>

      <Section title="Rotas">
        <p>
          JSON em UTF-8. Caminhos são lógicos, começam com <code>/</code> e o servidor os normaliza,
          recusando <code>..</code>, barra invertida, caracteres de controle e nomes que começam com
          ponto. <code>conflict</code> é <code>fail</code> (padrão, responde 409),{' '}
          <code>replace</code> ou <code>rename</code>; mover e copiar em lote com <code>fail</code>{' '}
          recusam o lote inteiro.
        </p>
        <CodeBlock code={rotas} label="Rotas da API de arquivos" />
      </Section>

      <Section title="Tipos e erros">
        <p>
          Os códigos de erro são <code>not_found</code>, <code>forbidden</code> (também no 401),{' '}
          <code>conflict</code>, <code>invalid_name</code>, <code>too_large</code>,{' '}
          <code>type_not_allowed</code>, <code>quota_exceeded</code>, <code>unsupported</code> (501)
          e <code>internal</code>. O componente mostra a <code>message</code> do servidor quando ela
          vem. <code>nextCursor</code> e <code>version</code> são opacos.
        </p>
        <CodeBlock code={tipos} label="Código TypeScript: tipos do contrato" />
      </Section>

      <Section title="Segurança exigida do servidor">
        <ul>
          <li>Autorização por pasta e por operação a cada chamada.</li>
          <li>Tipo e tamanho conferidos no servidor, pelo conteúdo e não só pela extensão.</li>
          <li>Nome gravado gerado ou saneado no servidor.</li>
          <li>
            Download com <code>Content-Disposition</code> saneado,{' '}
            <code>X-Content-Type-Options: nosniff</code> e{' '}
            <code>Cache-Control: no-store, private</code>.
          </li>
          <li>
            <code>inline</code> só para PDF, imagem (sem SVG), vídeo, áudio e texto (como{' '}
            <code>text/plain</code>), com{' '}
            <code>
              Content-Security-Policy: default-src &apos;none&apos;; frame-ancestors
              &apos;self&apos;
            </code>
            ; o resto sempre como anexo.
          </li>
          <li>
            URLs assinadas do S3 curtas (até 5 minutos), geradas só depois da autorização, e só para
            anexo: <code>inline</code> passa pelo servidor.
          </li>
          <li>
            Trilha de auditoria (quem, o quê, quando) sem gravar conteúdo; nenhum bucket público.
          </li>
          <li>
            Lixeira com prazo de retenção; sem lixeira, exclusão só com confirmação explícita.
          </li>
        </ul>
      </Section>

      <Section title="Ligar o componente">
        <CodeBlock code={ligarHtml} label="Código HTML: gerenciador ligado à API" />
        <CodeBlock code={ligarReact} label="Código TSX: gerenciador ligado à API" />
        <p>
          Para outra forma de acesso (GraphQL, tRPC, testes), passe um <code>adapter</code> que
          implemente <code>FilesAdapter</code>; <code>createMemoryAdapter</code>, de{' '}
          <code>@efds-ui/behavior/files</code>, guarda tudo em memória com dados fictícios.
        </p>
      </Section>

      <Section title="Implementações de referência">
        <ul>
          <li>
            <a href={`${repo}/examples/servidor-arquivos/laravel/README.md`}>Laravel</a>: pacote com
            service provider sobre o Flysystem (disco local ou S3 por configuração), policies,
            lixeira, versões e auditoria.
          </li>
          <li>
            <a href={`${repo}/examples/servidor-arquivos/node/README.md`}>Node</a>: servidor HTTP
            mínimo com drivers de disco e S3 atrás da mesma interface, com testes do contrato.
          </li>
          <li>
            <a href={`${repo}/docs/architecture/arquivos.md`}>Contrato completo</a>, com as decisões
            de cada rota.
          </li>
        </ul>
        <p>
          São exemplos para adaptar, sob a licença MIT: revise a autorização e as variáveis de
          ambiente antes de usar em produção.
        </p>
      </Section>
    </>
  );
}
