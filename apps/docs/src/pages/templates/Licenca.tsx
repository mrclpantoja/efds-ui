import { CodeBlock } from '../../components/CodeBlock';
import { ClassTable } from '../../components/ClassTable';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

const licenseJson = `{
  "v": 1,
  "id": "7a855d9b-f621-4427-aec3-04ebd1bd7c28",
  "product": "cadastro",
  "type": "single",
  "domains": ["sistema.exemplo.gov.br"],
  "issuedAt": "2026-11-22"
}`;

const htmlKey = `// efds-config.js (na pasta html/)
window.EFDS_LICENSE_KEY = 'cole-aqui-a-chave-recebida';`;

const reactKey = `# .env (na pasta react/; copie de .env.example)
VITE_EFDS_LICENSE_KEY=cole-aqui-a-chave-recebida`;

export default function Licenca() {
  return (
    <>
      <p className="eds-text-body-lg">
        Os <strong>templates gratuitos</strong> (Painel administrativo, Cadastro e Portal de
        serviços) são livres, sob a licença MIT: o download é aberto e eles funcionam{' '}
        <strong>sem chave de licença</strong>. Esta página trata dos{' '}
        <strong>templates premium</strong>, que ainda não foram publicados.
      </p>
      <p>
        Cada template premium baixado traz um <strong>arquivo de licença</strong> com um
        identificador único e é acompanhado de uma <strong>chave</strong>. A chave é a assinatura
        digital desse arquivo: só funciona com ele. Sem a chave, ou com uma chave que não
        corresponde ao arquivo, o template não executa e mostra uma tela explicando o motivo.
      </p>

      <Section title="O arquivo de licença">
        <p>
          Fica em <code>efds-license.json</code> (no React, em <code>src/</code>) e, na versão HTML,
          também em <code>efds-license.js</code>. Não edite o arquivo: qualquer alteração invalida a
          chave.
        </p>
        <CodeBlock code={licenseJson} label="Exemplo de efds-license.json" />
        <ClassTable
          caption="Campos do arquivo de licença"
          headers={['Campo', 'Significado']}
          rows={[
            { name: 'id', effect: 'Identificador único da licença.' },
            { name: 'product', effect: 'Template a que a licença se refere.' },
            {
              name: 'type',
              effect: (
                <>
                  <code>single</code> (um site) ou <code>multi</code> (vários sites).
                </>
              ),
            },
            {
              name: 'domains',
              effect:
                'Domínios autorizados. O endereço onde o template roda precisa ser um deles ou um subdomínio. Ausente: qualquer domínio.',
            },
            { name: 'issuedAt', effect: 'Data de emissão.' },
          ]}
        />
      </Section>

      <Section title="Onde colocar a chave">
        <Section title="Versão HTML" level={3}>
          <CodeBlock code={htmlKey} label="efds-config.js" />
        </Section>
        <Section title="Versão React" level={3}>
          <CodeBlock code={reactKey} label=".env" />
          <p>
            A chave entra no build: depois de alterar o <code>.env</code>, gere o build de novo.
          </p>
        </Section>
      </Section>

      <Section title="Mensagens de bloqueio">
        <ClassTable
          caption="Motivos de bloqueio e como resolver"
          headers={['Mensagem', 'O que fazer']}
          rows={[
            {
              name: 'Chave de licença ausente',
              effect: 'Cole a chave recebida no efds-config.js (HTML) ou no .env (React).',
            },
            {
              name: 'Arquivo de licença inválido',
              effect:
                'O efds-license.json está corrompido ou foi alterado. Use o arquivo original do download.',
            },
            {
              name: 'Chave não corresponde ao arquivo de licença',
              effect:
                'A chave é de outro download. Confira se a chave e o arquivo vêm do mesmo pacote.',
            },
            {
              name: 'Domínio não coberto pela licença',
              effect:
                'O template está rodando num domínio que não consta da licença. Solicite uma licença para esse domínio ou uma licença para vários sites.',
            },
            {
              name: 'Comportamento do efDS.ui não carregado',
              effect:
                'Só na versão HTML: o eds-behavior.js não foi carregado. Confira o caminho da pasta vendor/.',
            },
          ]}
        />
      </Section>

      <Section title="Privacidade e funcionamento offline">
        <ul className="docs-list">
          <li>
            A verificação acontece no próprio navegador, sem consultar nenhum servidor: funciona em
            intranet sem acesso à internet.
          </li>
          <li>
            Nenhum dado de quem usa o sistema é enviado a lugar algum. O arquivo de licença não tem
            dados pessoais.
          </li>
          <li>
            Ambientes de desenvolvimento e homologação: inclua os domínios deles na licença (por
            exemplo <code>localhost</code>) ou use uma licença para vários sites.
          </li>
        </ul>
      </Section>

      <Section title="Tipos de licença">
        <ul className="docs-list">
          <li>
            <strong>Gratuitos:</strong> sem chave; MIT, download livre.
          </li>
          <li>
            <strong>Um site</strong> (premium): um domínio ou sistema em produção.
          </li>
          <li>
            <strong>Vários sites</strong> (premium): sem limite de domínios.
          </li>
        </ul>
        <p>
          Os componentes do efDS.ui continuam livres sob a licença MIT; a chave descrita acima vale
          só para os templates premium. Veja os{' '}
          <a href={toHref('/templates')}>templates disponíveis</a>.
        </p>
      </Section>
    </>
  );
}
