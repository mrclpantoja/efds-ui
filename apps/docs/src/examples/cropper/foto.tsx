import { useState } from 'react';
import { AvatarUpload } from '@efds-ui/react';

export default function Foto() {
  const [info, setInfo] = useState('Nenhuma foto nova.');
  return (
    <form>
      <AvatarUpload
        personName="Ana Exemplo"
        name="foto"
        outputSize={256}
        onValueChange={(file) => setInfo(`${file.name}: ${Math.round(file.size / 1024)} KB`)}
      />
      <p className="eds-helper" role="status">
        {info}
      </p>
    </form>
  );
}
