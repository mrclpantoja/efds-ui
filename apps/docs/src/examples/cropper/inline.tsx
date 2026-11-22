import { useRef, useState } from 'react';
import { Button, ImageCropper, Stack, type ImageCropperHandle } from '@efds-ui/react';

export default function Inline() {
  const cropper = useRef<ImageCropperHandle>(null);
  const [result, setResult] = useState<string | null>(null);

  return (
    <Stack gap={3}>
      <ImageCropper
        ref={cropper}
        src="/img/retrato.svg"
        aspect={1}
        shape="circle"
        outputSize={128}
      />
      <Button
        variant="primary"
        onClick={async () => {
          const file = await cropper.current?.toFile('retrato');
          if (file) setResult(`${file.name}: ${file.type}, ${file.size} bytes`);
        }}
      >
        Gerar o arquivo
      </Button>
      {result ? <p role="status">{result}</p> : null}
    </Stack>
  );
}
