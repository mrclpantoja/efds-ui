import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { CodeBlock } from '../../components/CodeBlock';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Compacto from '../../examples/file-upload/compacto';
import compactoHtml from '../../examples/file-upload/compacto.html?raw';
import compactoSource from '../../examples/file-upload/compacto.tsx?raw';
import Estados from '../../examples/file-upload/estados';
import estadosHtml from '../../examples/file-upload/estados.html?raw';
import estadosSource from '../../examples/file-upload/estados.tsx?raw';
import Formulario from '../../examples/file-upload/formulario';
import formularioHtml from '../../examples/file-upload/formulario.html?raw';
import formularioSource from '../../examples/file-upload/formulario.tsx?raw';
import Imediato from '../../examples/file-upload/imediato';
import imediatoHtml from '../../examples/file-upload/imediato.html?raw';
import imediatoSource from '../../examples/file-upload/imediato.tsx?raw';
import Validacao from '../../examples/file-upload/validacao';
import validacaoHtml from '../../examples/file-upload/validacao.html?raw';
import validacaoSource from '../../examples/file-upload/validacao.tsx?raw';
import { toHref } from '../../router';

const formHtml = `<form method="post" action="/contratos/anexar" enctype="multipart/form-data">
  <!-- o .eds-upload do exemplo acima, com name="documentos[]" no input -->
  <button type="submit" class="eds-button eds-button-primary">Enviar</button>
</form>`;

const phpCode = `<?php
// PHP: name="documentos[]" chega em $_FILES['documentos'] com as listas name, tmp_name, error...
foreach ($_FILES['documentos']['tmp_name'] as $i => $tmp) {
    if ($_FILES['documentos']['error'][$i] !== UPLOAD_ERR_OK) continue;
    $nome = basename($_FILES['documentos']['name'][$i]);
    move_uploaded_file($tmp, __DIR__ . '/anexos/' . uniqid() . '-' . $nome);
}`;

const javaCode = `// Java (Spring Boot): o mesmo campo vira uma lista de MultipartFile.
@PostMapping(value = "/contratos/anexar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public String anexar(@RequestParam("documentos[]") List<MultipartFile> documentos) {
    for (MultipartFile arquivo : documentos) {
        if (arquivo.isEmpty()) continue;
        armazenamento.salvar(arquivo);
    }
    return "redirect:/contratos";
}`;

const respostaJson = `// POST /arquivos  (multipart, campo "arquivo")  ->  200
{ "id": "a1b2c3" }`;

const hiddenHtml = `<!-- Depois do envio, dentro do .eds-upload: -->
<input type="hidden" name="anexos[]" value="a1b2c3" />
<!-- O input file perde o name: os binários não vão de novo no submit do formulário. -->`;

const eventos = `const upload = document.querySelector('#anexos').closest('.eds-upload');

upload.addEventListener('eds:upload-change', (event) => {
  // Arquivos válidos agora na lista (File[])
  console.log(event.detail.length);
});
upload.addEventListener('eds:upload-progress', (event) => {
  const { file, percent } = event.detail;
});
upload.addEventListener('eds:upload-complete', (event) => {
  const { file, response } = event.detail; // response = { id: '...' }
});
upload.addEventListener('eds:upload-error', (event) => {
  const { file, message } = event.detail;
});`;

const reactImediato = `<FileUpload
  name="anexos[]"
  upload={async (file, { onProgress, signal }) => {
    const resposta = await enviarComProgresso('/arquivos', file, { onProgress, signal });
    return { id: resposta.id }; // vira <input type="hidden" name="anexos[]" value="id">
  }}
  onUploadError={(file, erro) => registrar(file.name, erro)}
/>`;

const consoleTeste = `// Console do navegador: escolhe arquivos fictícios no input do exemplo, sem abrir o seletor.
const input = document.querySelector('.docs-preview .eds-upload-input');
const dt = new DataTransfer();
dt.items.add(new File(['x'.repeat(3 * 1024 * 1024)], 'foto-a.png', { type: 'image/png' }));
dt.items.add(new File(['x'], 'planilha.xlsx'));
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));`;

export default function FileUploadPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Envio de arquivos com área de arrastar e soltar, lista com tamanho e estado de cada arquivo,
        validação de tipo, tamanho e quantidade, e remoção. Funciona em dois modos: no{' '}
        <strong>formulário</strong> (padrão), os arquivos vão no envio normal do form; no{' '}
        <strong>imediato</strong>, cada arquivo é enviado assim que escolhido.
      </p>

      <UseCases
        use={[
          'Para vários anexos, com lista, validação visível e a opção de remover antes de enviar.',
          'Para arquivos grandes, em que o usuário precisa ver o progresso (modo imediato).',
        ]}
        avoid={[
          <>
            Para um arquivo só, em um formulário simples: use{' '}
            <a href={toHref('/componentes/file-input')}>FileInput</a>.
          </>,
          'Para conteúdo que precisa de edição ou recorte (imagem de perfil): o componente só envia o arquivo como está.',
          'Como única validação: confira tipo e tamanho também no servidor; o navegador não é confiável.',
        ]}
      />

      <Section title="Modo formulário">
        <Alert tone="info" title="HTML: precisa do @efds-ui/behavior">
          <p>
            Sem JavaScript o componente continua funcionando: o <code>label</code> abre o seletor
            nativo e o formulário envia o input. A lista, a validação visível, o acúmulo entre
            seleções e o arrastar e soltar vêm do{' '}
            <a href={toHref('/comecar/comportamento')}>@efds-ui/behavior</a>, que detecta o{' '}
            <code>[data-eds-upload]</code>. Os previews HTML abaixo estão ligados a ele; no React, o{' '}
            <code>FileUpload</code> faz tudo sozinho.
          </p>
        </Alert>
        <p>
          É o padrão. Os arquivos válidos ficam <strong>no próprio input</strong>, então o envio
          normal do formulário leva todos, e <code>required</code> funciona sem código. O servidor
          recebe o mesmo que receberia de um{' '}
          <code>&lt;input type=&quot;file&quot; multiple&gt;</code>: use{' '}
          <code>name=&quot;documentos[]&quot;</code> e{' '}
          <code>enctype=&quot;multipart/form-data&quot;</code> no form.
        </p>
        <Example
          title="Formulário"
          description="Escolha arquivos pelo botão (ou arraste do computador). Escolhas seguintes acumulam em vez de substituir, e um arquivo repetido (mesmo nome, tamanho e data) é ignorado. Nada é enviado neste site: não há servidor."
          html={formularioHtml}
          react={{ Component: Formulario, source: formularioSource }}
        />
        <CodeBlock code={formHtml} label="Código HTML: o formulário que envia" />
        <CodeBlock code={phpCode} label="Código PHP: receber documentos[]" />
        <CodeBlock code={javaCode} label="Código Java: receber documentos[]" />
      </Section>

      <Section title="Modo imediato">
        <p>
          Com <code>data-eds-upload-url</code> no <code>.eds-upload</code> (HTML) ou a prop{' '}
          <code>upload</code> (React), cada arquivo válido é enviado na hora, com barra de
          progresso. Remover durante o envio cancela a requisição; falha mostra &quot;Tentar de
          novo&quot;. É o que se usa para arquivos grandes ou quando o servidor já guarda o arquivo
          antes de o formulário ser salvo.
        </p>
        <ul className="docs-list">
          <li>
            O <code>@efds-ui/behavior</code> faz um <code>POST</code> multipart por arquivo, no
            campo de <code>data-eds-upload-field</code> (padrão <code>file</code>), com{' '}
            <code>Accept: application/json</code>. O envio <strong>não aciona o PageLoader</strong>{' '}
            (cabeçalho <code>X-EDS-Loader: off</code>): a lista já mostra o progresso.
          </li>
          <li>
            A resposta é JSON com o <code>id</code> do arquivo guardado:
          </li>
        </ul>
        <CodeBlock code={respostaJson} label="Código JSON: resposta do envio" />
        <ul className="docs-list">
          <li>
            O <code>id</code> vira um <code>input[type=hidden]</code> com o <code>name</code> do
            input, dentro do <code>.eds-upload</code>. O input de arquivo <strong>perde o </strong>
            <code>name</code>: o formulário leva só os ids, não os binários de novo.
          </li>
          <li>
            Enquanto houver envio em andamento, o submit do formulário é bloqueado (&quot;Aguarde o
            envio dos arquivos.&quot;). Com <code>required</code>, é preciso ter ao menos um arquivo
            enviado.
          </li>
          <li>
            Remover um arquivo já enviado remove o hidden; a exclusão no servidor é com você
            (limpeza dos ids que não chegaram a um formulário salvo).
          </li>
        </ul>
        <CodeBlock code={imediatoHtml} label="Código HTML: modo imediato" />
        <CodeBlock code={hiddenHtml} label="Código HTML: o que o JS acrescenta" />
        <Example
          title="Envio imediato (React)"
          description="O envio é simulado, sem servidor, com progresso em 10% a cada 250 ms. Dê a um arquivo um nome com “erro” (ex.: erro.pdf) para ver a falha e o “Tentar de novo”; remova um arquivo no meio do envio para cancelá-lo. No React, upload recebe o arquivo e devolve a promessa do id; onProgress e signal (AbortSignal) ficam por sua conta."
          react={{ Component: Imediato, source: imediatoSource }}
        />
        <CodeBlock code={reactImediato} label="Código React: upload em produção" />
      </Section>

      <Section title="Validação">
        <p>
          Três regras, todas opcionais, aplicadas ao escolher ou soltar. Arquivos que violam tipo ou
          tamanho <strong>aparecem na lista com o motivo</strong> (&quot;Arquivo maior que 2
          MB&quot;, &quot;Tipo não permitido&quot;), não entram no envio e não ocupam vaga. Passou
          do máximo de arquivos: os excedentes nem entram na lista, e o status avisa (&quot;Limite
          de 3 arquivos atingido.&quot;).
        </p>
        <ul className="docs-list">
          <li>
            <code>accept</code> no input: extensões (<code>.pdf</code>), <code>tipo/*</code> ou MIME
            exato, como no atributo nativo.
          </li>
          <li>
            <code>data-eds-max-size</code> (HTML, em bytes) ou <code>maxSize</code> (React).
          </li>
          <li>
            <code>data-eds-max-files</code> ou <code>maxFiles</code>.
          </li>
        </ul>
        <Example
          title="Tipo, tamanho e quantidade"
          description="Tente escolher um PDF (tipo não permitido), mais de três fotos ou uma imagem acima de 2 MB. Para testar sem arquivo real, use o console, como no roteiro abaixo."
          html={validacaoHtml}
          react={{ Component: Validacao, source: validacaoSource }}
        />
        <CodeBlock code={consoleTeste} label="Código JavaScript: simular a escolha de arquivos" />
      </Section>

      <Section title="Compacto, erro e desabilitado">
        <Example
          title="Compacto"
          description="Uma linha só (ícone e texto à esquerda), para formulários densos. Sem multiple, uma nova escolha substitui a anterior."
          html={compactoHtml}
          react={{ Component: Compacto, source: compactoSource }}
        />
        <Example
          title="Erro e desabilitado"
          description="Erro: aria-invalid no input e a mensagem em aria-describedby. Desabilitado: o input disabled também ignora o arrastar e soltar."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>FileUpload</code> aceita os atributos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code>, <code>value</code> e <code>size</code>), repassa <code>ref</code> (para
          o input) e mescla <code>className</code> (na <code>.eds-upload</code>). Dentro de um{' '}
          <code>Field</code>, o rótulo nomeia o input por <code>aria-labelledby</code>.
        </p>
        <PropsTable
          caption="Props de FileUpload"
          rows={[
            {
              name: 'name',
              type: 'string',
              description: (
                <>
                  Modo formulário: <code>name</code> do input (use <code>documentos[]</code> se o
                  servidor espera lista). Modo imediato: <code>name</code> dos campos hidden com os
                  ids.
                </>
              ),
            },
            {
              name: 'accept',
              type: 'string',
              description: 'Tipos aceitos, como no atributo nativo.',
            },
            {
              name: 'multiple',
              type: 'boolean',
              default: 'true',
              description: 'Sem ele, uma nova escolha substitui a anterior.',
            },
            {
              name: 'maxSize',
              type: 'number',
              description: 'Tamanho máximo por arquivo, em bytes.',
            },
            { name: 'maxFiles', type: 'number', description: 'Máximo de arquivos válidos.' },
            {
              name: 'hint',
              type: 'string',
              description:
                'Texto de apoio na área (formatos e limites). Ligado por aria-describedby.',
            },
            {
              name: 'compact',
              type: 'boolean',
              default: 'false',
              description: 'Versão de uma linha.',
            },
            {
              name: 'invalid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code>. Dentro de um Field com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
            { name: 'disabled', type: 'boolean', description: 'Desabilita o input e o arrastar.' },
            {
              name: 'onValueChange',
              type: '(files: File[]) => void',
              description: 'Os arquivos válidos mudaram (adição ou remoção).',
            },
            {
              name: 'upload',
              type: '(file, { onProgress, signal }) => Promise<{ id: string }>',
              description: (
                <>
                  Liga o modo imediato. <code>onProgress(0–100)</code> atualiza a barra;{' '}
                  <code>signal</code> é abortado quando o usuário remove o arquivo.
                </>
              ),
            },
            {
              name: 'onUploadError',
              type: '(file: File, error: unknown) => void',
              description: 'O upload falhou (não é chamado ao cancelar).',
            },
            {
              name: 'texts',
              type: 'Partial<FileUploadTexts>',
              description: (
                <>
                  Todos os textos internos (área, link, remover, tentar de novo, erros e mensagens
                  de status), para outro idioma. Os que levam o nome do arquivo ou um número são
                  funções, por exemplo <code>remove: (nome) =&gt; …</code>.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Atributos e eventos (HTML)">
        <ClassTable
          caption="Atributos data-eds-* do FileUpload"
          headers={['Atributo', 'Efeito']}
          rows={[
            {
              name: 'data-eds-upload',
              effect: (
                <>
                  No <code>.eds-upload</code>: liga o comportamento.
                </>
              ),
            },
            { name: 'data-eds-max-size', effect: 'Tamanho máximo por arquivo, em bytes.' },
            { name: 'data-eds-max-files', effect: 'Máximo de arquivos válidos.' },
            {
              name: 'data-eds-upload-url',
              effect: 'Liga o modo imediato: endereço do POST de cada arquivo.',
            },
            {
              name: 'data-eds-upload-field',
              effect: 'Modo imediato: nome do campo multipart do arquivo (padrão file).',
            },
          ]}
        />
        <p>
          O <code>.eds-upload</code> dispara quatro eventos (todos fazem bubble):
        </p>
        <ClassTable
          caption="Eventos do FileUpload"
          headers={['Evento', 'detail']}
          rows={[
            { name: 'eds:upload-change', effect: 'File[] com os arquivos válidos.' },
            { name: 'eds:upload-progress', effect: '{ file, percent }' },
            { name: 'eds:upload-complete', effect: '{ file, response }' },
            { name: 'eds:upload-error', effect: '{ file, message }' },
          ]}
        />
        <CodeBlock code={eventos} label="Código JavaScript: eventos do FileUpload" />
        <p>
          Os textos (&quot;adicionado&quot;, &quot;Tentar de novo&quot;, os erros) são os de{' '}
          <code>configure(messages)</code>, com as chaves <code>upload*</code>; veja{' '}
          <a href={toHref('/comecar/comportamento')}>Comportamento</a>.
        </p>
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de FileUpload"
          rows={[
            { name: '.eds-upload', effect: 'Envolve o input, a área, a lista e o status.' },
            {
              name: '.eds-upload-input',
              effect:
                'O input de arquivo: oculto visualmente, mas focável. O foco aparece na área (:has(:focus-visible)).',
            },
            {
              name: '.eds-upload-dropzone',
              effect: 'O label da área: borda tracejada, ícone, título e texto de apoio.',
            },
            {
              name: '.eds-upload-title / .eds-upload-link / .eds-upload-hint',
              effect: 'Título, trecho em destaque (link visual) e texto de apoio.',
            },
            { name: '.eds-upload-compact', effect: 'No .eds-upload: versão de uma linha.' },
            { name: '[data-dragover]', effect: 'No .eds-upload: um arquivo está sobre a área.' },
            {
              name: '[aria-invalid="true"] / :disabled',
              effect: 'No input: borda de erro / área desabilitada.',
            },
            { name: '.eds-upload-list', effect: 'A lista de arquivos (some quando vazia).' },
            {
              name: '.eds-upload-item[data-state]',
              effect: 'Um arquivo: ready, uploading, done ou error.',
            },
            {
              name: '.eds-upload-item-icon / -body / -name / -meta',
              effect:
                'Ícone, bloco de texto, nome (quebra em até 2 linhas, com reticências; não usa title, o nome completo está no aria-label do botão Remover) e tamanho com o estado. Em done e error o meta leva um ícone: a cor nunca é o único sinal.',
            },
            { name: '.eds-upload-progress', effect: 'O progress do envio (só em uploading).' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Teclado:</strong> o foco fica no <code>input[type=file]</code> oculto, e o foco
            visível aparece na área toda. Enter e Espaço abrem o seletor (nativo); depois, Tab
            percorre os botões &quot;Remover&quot; e &quot;Tentar de novo&quot;. Arrastar e soltar é
            só um atalho: tudo o que ele faz tem o equivalente por teclado (WCAG 2.5.7).
          </li>
          <li>
            <strong>Nome:</strong> o input é nomeado pelo rótulo do campo e descrito pelo texto de
            apoio; a lista tem <code>aria-label</code> e cada botão nomeia o arquivo (
            <code>Remover contrato.pdf</code>).
          </li>
          <li>
            <strong>Anúncios:</strong> uma região <code>role=&quot;status&quot;</code> diz
            &quot;contrato.pdf adicionado.&quot;, &quot;3 arquivos adicionados.&quot;,
            &quot;contrato.pdf removido.&quot;, &quot;contrato.pdf enviado.&quot;, o motivo de cada
            recusa e o limite de arquivos. O <strong>progresso contínuo não é anunciado</strong>:
            cada barra é um <code>progress</code> com nome, que o leitor consulta quando quiser.
          </li>
          <li>
            <strong>Foco ao remover:</strong> vai ao botão Remover do próximo arquivo, senão do
            anterior, senão ao input. Nunca se perde na página.
          </li>
          <li>
            <strong>Erro:</strong> por arquivo, com ícone e texto (cor nunca sozinha); do campo, com{' '}
            <code>aria-invalid</code> e a mensagem em <code>aria-describedby</code>.
          </li>
          <li>
            <strong>Arrastar:</strong> só reage a arquivos (texto arrastado passa) e só dentro da
            área; o resto da página nunca é interceptado.
          </li>
          <li>
            <strong>Alto contraste:</strong> borda, foco e barra de progresso têm tratamento em{' '}
            <code>forced-colors</code>.
          </li>
        </ul>
      </Section>
    </>
  );
}
