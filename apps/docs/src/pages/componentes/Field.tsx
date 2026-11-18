import { Stack } from '@eds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/field/basico';
import basicoHtml from '../../examples/field/basico.html?raw';
import basicoSource from '../../examples/field/basico.tsx?raw';
import Estados from '../../examples/field/estados';
import estadosHtml from '../../examples/field/estados.html?raw';
import estadosSource from '../../examples/field/estados.tsx?raw';

export default function FieldPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Une o rótulo, o controle e as mensagens de ajuda, erro e sucesso de um campo. No React, o
        Field faz as ligações de acessibilidade por você; em HTML, elas ficam por sua conta.
      </p>

      <UseCases
        use={[
          'Para todo Input, Textarea ou Select: nenhum campo fica sem rótulo visível.',
          'Para acompanhar o campo de ajuda (formato esperado) e de erro (o que corrigir).',
        ]}
        avoid={[
          <>
            Para grupos de Checkbox, Radio ou Switch: use{' '}
            <a href="#/componentes/fieldset">Fieldset</a> (ou RadioGroup), cuja legenda nomeia o
            grupo.
          </>,
          'Para vários controles no mesmo Field: ele envolve exatamente um controle.',
          'Para substituir o rótulo por placeholder: o placeholder some ao digitar.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Rótulo, controle e ajuda"
          description="Campo obrigatório: asterisco no rótulo e required no controle."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Erro, sucesso e obrigatório"
          description="A mensagem traz ícone e texto: a cor nunca é o único sinal."
          html={estadosHtml}
          react={{ Component: Estados, source: estadosSource }}
        />
      </Section>

      <Section title="API React">
        <p>
          <code>Field</code> aceita os atributos nativos de <code>div</code> e mescla{' '}
          <code>className</code>. O filho único (Input, Textarea ou Select) recebe automaticamente{' '}
          <code>id</code>, <code>aria-describedby</code>, <code>aria-invalid</code>,{' '}
          <code>required</code> e <code>data-valid</code>. Não defina <code>id</code> no controle: o{' '}
          <code>htmlFor</code> do rótulo aponta para o do Field.
        </p>
        <PropsTable
          caption="Props de Field"
          rows={[
            {
              name: 'label',
              type: 'ReactNode',
              required: true,
              description: 'Rótulo visível. Campo sem rótulo não é acessível.',
            },
            {
              name: 'helper',
              type: 'ReactNode',
              description: 'Texto de ajuda; entra no aria-describedby do controle.',
            },
            {
              name: 'error',
              type: 'ReactNode',
              description: (
                <>
                  Mensagem de erro: o controle recebe <code>aria-invalid=&quot;true&quot;</code> e a
                  descrição.
                </>
              ),
            },
            {
              name: 'success',
              type: 'ReactNode',
              description: (
                <>
                  Mensagem de sucesso: o controle recebe <code>data-valid=&quot;true&quot;</code>.
                  Ignorada se houver <code>error</code>.
                </>
              ),
            },
            {
              name: 'required',
              type: 'boolean',
              description: (
                <>
                  <code>required</code> real no controle mais o asterisco no rótulo.
                </>
              ),
            },
            {
              name: 'controlId',
              type: 'string',
              description: 'Fixa o id do controle (padrão: gerado com useId).',
            },
            {
              name: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Um único controle: Input, Textarea ou Select.',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes e atributos de Field"
          rows={[
            {
              name: '.eds-field',
              effect:
                'Coluna com rótulo, controle e mensagens, com espaçamento pequeno entre eles.',
            },
            { name: '.eds-label', effect: 'Rótulo: tamanho label, peso medium.' },
            {
              name: '.eds-label[data-required]',
              effect:
                'Acrescenta um asterisco vermelho. É só visual: o controle precisa de required.',
            },
            { name: '.eds-helper', effect: 'Texto de ajuda, em cor secundária e tamanho pequeno.' },
            {
              name: '.eds-error',
              effect: 'Mensagem de erro com ícone, na cor de perigo para texto.',
            },
            {
              name: '.eds-success',
              effect: 'Mensagem de sucesso com ícone, na cor de sucesso para texto.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <Stack gap={3}>
          <ul className="docs-list">
            <li>
              <strong>Nome:</strong> o rótulo é um <code>&lt;label for&gt;</code> real, então o
              clique nele foca o controle e o leitor de tela o anuncia.
            </li>
            <li>
              <strong>Descrição:</strong> ajuda, erro e sucesso entram no{' '}
              <code>aria-describedby</code> do controle (o React monta a lista; em HTML, aponte os
              ids).
            </li>
            <li>
              <strong>Obrigatório:</strong> o asterisco (<code>data-required</code>) é só visual e
              escondido do leitor; o controle precisa de <code>required</code> ou{' '}
              <code>aria-required</code>. O Field faz as duas coisas.
            </li>
            <li>
              <strong>Erro:</strong> <code>aria-invalid=&quot;true&quot;</code> mais mensagem com
              ícone e texto; nunca só a borda vermelha.
            </li>
            <li>
              <strong>O consumidor deve garantir:</strong> mensagens de erro que digam o que
              corrigir (&quot;Informe um e-mail válido, como nome@exemplo.com.br&quot;), e{' '}
              <code>autocomplete</code> adequado nos campos de dados do usuário logado (WCAG 1.3.5).
              Em cadastro de terceiros, use <code>autocomplete=&quot;off&quot;</code>.
            </li>
            <li>
              <strong>Validação no envio:</strong> em erro, mova o foco para um resumo dos problemas
              com links para os campos.
            </li>
          </ul>
        </Stack>
      </Section>
    </>
  );
}
