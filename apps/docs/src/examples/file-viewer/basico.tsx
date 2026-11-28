import { Button, FileViewer, Stack, useFileViewer, type ViewerItem } from '@efds-ui/react';

const anexos: ViewerItem[] = [
  {
    src: '/arquivos/relatorio-vistoria.pdf',
    name: 'Relatório de vistoria.pdf',
    type: 'application/pdf',
    size: 1260,
  },
  {
    src: '/arquivos/foto-obra.jpg',
    name: 'Foto da obra.jpg',
    type: 'image/jpeg',
    size: 36155,
  },
  {
    src: '/arquivos/video-vistoria.webm',
    name: 'Vídeo da vistoria.webm',
    type: 'video/webm',
  },
  { src: '/arquivos/audio-ata.wav', name: 'Áudio da reunião.wav', type: 'audio/wav' },
  {
    src: '/arquivos/resumo-vistoria.txt',
    name: 'Resumo da vistoria.txt',
    type: 'text/plain',
  },
  {
    src: '/arquivos/pacote-ficticio.zip',
    name: 'Pacote de documentos.zip',
    type: 'application/zip',
    size: 22,
  },
];

const rotulos = [
  'Relatório (PDF)',
  'Foto da obra',
  'Vídeo',
  'Áudio',
  'Resumo (texto)',
  'Pacote (ZIP)',
];

export default function Basico() {
  const viewer = useFileViewer();
  return (
    <>
      <Stack direction="row" wrap gap={3} align="start">
        {anexos.map((anexo, i) => (
          <Button key={anexo.src} variant="secondary" onClick={() => viewer.open(anexos, i)}>
            {rotulos[i]}
          </Button>
        ))}
      </Stack>
      <FileViewer {...viewer.viewerProps} />
    </>
  );
}
