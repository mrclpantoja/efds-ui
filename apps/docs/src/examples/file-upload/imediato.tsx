import { Field, FileUpload, type FileUploadUploadOptions } from '@eds-ui/react';

/**
 * Upload simulado: não há servidor. Em produção, `enviar` faria um fetch/XHR ao seu endpoint e
 * devolveria o `id` do JSON da resposta. Arquivos com "erro" no nome falham na primeira tentativa,
 * para você ver o "Tentar de novo".
 */
const tentativas = new Map<string, number>();

function enviar(
  file: File,
  { onProgress, signal }: FileUploadUploadOptions,
): Promise<{ id: string }> {
  const tentativa = (tentativas.get(file.name) ?? 0) + 1;
  tentativas.set(file.name, tentativa);
  return new Promise((resolve, reject) => {
    let percent = 0;
    const timer = window.setInterval(() => {
      percent += 10;
      onProgress(percent);
      if (percent === 60 && file.name.includes('erro') && tentativa === 1) {
        window.clearInterval(timer);
        reject(new Error('Falha simulada'));
      } else if (percent >= 100) {
        window.clearInterval(timer);
        resolve({ id: `arq-${file.size}-${tentativa}` });
      }
    }, 250);
    // Remover o arquivo durante o envio aborta: cancele a requisição.
    signal.addEventListener('abort', () => {
      window.clearInterval(timer);
      reject(new DOMException('Cancelado', 'AbortError'));
    });
  });
}

export default function Imediato() {
  return (
    <Field label="Anexos do processo">
      <FileUpload
        name="anexos[]"
        multiple
        maxSize={5 * 1024 * 1024}
        hint="Qualquer tipo, até 5 MB cada. Um nome com “erro” falha na 1ª tentativa."
        upload={enviar}
      />
    </Field>
  );
}
