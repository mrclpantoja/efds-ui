import {
  Badge,
  Button,
  DescriptionList,
  EmptyState,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Timeline,
  useDialog,
  useToast,
} from '@efds-ui/react';
import { EditIcon, SearchIcon, TrashIcon } from '@efds-ui/icons';
import { dataBr, moeda, situacoes } from '../data';
import { Shell } from '../Shell';
import { useStore } from '../store';

export function DetalhePage({ id }: { id: string }) {
  const { achar, remover } = useStore();
  const { confirm } = useDialog();
  const { show } = useToast();
  const f = achar(id);

  if (!f) {
    return (
      <Shell
        current="lista"
        title="Fornecedor não encontrado"
        breadcrumb={[
          { label: 'Início', href: '#/' },
          { label: 'Fornecedores', href: '#/' },
          { label: 'Não encontrado' },
        ]}
      >
        <EmptyState
          icon={<SearchIcon />}
          headingLevel={2}
          title="Fornecedor não encontrado"
          description="O código informado não existe nesta lista. Ele pode ter sido excluído."
          actions={
            <Button variant="primary" href="#/">
              Voltar para a lista
            </Button>
          }
        />
      </Shell>
    );
  }

  const sit = situacoes[f.situacao];

  const excluir = async () => {
    const ok = await confirm(
      `Excluir o fornecedor ${f.razao}? Esta ação não pode ser desfeita.`,
      'Excluir fornecedor',
      'danger',
      { okText: 'Excluir' },
    );
    if (!ok) return;
    remover([f.id]);
    window.location.hash = '#/';
    show({ variant: 'success', message: `Fornecedor ${f.razao} excluído (simulação).` });
  };

  return (
    <Shell
      current="lista"
      title={f.razao}
      description={`${f.id} · ${f.tipo === 'pj' ? 'Pessoa jurídica' : 'Pessoa física'}`}
      breadcrumb={[
        { label: 'Início', href: '#/' },
        { label: 'Fornecedores', href: '#/' },
        { label: f.razao },
      ]}
      actions={
        <>
          <Button href={`#/editar/${f.id}`}>
            <EditIcon />
            Editar
          </Button>
          <Button variant="danger" onClick={() => void excluir()}>
            <TrashIcon />
            Excluir
          </Button>
        </>
      }
    >
      <Tabs defaultValue="dados">
        <TabList aria-label="Seções do fornecedor">
          <Tab value="dados">Dados</Tab>
          <Tab value="docs">Documentos</Tab>
          <Tab value="historico">Histórico</Tab>
        </TabList>
        <TabPanel value="dados">
          <DescriptionList
            columns={2}
            items={[
              { label: 'Código', value: f.id },
              { label: 'Situação', value: <Badge variant={sit.badge}>{sit.label}</Badge> },
              { label: f.tipo === 'pj' ? 'CNPJ' : 'CPF', value: f.documento },
              { label: 'Nome fantasia', value: f.tipo === 'pj' ? f.fantasia : '' },
              { label: 'Categoria', value: f.categoria },
              { label: 'E-mail', value: f.email },
              { label: 'Telefone', value: f.telefone },
              {
                label: 'Endereço',
                value: `${f.logradouro}, ${f.numero}${f.bairro ? ` · ${f.bairro}` : ''} · ${f.cidadeNome}/${f.uf} · CEP ${f.cep}`,
              },
              { label: 'Limite de compra', value: moeda.format(f.limite) },
              { label: 'Início do contrato', value: dataBr(f.contratoEm) },
              { label: 'Motivo da inativação', value: f.motivo },
              { label: 'Observações', value: f.obs },
            ]}
          />
        </TabPanel>
        <TabPanel value="docs">
          {f.documentos.length > 0 ? (
            <ul className="eds-stack eds-gap-2">
              {f.documentos.map((d) => (
                <li key={d.nome}>
                  {d.nome} <span className="cad-muted">({d.tamanho})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cad-muted">Nenhum documento enviado.</p>
          )}
        </TabPanel>
        <TabPanel value="historico">
          <Timeline
            items={f.historico.map((h, i) => ({
              id: `${h.data}-${i}`,
              title: h.titulo,
              time: `${dataBr(h.data)} ${h.hora}`,
              dateTime: `${h.data}T${h.hora}`,
              actor: `por ${h.autor}`,
              tone: h.tom,
            }))}
          />
        </TabPanel>
      </Tabs>
    </Shell>
  );
}
