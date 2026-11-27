import {
  Alert,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
  Image,
} from '@efds-ui/react';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

interface TemplateInfo {
  id: string;
  name: string;
  summary: string;
  screens: readonly string[];
}

const templates: readonly TemplateInfo[] = [
  {
    id: 'painel',
    name: 'Painel administrativo',
    summary:
      'Casca de aplicação com indicadores, notificações, perfil e preferências de aparência.',
    screens: [
      'Início com indicadores, tabelas resumo e atividades recentes',
      'Notificações com filtro e marcar como lida',
      'Perfil com corte de foto e troca de senha',
      'Configurações de aparência, preferências e sessão por inatividade',
      'Página de erro 404',
    ],
  },
  {
    id: 'cadastro',
    name: 'Cadastro (CRUD)',
    summary:
      'Cadastro completo de fornecedores: listar, filtrar, exportar, incluir, editar e excluir.',
    screens: [
      'Listagem com filtros, ordenação, seleção, paginação e exclusão em lote',
      'Exportação CSV, XLSX e PDF com documento mascarado',
      'Formulário com máscaras, CEP, campos condicionais e alterações não salvas',
      'Detalhe com abas e histórico',
    ],
  },
  {
    id: 'portal',
    name: 'Portal de serviços',
    summary: 'Site público de um órgão fictício com carta de serviços, solicitação e protocolo.',
    screens: [
      'Início com busca, serviços mais acessados, categorias e notícias',
      'Carta de serviços com filtro',
      'Página de serviço com etapas, documentos e perguntas frequentes',
      'Solicitação em etapas com número de protocolo',
      'Consulta de protocolo e página de acessibilidade',
    ],
  },
];

export default function Templates() {
  return (
    <>
      <p className="eds-text-body-lg">
        Telas completas montadas só com o efDS.ui, prontas para servir de ponto de partida. Cada
        template vem em duas versões com as mesmas telas: <strong>HTML puro</strong> com o{' '}
        <code>@efds-ui/behavior</code> (para PHP, Java, .NET ou qualquer servidor) e{' '}
        <strong>React</strong> com Vite e o <code>@efds-ui/react</code>. Todos os dados são
        fictícios.
      </p>

      <Section title="Templates gratuitos">
        <Grid gap={4}>
          {templates.map((t) => (
            <GridItem key={t.id} span={12} spanMd={6} spanLg={4}>
              <Card>
                <Image
                  src={`img/templates/${t.id}.png`}
                  alt={`Tela inicial do template ${t.name}`}
                  width={1280}
                  height={800}
                  loading="lazy"
                />
                <CardHeader>
                  <CardTitle level={3}>{t.name}</CardTitle>
                </CardHeader>
                <CardBody>
                  <p>{t.summary}</p>
                  <ul className="docs-list">
                    {t.screens.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </CardBody>
                <CardFooter>
                  <a
                    className="eds-button eds-button-primary eds-button-sm"
                    href={`demos/${t.id}/html/index.html`}
                    target="_blank"
                    rel="noopener"
                  >
                    Demonstração HTML
                    <span className="eds-visually-hidden"> do {t.name} (abre em nova aba)</span>
                  </a>
                  <a
                    className="eds-button eds-button-secondary eds-button-sm"
                    href={`demos/${t.id}/react/index.html`}
                    target="_blank"
                    rel="noopener"
                  >
                    Demonstração React
                    <span className="eds-visually-hidden"> do {t.name} (abre em nova aba)</span>
                  </a>
                </CardFooter>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </Section>

      <Section title="Download">
        <Alert tone="info" title="Em breve">
          O download dos templates gratuitos estará disponível aqui. Eles são livres, sob licença
          MIT, e <strong>não precisam de chave de licença</strong> para funcionar: baixe, abra e
          use. Enquanto isso, as demonstrações acima funcionam normalmente, e o código está no
          repositório do efDS.ui, na pasta <code>templates/</code>.
        </Alert>
        <p>
          O pacote traz as duas versões (HTML e React) e as instruções de instalação. Os arquivos do
          efDS.ui já vão dentro da versão HTML; nada é carregado de CDN.
        </p>
        <p>
          Um cadastro rápido poderá existir no futuro, só para você receber novidades. Ele nunca
          será exigido para o template funcionar. Se quiser, você também poderá autorizar nosso
          contato para mostrar o seu projeto em <a href={toHref('/comecar/quem-usa')}>Quem usa</a>.
          É opcional e não interfere no download.
        </p>
      </Section>

      <Section title="Templates premium">
        <p>
          Dez templates para áreas específicas estão em preparação: ERP financeiro, CRM de vendas,
          Helpdesk, RH, Protocolo e processo administrativo, Ouvidoria e e-SIC, Contratos e
          licitações, Estoque e patrimônio, Agenda e atendimento, e Gestão escolar. Terão licença
          para um site ou para vários sites, com uma chave de licença; veja{' '}
          <a href={toHref('/templates/licenca')}>Licença dos templates</a>.
        </p>
      </Section>

      <Section title="Quem mantém">
        <p>
          Os templates são desenvolvidos e mantidos pela{' '}
          <a href="https://innovationtech.com.br/">Innovation Tech</a>, a mesma equipe do efDS.ui.
        </p>
      </Section>
    </>
  );
}
