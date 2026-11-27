import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/file-input/estados';
import estadosHtml from '../../examples/file-input/estados.html?raw';
import estadosSource from '../../examples/file-input/estados.tsx?raw';
import Simples from '../../examples/file-input/simples';
import simplesHtml from '../../examples/file-input/simples.html?raw';
import simplesSource from '../../examples/file-input/simples.tsx?raw';
import Tamanhos from '../../examples/file-input/tamanhos';
import tamanhosHtml from '../../examples/file-input/tamanhos.html?raw';
import tamanhosSource from '../../examples/file-input/tamanhos.tsx?raw';
import { toHref } from '../../router';

export default function FileInputPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Escolha de arquivo simples: o <code>&lt;input type=&quot;file&quot;&gt;</code> do navegador
        com a aparência do sistema. <strong>Não usa JavaScript</strong>: o envio é o do formulário,
        com <code>enctype=&quot;multipart/form-data&quot;</code>.
      </p>

      <UseCases
        use={[
          'Para anexar um ou poucos arquivos em um formulário comum (comprovante, foto, currículo).',
          'Quando não há lista de arquivos, progresso nem arrastar e soltar a mostrar.',
        ]}
        avoid={[
          <>
            Para vários arquivos com lista, validação visível e arrastar e soltar: use{' '}
            <a href={toHref('/componentes/file-upload')}>FileUpload</a>.
          </>,
          'Sem rótulo: o texto do botão nativo não nomeia o campo.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Simples"
          description={
            <>
              Dentro de um Field, com o texto de apoio ligado por <code>aria-describedby</code>. O{' '}
              <code>accept</code> filtra o seletor do sistema, mas não impede o envio de outro tipo:
              valide também no servidor.
            </>
          }
          html={simplesHtml}
          react={{ Component: Simples, source: simplesSource }}
        />
        <Example
          title="Tamanhos"
          description="sm, md (padrão, sem classe) e lg: a altura é a do Input."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Erro e desabilitado"
          description="Estados por atributo: aria-invalid e disabled. O Field liga a mensagem de erro."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>FileInput</code> aceita os atributos nativos de <code>&lt;input&gt;</code> (menos{' '}
          <code>type</code>, <code>value</code> e <code>defaultValue</code>: o navegador não permite
          definir o arquivo por valor), repassa <code>ref</code> e mescla <code>className</code>.
          Dentro de um <code>Field</code>, <code>id</code>, rótulo, erro e <code>required</code> vêm
          dele.
        </p>
        <PropsTable
          caption="Props de FileInput"
          rows={[
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho, igual ao do Input. O padrão não emite classe.',
            },
            {
              name: 'invalid / valid',
              type: 'boolean',
              description: (
                <>
                  <code>aria-invalid=&quot;true&quot;</code> /{' '}
                  <code>data-valid=&quot;true&quot;</code>. Dentro de um Field com{' '}
                  <code>error</code> já é automático.
                </>
              ),
            },
            {
              name: 'accept, multiple, name, capture…',
              type: 'atributos de <input>',
              description: 'Repassados ao elemento.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de FileInput"
          rows={[
            {
              name: '.eds-file',
              effect:
                'O input de arquivo: o botão nativo (::file-selector-button) tem a aparência do Button secundário; o nome do arquivo fica em texto secundário.',
            },
            { name: '.eds-file-sm / .eds-file-lg', effect: 'Tamanhos (altura do Input).' },
            { name: '[aria-invalid="true"]', effect: 'Erro: borda de perigo.' },
            { name: '[data-valid]', effect: 'Sucesso: borda de sucesso.' },
            {
              name: ':disabled',
              effect: 'Desabilitado: fundo sutil e texto atenuado, sem opacity.',
            },
            { name: ':focus-visible', effect: 'Anel de foco no controle inteiro.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Nativo:</strong> o controle é o do navegador; Enter e Espaço abrem o seletor, e
            o leitor de tela anuncia o nome do arquivo escolhido.
          </li>
          <li>
            <strong>Rótulo:</strong> sempre com <code>label</code> associado; o texto &quot;Escolher
            arquivo&quot; do botão não nomeia o campo. Formatos e tamanho aceitos entram no texto de
            apoio (<code>aria-describedby</code>).
          </li>
          <li>
            <strong>Erro:</strong> <code>aria-invalid</code> com a mensagem em{' '}
            <code>aria-describedby</code>; a cor nunca é o único sinal.
          </li>
          <li>
            <strong>Idioma:</strong> o texto do controle nativo (&quot;Escolher arquivo&quot;,
            &quot;Nenhum arquivo escolhido&quot;) segue o idioma do navegador, não o{' '}
            <code>lang</code> da página: é limitação do controle nativo e não é configurável. Quem
            precisa desse texto controlado usa o{' '}
            <a href={toHref('/componentes/file-upload')}>FileUpload</a>.
          </li>
        </ul>
      </Section>
    </>
  );
}
