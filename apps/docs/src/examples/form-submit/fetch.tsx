import { Button, Field, Input, Stack, useSubmit } from '@efds-ui/react';

export default function Fetch() {
  // `edsLoader: false`: o botão já mostra o envio; sem isso o PageLoader automático bloquearia a página.
  const submit = useSubmit(async (data, event) => {
    const post =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('formmethod') === 'post';
    const query = new URLSearchParams(data as unknown as Record<string, string>).toString();
    const response = await fetch(post ? '/favicon.svg' : `/favicon.svg?${query}`, {
      method: post ? 'POST' : 'GET',
      body: post ? data : undefined,
      edsLoader: false,
    } as RequestInit);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  });

  return (
    <form onSubmit={submit.handleSubmit}>
      <Stack gap={4}>
        <Field label="Observação">
          <Input name="obs" defaultValue="Teste" />
        </Field>
        <Stack direction="row" wrap gap={3}>
          <Button type="submit" variant="primary" {...submit.buttonProps}>
            Enviar
          </Button>
          <Button type="submit" formMethod="post" aria-disabled={submit.busy || undefined}>
            Enviar e falhar
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
