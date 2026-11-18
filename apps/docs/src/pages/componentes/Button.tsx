/*
 * Página-modelo de componente. Ordem fixa: descrição + quando usar, exemplos, API React,
 * classes CSS, acessibilidade. Para uma página nova, copie este arquivo, troque o conteúdo e
 * registre-a em `src/routes.tsx`. O h1 e o título da aba vêm do registro, não daqui.
 */
import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Estados from '../../examples/button/estados';
import estadosHtml from '../../examples/button/estados.html?raw';
import estadosSource from '../../examples/button/estados.tsx?raw';
import Icones from '../../examples/button/icones';
import iconesHtml from '../../examples/button/icones.html?raw';
import iconesSource from '../../examples/button/icones.tsx?raw';
import Link from '../../examples/button/link';
import linkHtml from '../../examples/button/link.html?raw';
import linkSource from '../../examples/button/link.tsx?raw';
import Tamanhos from '../../examples/button/tamanhos';
import tamanhosHtml from '../../examples/button/tamanhos.html?raw';
import tamanhosSource from '../../examples/button/tamanhos.tsx?raw';
import Variantes from '../../examples/button/variantes';
import variantesHtml from '../../examples/button/variantes.html?raw';
import variantesSource from '../../examples/button/variantes.tsx?raw';

export default function ButtonPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Dispara uma ação: salvar, confirmar, abrir um menu. Cinco variantes expressam a hierarquia
        da ação na tela; três tamanhos acompanham a densidade.
      </p>

      <UseCases
        use={[
          'Para uma ação que acontece na própria página: enviar um formulário, abrir um modal, excluir um registro.',
          'Uma ação principal (primary) por região da tela; as demais em secondary, tertiary ou ghost.',
          'Ação destrutiva e irreversível: variante danger, com confirmação.',
        ]}
        avoid={[
          <>
            Para navegar para outra página: use um link (<code>&lt;a&gt;</code>). Com{' '}
            <code>href</code>, o Button já renderiza um link com a aparência de botão.
          </>,
          'Para alternar uma opção ligada/desligada: use Switch ou Checkbox.',
          'Para escolher uma entre várias visões do mesmo conteúdo: use Tabs.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Variantes"
          description="Da ação principal à discreta: primary, secondary (padrão), tertiary, ghost e danger."
          html={variantesHtml}
          react={{ Component: Variantes, source: variantesSource }}
        />
        <Example
          title="Tamanhos"
          description="sm, md (padrão, sem classe) e lg. A altura vem dos tokens de controle."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Com ícone e só ícone"
          description="O ícone fica antes ou depois do texto. Botão só de ícone precisa de nome acessível."
          html={iconesHtml}
          react={{ Component: Icones, source: iconesSource }}
        />
        <Example
          title="Carregando e desabilitado"
          description="Em carregamento o botão mantém o foco e a largura, e ignora o acionamento."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
        <Example
          title="Como link"
          description="Para navegar com a aparência de botão."
          html={linkHtml}
          react={{ Component: Link, source: linkSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Button</code> aceita todos os atributos nativos de <code>&lt;button&gt;</code> (ou
          de <code>&lt;a&gt;</code>, quando recebe <code>href</code>), repassa <code>ref</code> e
          mescla <code>className</code> depois das classes do core.
        </p>
        <PropsTable
          caption="Props de Button"
          rows={[
            {
              name: 'variant',
              type: "'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'",
              default: "'secondary'",
              description: 'Hierarquia da ação.',
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho. O padrão não emite classe.',
            },
            {
              name: 'loading',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Operação em andamento: <code>aria-busy</code>, spinner do core e clique, Enter e
                  Espaço ignorados. O botão continua focável (não recebe <code>disabled</code>).
                </>
              ),
            },
            {
              name: 'iconOnly',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Botão quadrado só de ícone. Com <code>iconOnly</code>, o tipo exige{' '}
                  <code>aria-label: string</code>.
                </>
              ),
            },
            {
              name: 'href',
              type: 'string',
              description: (
                <>
                  Renderiza <code>&lt;a&gt;</code> em vez de <code>&lt;button&gt;</code>.
                </>
              ),
            },
            {
              name: 'disabled',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Em botão, o atributo nativo. Em link (<code>href</code>):{' '}
                  <code>aria-disabled</code>, <code>tabIndex=-1</code> e navegação cancelada.
                </>
              ),
            },
            {
              name: 'type',
              type: "'button' | 'submit' | 'reset'",
              default: "'button'",
              description: 'Só em botão. O padrão evita o envio acidental de formulários.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <p>
          Quem usa só HTML aplica as classes diretamente; o React emite exatamente estas. O estado
          vem de atributos, nunca de classes.
        </p>
        <ClassTable
          caption="Classes e atributos de Button"
          rows={[
            {
              name: '.eds-button',
              effect: 'Base: altura, padding, tipografia, foco e transições.',
            },
            {
              name: '.eds-button-primary',
              effect: 'Fundo na cor de ação; texto sobre ação.',
            },
            {
              name: '.eds-button-secondary',
              effect: 'Fundo de superfície com borda forte (o padrão do React).',
            },
            { name: '.eds-button-tertiary', effect: 'Fundo sutil, sem borda.' },
            { name: '.eds-button-ghost', effect: 'Transparente, texto na cor de ação.' },
            { name: '.eds-button-danger', effect: 'Fundo de perigo, para ações destrutivas.' },
            {
              name: '.eds-button-sm / .eds-button-lg',
              effect: 'Menor ou maior que o padrão (md não tem classe).',
            },
            {
              name: '.eds-button-icon',
              effect: 'Quadrado, só ícone. Exige aria-label no HTML.',
            },
            {
              name: '[aria-busy="true"]',
              effect:
                'Carregando: texto some (largura preservada), spinner no centro, sem cursor de clique.',
            },
            {
              name: ':disabled, [aria-disabled="true"]',
              effect: 'Aparência desabilitada, sem hover. Em link, também sem eventos de ponteiro.',
            },
            {
              name: '.eds-button > svg',
              effect: 'Ícone de 1rem (1,25rem no lg), alinhado com o texto.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Teclado:</strong> Tab alcança o botão; Enter e Espaço acionam (nativo). Em{' '}
              <code>loading</code>, Enter e Espaço são ignorados, mas o foco permanece, para não
              perder o contexto de quem usa leitor de tela.
            </li>
            <li>
              <strong>Estado:</strong> <code>loading</code> expõe <code>aria-busy="true"</code>.
              Desabilitado usa <code>disabled</code> (botão) ou <code>aria-disabled</code> (link).
            </li>
            <li>
              <strong>Forçado pelo tipo:</strong> <code>iconOnly</code> exige{' '}
              <code>aria-label</code>. O ícone interno é decorativo (<code>aria-hidden</code>).
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> um texto de ação claro (&quot;Salvar
              cliente&quot;, não &quot;OK&quot;); anunciar o resultado de uma ação assíncrona (por
              exemplo, com um Toast); e não usar a cor da variante como única pista de significado.
            </li>
            <li>
              <strong>Foco e contraste:</strong> o anel de foco vem do core e é sempre visível; os
              textos de cada variante passam 4,5:1 em todos os temas e modos.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
