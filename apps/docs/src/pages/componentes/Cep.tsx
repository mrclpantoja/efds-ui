import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/cep/basico';
import basicoHtml from '../../examples/cep/basico.html?raw';
import basicoSource from '../../examples/cep/basico.tsx?raw';

export default function CepPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Preenche logradouro, bairro, cidade e UF quando o CEP fica completo. O serviço de consulta é
        escolha de quem implanta:{' '}
        <strong>o pacote não faz nenhuma chamada externa por padrão</strong>.
      </p>

      <UseCases
        use={[
          'Em cadastros de endereço, para poupar digitação e evitar erro.',
          'Com um serviço que você escolheu (público, como o ViaCEP, ou uma rota do seu servidor).',
        ]}
        avoid={[
          'Sem avaliar a LGPD: o CEP junto de outros dados identifica uma pessoa e vai para o serviço escolhido.',
          'Como única fonte do endereço: deixe os campos editáveis (o serviço pode não ter o logradouro).',
        ]}
      />

      <Alert variant="warning" title="Sem URL, nada é consultado">
        <p>
          O padrão de <code>cepUrl</code> é vazio. Configure o serviço com{' '}
          <code>configure({'{ cepUrl: "https://viacep.com.br/ws/{cep}/json/" }'})</code>, com{' '}
          <code>data-eds-cep-url</code> no campo, com <code>data-eds-cep-url</code> na tag do{' '}
          <code>&lt;script&gt;</code> ou com a opção <code>url</code> do <code>useCep</code>. Os
          exemplos desta página usam um serviço fictício local (
          <code>/mock/cep/&#123;cep&#125;</code>).
        </p>
      </Alert>

      <Section title="Exemplo">
        <Example
          title="CEP com preenchimento"
          description="Teste 90010-100 (existe, fictício), 00000-000 (não encontrado) e 99999-999 (falha de rede simulada, com “Tentar de novo”). Enquanto consulta: spinner no grupo, aria-busy e anúncio; o resultado também é anunciado."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <ClassTable
          caption="Atributos e evento"
          headers={['Item', 'Efeito']}
          rows={[
            {
              name: 'data-eds-cep',
              effect:
                'No input do CEP (use junto com data-eds-mask="cep"). Consulta ao completar 8 dígitos. Só na compilação completa (eds-behavior.js).',
            },
            {
              name: 'data-eds-cep-fill="logradouro:#rua,bairro:#bairro,localidade:#cidade,uf:#uf"',
              effect:
                'Campo do serviço : seletor do campo da página. Os campos recebem os eventos input e change.',
            },
            {
              name: 'data-eds-cep-url',
              effect:
                'Serviço deste campo, com {cep} (ou os dígitos acrescentados). Vale mais que a configuração.',
            },
            {
              name: 'configure({ cepUrl })',
              effect: 'Serviço padrão de todos os campos. Vazio por padrão: sem chamada externa.',
            },
            {
              name: 'eds:cep-result',
              effect: 'detail { cep, status: "found" | "notfound" | "error", data? }.',
            },
          ]}
        />
        <p>
          A resposta esperada é a do ViaCEP: <code>logradouro</code>, <code>bairro</code>,{' '}
          <code>localidade</code>, <code>uf</code>; <code>erro: true</code> (ou 404) é “não
          encontrado”. Estados: carregando (<code>aria-busy</code> no campo e no grupo, spinner),
          não encontrado (<code>p.eds-error</code>) e falha de rede (erro com “Tentar de novo”).
        </p>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="useCep(cep, { url })"
          rows={[
            {
              name: 'cep',
              type: 'string',
              required: true,
              description: 'O texto do campo (com ou sem máscara). Só consulta com 8 dígitos.',
            },
            {
              name: 'url',
              type: 'string',
              default: "''",
              description: 'Serviço, com {cep}. Sem ela nenhuma chamada é feita (status idle).',
            },
            {
              name: 'status',
              type: "'idle' | 'loading' | 'found' | 'notfound' | 'error'",
              description: 'Estado da consulta (retorno).',
            },
            {
              name: 'data',
              type: 'CepAddress | null',
              description: 'Endereço quando found (retorno).',
            },
            {
              name: 'retry',
              type: '() => void',
              description: 'Consulta de novo, para o “Tentar de novo” (retorno).',
            },
          ]}
        />
        <p>
          O hook não preenche campos: use <code>data</code> para alimentar o estado dos seus inputs
          (veja o exemplo). Uma consulta nova cancela a anterior.
        </p>
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Estados em texto:</strong> “Buscando CEP…”, “CEP não encontrado.” e “Não foi
            possível consultar o CEP.” são lidos por uma região <code>role=&quot;status&quot;</code>{' '}
            e, nos erros, ficam visíveis em <code>p.eds-error</code> ligado ao campo.
          </li>
          <li>
            <strong>Tentar de novo:</strong> botão real, no próprio erro, só na falha de rede.
          </li>
          <li>
            <strong>Preenchimento anunciado:</strong> “Endereço preenchido.” ao receber o resultado;
            o foco não se move sozinho.
          </li>
          <li>
            <strong>Campos editáveis:</strong> a consulta nunca bloqueia a digitação manual.
          </li>
        </ul>
      </Section>
    </>
  );
}
