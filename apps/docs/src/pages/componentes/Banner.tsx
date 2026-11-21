import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/banner/basico';
import basicoHtml from '../../examples/banner/basico.html?raw';
import basicoSource from '../../examples/banner/basico.tsx?raw';
import Dinamico from '../../examples/banner/dinamico';
import dinamicoHtml from '../../examples/banner/dinamico.html?raw';
import dinamicoSource from '../../examples/banner/dinamico.tsx?raw';
import Dispensavel from '../../examples/banner/dispensavel';
import dispensavelHtml from '../../examples/banner/dispensavel.html?raw';
import dispensavelSource from '../../examples/banner/dispensavel.tsx?raw';

export default function BannerPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Faixa de largura total no topo da aplicação, para avisos do sistema: manutenção, ambiente de
        homologação, aviso legal. Diferente do Alert, que vive dentro do conteúdo, e do Toast, que
        some sozinho.
      </p>

      <UseCases
        use={[
          'Para um aviso que vale para a aplicação toda e que o usuário precisa ver antes de trabalhar.',
          'No topo do app shell: ocupa uma linha acima da sidebar e do cabeçalho.',
        ]}
        avoid={[
          'Para uma mensagem sobre uma parte da tela: use Alert.',
          'Para confirmar uma ação que acabou de acontecer: use Toast.',
          'Vários ao mesmo tempo: o conteúdo é empurrado e o aviso perde força.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Tons"
          description="info (padrão), success, warning, danger e neutral. O ícone é decorativo; o texto diz a natureza do aviso."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Dispensável"
          description="O botão de fechar esconde o aviso. Em produção, o id fica no localStorage e o aviso não volta (data-eds-banner-remember=off no HTML, ou sem rememberId no React, desliga isso). Aqui a lembrança está desligada: recarregue para ver o aviso de novo."
          html={dispensavelHtml}
          react={{ Component: Dispensavel, source: dispensavelSource }}
        />
        <Example
          title="Dinâmico"
          description="Aparece depois do carregamento ou muda de texto: role=status, para o leitor de tela anunciar."
          html={dinamicoHtml}
          react={{ Component: Dinamico, source: dinamicoSource }}
        />
      </Section>

      <Section title="No app shell">
        <Alert variant="info" title="Empurra, não cobre">
          <p>
            O banner não é fixo: ocupa o seu lugar no fluxo (WCAG 2.4.11). Como primeiro filho de{' '}
            <code>.eds-app</code> ele ganha uma linha acima da sidebar e do cabeçalho; fechado (
            <code>hidden</code>) devolve o espaço. No React use a prop <code>banner</code> do{' '}
            <code>AppShell</code>.
          </p>
        </Alert>
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Fechar e lembrar">
          <p>
            O aviso fixo não precisa de JS. Com <code>data-eds-banner=&quot;id&quot;</code> e um
            botão <code>[data-eds-banner-close]</code> (ou <code>data-eds-dismissible</code>, que o
            cria), o <a href="#/comecar/comportamento">@efds-ui/behavior</a> esconde o banner, move
            o foco ao próximo elemento focável e lembra o id em <code>localStorage</code> (só o
            valor <code>1</code>, na chave <code>eds:banner:id</code>). Evento:{' '}
            <code>eds:banner-close</code>.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Banner"
          rows={[
            {
              name: 'tone',
              type: "'info' | 'success' | 'warning' | 'danger' | 'neutral'",
              default: "'info'",
              description: 'Tom.',
            },
            {
              name: 'aria-label',
              type: 'string',
              required: true,
              description: 'Nome da região (obrigatório, a menos que live).',
            },
            {
              name: 'live',
              type: 'boolean',
              default: 'false',
              description: 'role=status, para banner que aparece ou muda depois do carregamento.',
            },
            { name: 'actions', type: 'ReactNode', description: 'Botões ou links à direita.' },
            {
              name: 'dismissible',
              type: 'boolean',
              default: 'false',
              description: 'Mostra o botão de fechar.',
            },
            {
              name: 'rememberId',
              type: 'string',
              description: 'Lembra o fechamento no localStorage (a mesma chave do behavior).',
            },
            { name: 'onDismiss', type: '() => void', description: 'Fechado pelo usuário.' },
            {
              name: 'texts',
              type: '{ close }',
              description: 'Nome do botão (padrão: “Fechar aviso”).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do Banner"
          rows={[
            {
              name: '.eds-banner',
              effect: 'A faixa. Tons: -info (padrão), -success, -warning, -danger, -neutral.',
            },
            { name: '.eds-banner-text', effect: 'O texto (um <p>).' },
            { name: '.eds-banner-actions', effect: 'Botões ou links à direita.' },
            { name: '.eds-banner-close', effect: 'Botão ghost de ícone para fechar.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Papel:</strong> aviso fixo é <code>role=&quot;region&quot;</code> com nome;
            banner dinâmico, <code>role=&quot;status&quot;</code> (use <code>alert</code> só para
            falha crítica).
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> ícone e texto dizem o que é (“Manutenção”).
          </li>
          <li>
            <strong>Foco:</strong> ao fechar, o foco vai ao próximo elemento focável, não se perde.
          </li>
        </ul>
      </Section>
    </>
  );
}
