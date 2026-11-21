import { Stack } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Dividido from '../../examples/dropdown/dividido';
import divididoHtml from '../../examples/dropdown/dividido.html?raw';
import divididoSource from '../../examples/dropdown/dividido.tsx?raw';
import Menu from '../../examples/dropdown/menu';
import menuHtml from '../../examples/dropdown/menu.html?raw';
import menuSource from '../../examples/dropdown/menu.tsx?raw';

export default function DropdownPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Menu de ações que se abre a partir de um botão. Usa a Popover API do navegador: abrir,
        fechar, Esc e clique fora funcionam sem JavaScript.
      </p>

      <UseCases
        use={[
          'Para reunir ações secundárias de um registro (editar, exportar, excluir) sem poluir a tela.',
          'Para opções extras de uma ação principal (Salvar e mais opções).',
          'Para ações destrutivas ao fim do menu, separadas e na variante danger.',
        ]}
        avoid={[
          'Para ir a outra página de navegação principal: use Navbar ou Sidebar.',
          'Para escolher um valor de formulário: use Select.',
          'Para uma única ação: use um Button.',
          'Para conteúdo livre (campos, filtros): o menu é só uma lista de ações.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Menu de ações"
          description="Gatilho e menu; o item desabilitado continua focável e não fecha o menu. No HTML o menu funciona sem JavaScript."
          html={menuHtml}
          react={{ Component: Menu, source: menuSource }}
        />
        <Example
          title="Botão dividido"
          description="Botão principal e gatilho do menu num ButtonGroup. O gatilho só de ícone exige aria-label."
          html={divididoHtml}
          react={{ Component: Dividido, source: divididoSource }}
        />
        <p className="docs-muted">
          Em HTML puro o <code>aria-expanded</code> do gatilho não se atualiza sozinho: o navegador
          já expõe o estado de abertura ao leitor de tela pelo <code>popovertarget</code>, mas o
          giro da seta do gatilho depende de <code>aria-expanded</code>, que o React sincroniza no
          evento <code>toggle</code>. Em HTML, o <code>@efds-ui/behavior</code> faz essa
          sincronização (e fecha o menu quando o foco sai dele); os previews acima já estão ligados
          a ele. Sem o pacote, sincronize-o com um pequeno script.
        </p>
      </Section>

      <Section title="API React">
        <p>
          <code>Dropdown</code> renderiza o gatilho (acrescentando <code>popovertarget</code>,{' '}
          <code>id</code> e <code>aria-expanded</code>) e o menu. <code>DropdownItem</code> e{' '}
          <code>DropdownSeparator</code> são os filhos.
        </p>
        <PropsTable
          caption="Props de Dropdown"
          rows={[
            {
              name: 'trigger',
              type: 'ReactElement',
              required: true,
              description: (
                <>
                  Gatilho: um <code>Button</code> (ou elemento que repasse <code>id</code>,{' '}
                  <code>popoverTarget</code> e <code>aria-expanded</code> ao botão).
                </>
              ),
            },
            {
              name: 'onOpenChange',
              type: '(open: boolean) => void',
              description: 'Chamado quando o menu abre ou fecha, inclusive por Esc e clique fora.',
            },
            {
              name: 'id',
              type: 'string',
              description: 'id do menu (padrão: gerado com useId).',
            },
          ]}
        />
        <PropsTable
          caption="Props de DropdownItem"
          rows={[
            {
              name: 'variant',
              type: "'default' | 'danger'",
              default: "'default'",
              description: 'danger para ações destrutivas.',
            },
            {
              name: 'href',
              type: 'string',
              description: (
                <>
                  Com <code>href</code>, o item é um <code>&lt;a&gt;</code> (navegação).
                </>
              ),
            },
            {
              name: 'disabled',
              type: 'boolean',
              default: 'false',
              description: (
                <>
                  Vira <code>aria-disabled</code>: o item continua focável, não age e não fecha o
                  menu.
                </>
              ),
            },
            {
              name: 'onClick',
              type: 'MouseEventHandler',
              description:
                'Chamado depois que o menu fecha, com o foco já de volta no gatilho (seguro para abrir um modal).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Dropdown"
          rows={[
            {
              name: '.eds-dropdown',
              effect:
                'O menu (popover): superfície com borda, raio e sombra; ancorado ao gatilho quando o navegador suporta.',
            },
            {
              name: '.eds-dropdown-item',
              effect: 'Item: botão ou link de largura total, com ícone opcional de 1rem.',
            },
            { name: '.eds-dropdown-item-danger', effect: 'Ação destrutiva, na cor de perigo.' },
            { name: '.eds-dropdown-separator', effect: 'Linha que separa grupos de itens.' },
            {
              name: '[aria-disabled="true"]',
              effect: 'Item desabilitado: texto esmaecido, sem hover.',
            },
            {
              name: '.eds-button[popovertarget]',
              effect:
                'Gatilho: ganha uma seta indicadora (exceto o botão só de ícone), que gira com aria-expanded="true".',
            },
          ]}
        />
      </Section>

      <Section title="Eventos (HTML)">
        <ClassTable
          caption="Eventos do @efds-ui/behavior"
          headers={['Evento', 'Quando']}
          rows={[
            {
              name: 'eds:dropdown-open',
              effect: 'O menu abre. Sai no próprio menu (.eds-dropdown), com bubble.',
            },
            {
              name: 'eds:dropdown-close',
              effect: 'O menu fecha (Esc, clique fora, foco que sai ou o item escolhido).',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Padrão disclosure:</strong> o menu não usa <code>role=&quot;menu&quot;</code>.
              É um grupo (<code>role=&quot;group&quot;</code>) nomeado pelo gatilho (
              <code>aria-labelledby</code>), e os itens são botões alcançados por Tab. Assim não se
              promete a navegação por setas que o core não entrega.
            </li>
            <li>
              <strong>Teclado:</strong> Enter/Espaço abrem; Tab percorre os itens; Esc fecha e
              devolve o foco ao gatilho. No React, o menu também fecha quando o foco sai dele por
              Tab.
            </li>
            <li>
              <strong>Estado:</strong> o React mantém <code>aria-expanded</code> do gatilho
              sincronizado pelo evento <code>toggle</code>.
            </li>
            <li>
              <strong>Item desabilitado:</strong> usa <code>aria-disabled</code> para continuar
              focável e anunciado, em vez de sumir da navegação.
            </li>
            <li>
              <strong>Ação que abre modal:</strong> o item fecha o menu antes do{' '}
              <code>onClick</code>, para o foco já estar no gatilho e voltar a ele depois do modal.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> um texto de gatilho que descreva o menu
              (&quot;Ações do pedido&quot;, não &quot;Mais&quot;) e confirmação em ações
              destrutivas.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
