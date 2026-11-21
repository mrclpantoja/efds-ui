import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import MascaraDocumentos from '../../examples/input/mascara-documentos';
import mascaraDocumentosHtml from '../../examples/input/mascara-documentos.html?raw';
import mascaraDocumentosSource from '../../examples/input/mascara-documentos.tsx?raw';
import MascaraMoeda from '../../examples/input/mascara-moeda';
import mascaraMoedaHtml from '../../examples/input/mascara-moeda.html?raw';
import mascaraMoedaSource from '../../examples/input/mascara-moeda.tsx?raw';

export default function MascaraPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Máscara de entrada: formata o valor enquanto a pessoa digita, sem trocar o tipo do campo. É
        um núcleo único (<code>createMask</code>), usado pelo atributo <code>data-eds-mask</code> no
        HTML e pela prop <code>mask</code> do <code>Input</code> no React.
      </p>

      <Section title="Máscaras prontas">
        <ClassTable
          caption="Máscaras prontas"
          headers={['Nome', 'O que faz']}
          rows={[
            {
              name: 'telefone',
              effect: 'Fixo (8 dígitos) ou celular (9), escolhido pelo tamanho. (11) 98765-4321.',
            },
            { name: 'cpf', effect: '000.000.000-00.' },
            {
              name: 'cnpj',
              effect:
                '00.000.000/0000-00; aceita letras nas 12 primeiras posições (CNPJ alfanumérico).',
            },
            { name: 'cpf-cnpj', effect: 'Alterna entre CPF e CNPJ pelo número de caracteres.' },
            { name: 'cep', effect: '00000-000.' },
            {
              name: 'moeda',
              effect:
                'Da direita para a esquerda, com centavos e "R$ ". Opções: decimals, prefix, negative.',
            },
            { name: 'numero', effect: 'Como a moeda, sem símbolo por padrão.' },
            {
              name: 'hora',
              effect: 'hh:mm (00:00). Faixa 00:00 a 23:59 só com data-eds-mask-validate.',
            },
            {
              name: 'competencia',
              effect: 'mm/aaaa (03/2026). Mês 01 a 12 só com data-eds-mask-validate.',
            },
            {
              name: 'processo',
              effect:
                'Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (25 caracteres). Com data-eds-mask-validate confere o dígito verificador.',
            },
            {
              name: 'padrão próprio',
              effect:
                '0 = dígito, A = letra (maiúscula), * = letra ou dígito; os demais são literais; \\ escapa.',
            },
          ]}
        />
      </Section>

      <Section title="Exemplos">
        <Example
          title="Documentos, telefone e CEP"
          html={mascaraDocumentosHtml}
          react={{ Component: MascaraDocumentos, source: mascaraDocumentosSource }}
        />
        <Example
          title="Moeda e número"
          html={mascaraMoedaHtml}
          react={{ Component: MascaraMoeda, source: mascaraMoedaSource }}
        />
        <p>
          Máscara personalizada, envio só dos caracteres significativos (<code>unmask</code>) e a
          tabela completa de atributos e props ficam na página{' '}
          <a href={toHref('/componentes/input')}>Input</a>.
        </p>
      </Section>

      <Section title="Contrato">
        <ClassTable
          caption="Atributos, props e evento"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-mask="nome"',
              effect: 'Liga a máscara (HTML, via @efds-ui/behavior).',
            },
            {
              name: 'data-eds-mask-unmask',
              effect:
                'Hidden com o mesmo name recebe o valor limpo; o campo visível não é enviado.',
            },
            {
              name: 'data-eds-mask-decimals / -prefix / -negative',
              effect: 'Opções de moeda e numero.',
            },
            {
              name: '<Input mask maskOptions unmask onValueChange>',
              effect: 'O mesmo contrato no React.',
            },
            {
              name: 'data-eds-mask-validate / <Input maskValidate>',
              effect:
                'Só em hora, competencia e processo: o campo fica inválido (setCustomValidity) fora da faixa e o erro aparece ao sair do campo. Vazio é válido (use required).',
            },
            { name: 'eds:mask-change', effect: 'detail { value, raw }, também ao colar.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade e cuidados">
        <ul className="docs-list">
          <li>
            <strong>A máscara não valida por padrão:</strong> não confere dígito verificador, data
            nem faixa (exceto com <code>data-eds-mask-validate</code> em hora, competência e
            processo). Continue com <code>required</code>, <code>pattern</code> e a validação no
            servidor.
          </li>
          <li>
            <strong>Dica de formato no texto de ajuda,</strong> não no placeholder (que some ao
            digitar e tem pouco contraste). O formato aparece sozinho enquanto se digita.
          </li>
          <li>
            <strong>Teclado de celular e preenchimento automático:</strong> <code>inputmode</code> e{' '}
            <code>autocomplete</code> são aplicados sem sobrescrever o que o autor definir.
          </li>
          <li>
            <strong>Colar e apagar:</strong> colar com ou sem pontuação funciona; Backspace sobre um
            literal apaga o dígito anterior; o cursor é preservado.
          </li>
        </ul>
        <Alert variant="warning" title="LGPD">
          <p>
            CPF, CNPJ, telefone e endereço são dados pessoais. Documentação, testes e logs usam só
            valores fictícios; mascare ou anonimize o que for exibido ou registrado.
          </p>
        </Alert>
      </Section>
    </>
  );
}
