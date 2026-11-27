import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

export default function AcessibilidadePage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        O efDS.ui mira a WCAG 2.2 nível AA. Esta página reúne o compromisso, o que os componentes já
        fazem e o que continua sendo do seu código. A seção &quot;Acessibilidade&quot; de cada
        componente traz o detalhe.
      </p>

      <Section title="Princípios">
        <ul className="docs-list">
          <li>
            <strong>HTML semântico antes de ARIA:</strong> <code>&lt;dialog&gt;</code>,{' '}
            <code>&lt;details&gt;</code>, <code>&lt;button&gt;</code>, <code>&lt;table&gt;</code>,
            popover nativo. ARIA só onde o HTML não alcança (tabs, combobox, árvore).
          </li>
          <li>
            <strong>Teclado em tudo:</strong> todo componente interativo funciona sem mouse, com o
            padrão do WAI-ARIA Authoring Practices quando há um.
          </li>
          <li>
            <strong>Foco sempre visível</strong> (anel com contraste mínimo de 3:1) e não coberto: o
            core reserva espaço de rolagem para os toasts (WCAG 2.4.11); um cabeçalho fixo do app
            (inclusive <code>.eds-page-header-sticky</code>) exige que o seu layout reserve{' '}
            <code>scroll-padding-block-start</code> no contêiner de rolagem.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> erro, sucesso, ordenação, etapa e seleção têm também
            ícone, texto ou forma.
          </li>
          <li>
            <strong>Contraste:</strong> texto 4,5:1 e componentes 3:1, calculados para todos os
            temas e para o modo escuro. Os tons sólidos de status que não alcançam 3:1 sobre branco
            não carregam texto: o texto de status usa os tokens <code>status-*-text</code>.
          </li>
          <li>
            <strong>Alvos de toque:</strong> no mínimo 24 px (WCAG 2.5.8); em telas de toque os
            campos sobem a 16 px de fonte (sem zoom automático no iOS).
          </li>
          <li>
            <strong>Preferências do sistema:</strong> <code>prefers-reduced-motion</code> desliga
            animações; <code>forced-colors</code> mantém bordas, foco e seleção legíveis;{' '}
            <code>prefers-color-scheme</code> escolhe o modo; a impressão tem folha própria.
          </li>
        </ul>
      </Section>

      <Section title="Teclado por componente">
        <ClassTable
          caption="Teclas por componente"
          headers={['Componente', 'Teclas']}
          rows={[
            {
              name: 'Modal e Drawer',
              effect:
                'Tab e Shift+Tab ficam presos no diálogo; Esc fecha e o foco volta ao gatilho (nativo do <dialog>).',
            },
            {
              name: 'Tabs',
              effect:
                '← e → movem e ativam (com volta); Home e End; Tab entra na aba ativa e sai da lista.',
            },
            {
              name: 'Dropdown e Popover',
              effect:
                'Enter ou Espaço abrem; Esc fecha e devolve o foco; Tab percorre os itens (padrão disclosure).',
            },
            { name: 'Tooltip', effect: 'Aparece com o foco; Esc dispensa sem mover o foco.' },
            { name: 'Accordion', effect: 'Enter ou Espaço no gatilho; Tab entre os gatilhos.' },
            {
              name: 'Wizard',
              effect: 'Enter ou Avançar valida e avança; o foco vai ao título da etapa nova.',
            },
            {
              name: 'Combobox e MultiSelect',
              effect:
                '↑ ↓ destacam; Enter escolhe; Esc fecha; digitar filtra (padrão APG list autocomplete).',
            },
            {
              name: 'DatePicker e DateRangePicker',
              effect:
                'Setas movem o dia; PageUp e PageDown, o mês; Shift com PageUp e PageDown, o ano; Home e End, a semana; Enter escolhe; Esc fecha (APG Date Picker Dialog).',
            },
            {
              name: 'Table',
              effect:
                'Botões de ordenação e caixas de seleção são controles comuns; a região rolável vira focável só quando rola; Esc limpa o filtro local.',
            },
            {
              name: 'Sortable',
              effect:
                'Espaço pega e solta; setas movem; PageUp e PageDown trocam de lista; Esc cancela.',
            },
            {
              name: 'Tree',
              effect:
                'Setas navegam e abrem; Home e End; F2 renomeia; Insert adiciona; Delete exclui (com Desfazer); Alt+setas movem; Shift+F10 abre o menu.',
            },
            {
              name: 'FilterBar',
              effect:
                'Chips são botões; depois de remover, o foco vai ao próximo chip ou ao primeiro campo.',
            },
          ]}
        />
      </Section>

      <Section title="O que o componente faz × o que é seu">
        <ul className="docs-list">
          <li>
            <strong>O componente garante:</strong> papéis e propriedades ARIA, ordem de foco,
            retorno de foco, anúncios em regiões <code>role=&quot;status&quot;</code> (ordenação,
            seleção, filtro, etapa, exportação), estados por atributo e exigências no tipo (botão só
            de ícone exige <code>aria-label</code>; Table exige <code>caption</code>; Popover exige
            título ou <code>aria-label</code>).
          </li>
          <li>
            <strong>Você garante:</strong> rótulos visíveis e únicos nos campos, textos de erro que
            digam como corrigir, ordem lógica do conteúdo, um só <code>&lt;h1&gt;</code> por página,
            foco movido ao título ao trocar de rota em um app de página única e nada essencial
            escondido em dica, popover ou item de accordion fechado.
          </li>
          <li>
            <strong>Textos:</strong> todo texto interno é pt-BR e substituível (<code>texts</code>{' '}
            no React; <code>configure({'{ messages }'})</code> no behavior).
          </li>
        </ul>
      </Section>

      <Section title="Limitações conhecidas">
        <ul className="docs-list">
          <li>
            Sem anchor positioning (Firefox), os menus do Dropdown, o menu &quot;⋯&quot; da Tree e o
            tooltip da Sidebar compacta são posicionados por JS (behavior e React): o menu abre
            junto ao gatilho, alinhado ao fim, e o tooltip compensa a rolagem do trilho. Sem JS, o
            menu fica na posição estática, junto ao gatilho, e o tooltip se desloca se o trilho
            rolar. O menu de tabela do editor (sem o behavior carregado) também fica na posição
            estática.
          </li>
          <li>
            Em alturas muito baixas (zoom de 400%, celular deitado, até 30rem) Drawer e Modal rolam
            por inteiro, com cabeçalho e rodapé compactos; o corpo não tem rolagem própria.
          </li>
          <li>
            A validação com leitores de tela (NVDA, VoiceOver), Safari e forced-colors reais é a
            Fase 7 do roteiro manual: a parte automatizável foi feita em jsdom e Chromium.
          </li>
        </ul>
      </Section>

      <Alert tone="info" title="Encontrou uma barreira?">
        <p>
          Acessibilidade é requisito, não recurso opcional: uma barreira em um componente é um bug.
          Veja também <a href={toHref('/comecar/eventos')}>Referência de eventos</a> e{' '}
          <a href={toHref('/fundamentos/temas-e-eixos')}>Temas e eixos</a> (modo escuro, densidade e
          contraste).
        </p>
      </Alert>
    </>
  );
}
