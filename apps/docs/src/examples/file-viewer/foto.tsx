import { Button, FileViewer, useFileViewer } from '@efds-ui/react';

export default function Foto() {
  const viewer = useFileViewer();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() =>
          viewer.open([
            { src: '/arquivos/foto-obra.jpg', name: 'Fachada norte.jpg', type: 'image/jpeg' },
          ])
        }
      >
        Ver fachada norte
      </Button>
      <FileViewer {...viewer.viewerProps} />
    </>
  );
}
