import { useState } from 'react';
import { Button, FileViewer, Stack, useFileViewer, type ViewerItem } from '@efds-ui/react';

const anexos: ViewerItem[] = [
  {
    src: '/arquivos/relatorio-vistoria.pdf',
    name: 'Relatório de vistoria.pdf',
    type: 'application/pdf',
  },
  { src: '/arquivos/foto-obra.jpg', name: 'Foto da obra.jpg', type: 'image/jpeg' },
  { src: '/arquivos/resumo-vistoria.txt', name: 'Resumo da vistoria.txt', type: 'text/plain' },
];

export default function Acoes() {
  const viewer = useFileViewer();
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});
  const decidir = (item: ViewerItem, decisao: string) =>
    setDecisoes((atual) => ({ ...atual, [item.name]: decisao }));

  return (
    <Stack gap={3} align="start">
      <Button variant="secondary" onClick={() => viewer.open(anexos)}>
        Revisar anexos
      </Button>
      <p>
        {Object.keys(decisoes).length === 0
          ? 'Nenhuma decisão registrada.'
          : Object.entries(decisoes)
              .map(([nome, decisao]) => `${nome}: ${decisao}`)
              .join(' · ')}
      </p>
      <FileViewer
        {...viewer.viewerProps}
        actions={(item) => (
          <>
            <Button variant="primary" onClick={() => decidir(item, 'aprovado')}>
              Aprovar
            </Button>
            <Button variant="danger" onClick={() => decidir(item, 'recusado')}>
              Recusar
            </Button>
          </>
        )}
      />
    </Stack>
  );
}
