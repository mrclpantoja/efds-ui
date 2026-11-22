import { Editor } from '@efds-ui/editor/react';
import { Button } from '@efds-ui/react';

export default function Estados() {
  return (
    <div className="eds-stack eds-gap-6">
      {/* required: aria-required no conteúdo; com name, o envio vazio é bloqueado com erro visível. */}
      <form className="eds-stack eds-gap-3" onSubmit={(event) => event.preventDefault()}>
        <Editor label="Resumo (obrigatório)" name="resumo" rows={3} required />
        <div>
          <Button type="submit" variant="secondary">
            Enviar
          </Button>
        </div>
      </form>
      <div>
        <Editor label="Justificativa" rows={4} invalid aria-describedby="editor-erro-msg" />
        <p className="eds-error" id="editor-erro-msg">
          Informe a justificativa.
        </p>
      </div>
      <Editor
        label="Parecer (somente leitura)"
        rows={4}
        readOnly
        defaultValue="<p>Parecer aprovado em reunião. Sem a barra, o texto segue selecionável.</p>"
      />
      <Editor
        label="Observações (desabilitado)"
        rows={3}
        disabled
        defaultValue="<p>Campo indisponível.</p>"
      />
    </div>
  );
}
