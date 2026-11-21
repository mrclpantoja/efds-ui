import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/password/basico';
import basicoHtml from '../../examples/password/basico.html?raw';
import basicoSource from '../../examples/password/basico.tsx?raw';
import Niveis from '../../examples/password/niveis';
import niveisHtml from '../../examples/password/niveis.html?raw';
import niveisSource from '../../examples/password/niveis.tsx?raw';

export default function PasswordPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Campo de senha com botão de mostrar e ocultar e, se você quiser, medidor de força e lista de
        regras. A senha é avaliada só no navegador: nada é enviado a lugar nenhum.
      </p>

      <UseCases
        use={[
          'Para criar ou trocar uma senha (com força e regras) e para entrar (só com o botão).',
          'Sempre que a pessoa precisar conferir o que digitou, principalmente no celular.',
        ]}
        avoid={[
          'Para PIN ou código de uma vez: use o campo de código de verificação (OTP).',
          'Para impedir senhas fracas: o medidor é uma ajuda; a política de senhas vale no servidor.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Nova senha, com força e regras"
          description="O botão tem nome fixo (“Mostrar senha”) e o estado em aria-pressed. A força aparece sempre em texto (cor nunca sozinha) e cada regra mostra “Atendida:” ou “Pendente:” em texto oculto. O anúncio da força só acontece depois de uma pausa na digitação ou ao sair do campo."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Níveis da força"
          description="data-level de 0 a 4 (0 é campo vazio). No HTML os níveis são só o markup; no React cada campo calcula o seu."
          html={niveisHtml}
          react={{ Component: Niveis, source: niveisSource }}
        />
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="Atributos e classes"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-password',
              effect: 'No input: liga o mostrar/ocultar (@efds-ui/behavior).',
            },
            {
              name: '[data-eds-password-toggle]',
              effect:
                'O botão (.eds-input-group-button): troca type e aria-pressed, mantém foco e seleção. Ao enviar o formulário o campo volta a ficar oculto.',
            },
            {
              name: 'data-eds-password-strength',
              effect:
                'No input: calcula a força (0 a 4) e atualiza data-level e o texto de .eds-password-strength e o data-met de cada <li> de .eds-password-rules.',
            },
            {
              name: 'data-eds-password-min',
              effect: 'Comprimento mínimo da regra de tamanho (padrão: minlength ou 8).',
            },
            {
              name: '<li data-rule="length|lower|upper|digit|symbol">',
              effect:
                'Qual regra o item representa (várias separadas por espaço). Sem data-rule, o item é reconhecido pelo texto (“maiúsculas”, “número”...).',
            },
            {
              name: 'eds:password-strength',
              effect: 'Evento no input, só quando o nível muda: detail { level, rules }.',
            },
          ]}
        />
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de PasswordInput"
          rows={[
            {
              name: '…InputProps',
              type: 'Input sem type, mask e unmask',
              description:
                'ref, className, value/defaultValue, size, invalid e demais atributos do input.',
            },
            {
              name: 'strength',
              type: 'boolean',
              default: 'false',
              description: 'Mostra a barra e o texto da força.',
            },
            {
              name: 'rules',
              type: 'boolean | { id, label }[]',
              default: 'false',
              description: (
                <>
                  <code>true</code> usa as regras padrão (tamanho, maiúsculas e minúsculas, número,
                  símbolo); uma lista usa as suas (<code>id</code> pode ser uma regra ou várias).
                </>
              ),
            },
            {
              name: 'minLength',
              type: 'number',
              default: '8',
              description: 'Comprimento da regra de tamanho.',
            },
            {
              name: 'onStrengthChange',
              type: '(level: 0 | 1 | 2 | 3 | 4) => void',
              description: 'Quando o nível muda.',
            },
            {
              name: 'texts',
              type: 'Partial<PasswordTexts>',
              description:
                'show, strength, strengthEmpty, announce, level1..level4, ruleMet, ruleUnmet e os rótulos das regras padrão.',
            },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Botão com nome fixo e estado:</strong> “Mostrar senha” com{' '}
            <code>aria-pressed</code>, em vez de trocar o nome (o leitor de tela anunciaria um botão
            novo a cada clique).
          </li>
          <li>
            <strong>Foco e cursor:</strong> o clique do mouse no botão não tira o foco do campo e a
            seleção é preservada ao trocar o tipo.
          </li>
          <li>
            <strong>Força em texto:</strong> a barra é reforço; o texto “Força: boa” e o estado das
            regras estão sempre no DOM e ligados ao campo por <code>aria-describedby</code>.
          </li>
          <li>
            <strong>Anúncio sem barulho:</strong> uma região <code>role=&quot;status&quot;</code>{' '}
            anuncia o nível uma vez, depois de 1,2 s sem digitar ou ao sair do campo. Nunca por
            tecla.
          </li>
          <li>
            <strong>Gerenciadores de senha:</strong> use{' '}
            <code>autocomplete=&quot;new-password&quot;</code> ao criar e{' '}
            <code>&quot;current-password&quot;</code> ao entrar; não bloqueie colar.
          </li>
        </ul>
        <Alert variant="warning" title="O medidor não é uma política">
          <p>
            A heurística local (tamanho, tipos de caractere, repetição, sequência e palavras comuns)
            ajuda a pessoa a escolher melhor. Exigências reais (tamanho mínimo, lista de senhas
            vazadas, bloqueio de tentativas) são do servidor.
          </p>
        </Alert>
      </Section>
    </>
  );
}
