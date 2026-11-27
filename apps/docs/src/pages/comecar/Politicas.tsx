import { Badge } from '@efds-ui/react';
import { Section } from '../../components/Section';
import { toHref } from '../../router';
import { REPOSITORY_URL } from '../../site';

/**
 * Políticas públicas do projeto: versionamento, depreciação, navegadores, suporte e estabilidade.
 * Os prazos de suporte e de resposta a falhas de segurança são uma proposta da mantenedora.
 */
export default function Politicas() {
  return (
    <>
      <p className="eds-text-body-lg">
        Regras que valem a partir da 1.0.0: o que conta como mudança que quebra, como uma API deixa
        de existir, o que é suportado e por quanto tempo. Ter isso por escrito permite planejar
        atualizações sem surpresa.
      </p>

      <Section title="Versionamento (SemVer)">
        <p>
          O efDS.ui segue o <a href="https://semver.org/lang/pt-BR/">Versionamento Semântico</a>. Os
          seis pacotes (<code>core</code>, <code>themes</code>, <code>icons</code>,{' '}
          <code>behavior</code>, <code>react</code> e <code>editor</code>) saem juntos, com o mesmo
          número de versão.
        </p>
        <ul className="docs-list">
          <li>
            <strong>Maior (2.0.0):</strong> mudança que quebra a API pública, sempre com guia de
            migração no CHANGELOG.
          </li>
          <li>
            <strong>Menor (1.1.0):</strong> funcionalidade nova compatível, incluindo componentes
            novos e avisos de depreciação.
          </li>
          <li>
            <strong>Correção (1.0.1):</strong> conserta defeito sem alterar a API.
          </li>
        </ul>

        <h3 className="eds-text-h3">Atualizar da 0.1 para a 1.0</h3>
        <p>
          A 1.0.0 revisou a API inteira antes de congelá-la e renomeou eventos, atributos, props e
          tipos. O{' '}
          <a href="https://github.com/mrclpantoja/efds-ui/blob/main/docs/migracao-1.0.md">
            guia de migração
          </a>{' '}
          traz cada nome antigo ao lado do novo, separado por camada (HTML, JavaScript puro e
          React).
        </p>

        <h3 className="eds-text-h3">O que faz parte da API pública</h3>
        <p>Mudar ou remover qualquer item abaixo é uma quebra e só acontece numa versão maior:</p>
        <ul className="docs-list">
          <li>
            <strong>Classes CSS</strong> <code>.eds-*</code> documentadas, com o significado de cada
            variante e tamanho.
          </li>
          <li>
            <strong>Tokens</strong> <code>--eds-*</code> semânticos (os que os componentes e quem
            usa o sistema consomem). Primitivos e tokens de componente (<code>--_*</code>) são
            internos e podem mudar.
          </li>
          <li>
            <strong>Atributos</strong> <code>data-eds-*</code>, e os eixos <code>data-theme</code>,{' '}
            <code>data-mode</code>, <code>data-density</code> e <code>data-shape</code>, com seus
            valores.
          </li>
          <li>
            <strong>Eventos</strong> <code>eds:*</code>: o nome, o <code>detail</code> e se são
            canceláveis.
          </li>
          <li>
            <strong>API do React:</strong> nomes de componentes, props e seus tipos, valores de{' '}
            <code>variant</code>, <code>tone</code> e <code>size</code>, e as chaves de{' '}
            <code>texts</code>.
          </li>
          <li>
            <strong>API do JavaScript puro:</strong> as funções exportadas de{' '}
            <code>@efds-ui/behavior</code> e dos subcaminhos documentados (<code>/mask</code>,{' '}
            <code>/export</code>, <code>/format</code> e semelhantes) e o objeto <code>EDS</code>. O
            subcaminho <code>@efds-ui/behavior/internal</code> existe para o{' '}
            <code>@efds-ui/react</code> e não faz parte da API pública: pode mudar em qualquer
            versão.
          </li>
          <li>
            <strong>Estrutura do markup</strong> descrita nas páginas de componente (partes, ordem
            dos filhos, atributos ARIA que o CSS e o JavaScript esperam).
          </li>
        </ul>

        <h3 className="eds-text-h3">O que não é quebra</h3>
        <ul className="docs-list">
          <li>
            Ajustes visuais finos: cor, espaçamento e raio por tema, desde que o contraste continue
            em WCAG 2.2 AA.
          </li>
          <li>Acrescentar uma classe, token, atributo, evento, prop ou chave de texto.</li>
          <li>
            Textos padrão em português (o que está em <code>texts</code> e <code>configure</code>):
            quem precisa de um texto exato deve fixá-lo na configuração.
          </li>
          <li>
            Correções de acessibilidade que mudem atributos ARIA internos, quando o comportamento
            documentado se mantém.
          </li>
          <li>
            Qualquer coisa marcada como <em>experimental</em> (veja &ldquo;Estabilidade por
            componente&rdquo;).
          </li>
          <li>
            Seletores que dependem de detalhes não documentados (a ordem dos elementos fora do
            contrato, classes sem prefixo <code>eds-</code>, estilos aplicados por cima do CSS do
            core).
          </li>
        </ul>
      </Section>

      <Section title="Depreciação">
        <p>Nada que seja API pública some de uma hora para outra:</p>
        <ol className="docs-list">
          <li>
            O item é marcado como <strong>depreciado</strong> numa versão menor. O CHANGELOG diz o
            que usar no lugar.
          </li>
          <li>
            Em desenvolvimento, o código avisa no console (<code>console.warn</code>, uma vez por
            item). O aviso não aparece em produção. No React, a prop depreciada também recebe a
            marca <code>@deprecated</code> nos tipos, que os editores mostram.
          </li>
          <li>
            O item continua funcionando por pelo menos <strong>uma versão menor</strong> inteira.
          </li>
          <li>
            A remoção só acontece na <strong>próxima versão maior</strong>, com guia de migração.
          </li>
        </ol>
        <p>
          Exceção: falha grave de segurança ou de acessibilidade pode obrigar a remoção mais cedo.
          Nesse caso o CHANGELOG explica o motivo.
        </p>
      </Section>

      <Section title="Navegadores suportados">
        <p>
          As <strong>duas últimas versões estáveis</strong> de cada um destes navegadores, em
          computador e em celular:
        </p>
        <ul className="docs-list">
          <li>Chrome (e navegadores baseados em Chromium)</li>
          <li>Edge</li>
          <li>Firefox</li>
          <li>Safari (macOS e iOS)</li>
        </ul>
        <p>
          O Internet Explorer e as versões mais antigas desses navegadores <strong>não</strong> são
          suportados. O core usa CSS moderno (camadas, container queries, <code>:has()</code>,{' '}
          <code>color-mix()</code>) e o JavaScript usa <code>&lt;dialog&gt;</code> e a Popover API.
          Onde um recurso novo falta, o componente precisa continuar utilizável, só sem o
          refinamento; as exceções conhecidas estão na página de cada componente (por exemplo, o
          tooltip da Sidebar compacta no Firefox).
        </p>
      </Section>

      <Section title="React, Node e ferramentas">
        <ul className="docs-list">
          <li>
            <strong>React:</strong> 18 e 19 (<code>react</code> e <code>react-dom</code> são peer
            dependencies). O pacote não importa CSS: quem usa importa o do core.
          </li>
          <li>
            <strong>TypeScript:</strong> os tipos são escritos em modo <code>strict</code>. Os
            pacotes funcionam também em projetos JavaScript.
          </li>
          <li>
            <strong>Node.js:</strong> 20 ou mais recente (versões LTS ativas) para instalar,
            compilar e testar o repositório, e para os bundlers que consomem os pacotes. Em
            produção, o navegador não precisa de Node.
          </li>
          <li>
            <strong>Sem build:</strong> o CSS e o JavaScript puro também chegam por{' '}
            <code>&lt;link&gt;</code> e <code>&lt;script&gt;</code>, com CDN ou servidos pelo seu
            servidor (PHP, Java, .NET). Veja <a href={toHref('/comecar/instalacao')}>Instalação</a>.
          </li>
        </ul>
      </Section>

      <Section title="Suporte às versões">
        <p>Os prazos abaixo valem a partir da 1.0.0.</p>
        <ul className="docs-list">
          <li>
            <strong>Versão maior atual:</strong> recebe correções, melhorias e funcionalidades
            novas.
          </li>
          <li>
            <strong>Versão maior anterior:</strong> recebe só correções de segurança por 6 meses
            depois do lançamento da maior seguinte.
          </li>
          <li>
            <strong>Versões mais antigas:</strong> sem suporte. O CHANGELOG traz o guia para
            atualizar.
          </li>
          <li>
            <strong>Pré-1.0 (0.x):</strong> sem garantia de compatibilidade entre versões menores.
          </li>
        </ul>
        <p>
          Quem precisa de prazo contratual (órgãos públicos, por exemplo) pode falar com a{' '}
          <a href="https://innovationtech.com.br/">Innovation Tech</a>, que mantém o projeto.
        </p>
      </Section>

      <Section title="Segurança">
        <p>
          Falhas de segurança devem ser relatadas em particular pelo{' '}
          <a href={`${REPOSITORY_URL}/security/advisories/new`}>
            relato de vulnerabilidade do GitHub
          </a>
          , nunca numa issue pública. O processo, o escopo e o prazo de resposta estão no arquivo{' '}
          <a href={`${REPOSITORY_URL}/blob/main/SECURITY.md`}>SECURITY.md</a>.
        </p>
      </Section>

      <Section title="Estabilidade por componente">
        <p>
          Cada página de componente mostra um selo no topo. O selo vem sempre com o texto, não só
          com a cor.
        </p>
        <ul className="docs-list">
          <li>
            <Badge tone="success">Estável</Badge> A API segue o SemVer acima. Mudanças que quebram
            só chegam numa versão maior, com depreciação antes.
          </li>
          <li>
            <Badge tone="warning">Experimental</Badge> O componente funciona e é testado, mas a API
            ainda pode mudar numa versão menor, com aviso no CHANGELOG. Use e dê retorno; evite
            depender dele onde uma troca de API seria cara.
          </li>
        </ul>
        <p>
          Um componente experimental passa a estável quando tem a API revisada, testes de teclado e
          leitor de tela, e validação nos navegadores suportados. A mudança é anunciada no
          CHANGELOG. Hoje são experimentais: Editor de conteúdo, Agenda, Paleta de comandos,
          Galeria, Corte de imagem, Árvore, Arrastar e soltar e Lookup.
        </p>
      </Section>

      <Section title="Compatibilidade entre pacotes">
        <p>
          Use a mesma versão nos seis pacotes. O <code>@efds-ui/react</code> depende de um
          subcaminho do <code>@efds-ui/behavior</code>; misturar versões maiores diferentes não é
          suportado.
        </p>
      </Section>

      <Section title="Como participar">
        <p>
          Dúvidas, defeitos e propostas de componente vão para as{' '}
          <a href={`${REPOSITORY_URL}/issues`}>issues</a> do repositório. O guia para contribuir
          está em <a href={`${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>.
        </p>
      </Section>
    </>
  );
}
