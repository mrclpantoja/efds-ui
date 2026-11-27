import { Alert } from '@efds-ui/react';
import { CodeBlock } from '../../components/CodeBlock';
import { Section } from '../../components/Section';
import { toHref } from '../../router';

// Receitas só em código: o efDS.ui não depende de React Hook Form nem de Zod. Dados fictícios.

const rhf = `import { useForm } from 'react-hook-form';
import { Button, ErrorSummary, Field, Input, isCpf } from '@efds-ui/react';

type Cadastro = { nome: string; cpf: string };

export function CadastroRhf() {
  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<Cadastro>({ shouldFocusError: false });

  // O resumo recebe a lista: id do campo (o link leva o foco a ele), rótulo e mensagem.
  const resumo = [
    errors.nome && { id: 'rhf-nome', label: 'Nome', message: errors.nome.message ?? '' },
    errors.cpf && { id: 'rhf-cpf', label: 'CPF', message: errors.cpf.message ?? '' },
  ].filter((item) => !!item);

  return (
    <form noValidate onSubmit={handleSubmit(salvar)} className="eds-stack eds-gap-4">
      {/* focusKey muda a cada envio recusado: o foco volta ao resumo. */}
      <ErrorSummary errors={resumo} focusKey={submitCount} />
      <Field label="Nome" required controlId="rhf-nome" error={errors.nome?.message}>
        <Input {...register('nome', { required: 'Informe o nome.' })} />
      </Field>
      <Field label="CPF" required controlId="rhf-cpf" error={errors.cpf?.message}>
        <Input
          mask="cpf"
          {...register('cpf', {
            required: 'Informe o CPF.',
            validate: (valor) => isCpf(valor) || 'Informe um CPF válido.',
          })}
        />
      </Field>
      <div>
        <Button type="submit" variant="primary">Salvar</Button>
      </div>
    </form>
  );
}`;

const zod = `import { z } from 'zod';
import { isCnpj, isCpf, type ErrorSummaryItem } from '@efds-ui/react';

// Os validadores do efDS.ui entram no schema por refine: a regra é a mesma do HTML.
export const fornecedor = z.object({
  razaoSocial: z.string().min(3, 'Informe a razão social.'),
  cnpj: z.string().refine(isCnpj, 'Informe um CNPJ válido.'),
  responsavelCpf: z.string().refine(isCpf, 'Informe um CPF válido.'),
});

const rotulos: Record<string, string> = {
  razaoSocial: 'Razão social',
  cnpj: 'CNPJ',
  responsavelCpf: 'CPF do responsável',
};

// Converte os problemas do Zod na lista do ErrorSummary (o id do campo é "fornecedor-" + nome).
export function paraResumo(erro: z.ZodError): ErrorSummaryItem[] {
  return erro.issues.map((problema) => {
    const nome = String(problema.path[0]);
    return { id: 'fornecedor-' + nome, label: rotulos[nome] ?? nome, message: problema.message };
  });
}

// Com React Hook Form: useForm({ resolver: zodResolver(fornecedor) }) e a receita acima.
// Sem ele: fornecedor.safeParse(dados) no envio; se !success, guarde paraResumo(resultado.error)
// no estado, passe ao ErrorSummary e a mensagem de cada campo ao Field (prop error).`;

const servidorHtml = `<!-- O servidor recusou o envio e devolve a mesma página: resumo visível no topo (sem hidden), erro junto
     do campo e o valor digitado preservado. Os ids dos links são os dos campos. O resumo é estático (sem
     data-eds-error-summary): o behavior montaria a lista pela validade do navegador e não conhece o erro
     que só o servidor detecta. A validação no navegador dos campos continua funcionando. -->
<form class="eds-stack eds-gap-4" action="/fornecedores" method="post" data-eds-validate-form>
  <div class="eds-error-summary" tabindex="-1" aria-labelledby="resumo-titulo" autofocus>
    <h2 class="eds-error-summary-title" id="resumo-titulo">Corrija 1 campo</h2>
    <ul class="eds-error-summary-list">
      <li><a href="#cnpj">CNPJ: já existe um fornecedor com este CNPJ.</a></li>
    </ul>
  </div>
  <div class="eds-field">
    <label class="eds-label" for="cnpj" data-required>CNPJ</label>
    <input class="eds-input" id="cnpj" name="cnpj" value="12.ABC.345/01DE-35" required
           data-eds-mask="cnpj" data-eds-validate="cnpj" aria-invalid="true" aria-describedby="cnpj-erro" />
    <p class="eds-error" id="cnpj-erro">Já existe um fornecedor com este CNPJ.</p>
  </div>
  <div><button class="eds-button eds-button-primary" type="submit">Salvar</button></div>
</form>`;

const laravel = `{{-- Laravel (Blade): $errors vem da validação do FormRequest. --}}
@if ($errors->any())
  <div class="eds-error-summary" tabindex="-1" aria-labelledby="resumo-titulo" autofocus>
    <h2 class="eds-error-summary-title" id="resumo-titulo">
      {{ $errors->count() === 1 ? 'Corrija 1 campo' : 'Corrija ' . $errors->count() . ' campos' }}
    </h2>
    <ul class="eds-error-summary-list">
      @foreach ($errors->keys() as $campo)
        <li><a href="#{{ $campo }}">{{ __('campos.' . $campo) }}: {{ $errors->first($campo) }}</a></li>
      @endforeach
    </ul>
  </div>
@endif

<input class="eds-input" id="cnpj" name="cnpj" value="{{ old('cnpj') }}"
       @error('cnpj') aria-invalid="true" aria-describedby="cnpj-erro" @enderror />
@error('cnpj') <p class="eds-error" id="cnpj-erro">{{ $message }}</p> @enderror`;

const spring = `<!-- Spring MVC (Thymeleaf): o BindingResult do @Valid fica disponível no formulário. -->
<div th:if="\${#fields.hasErrors('*')}" class="eds-error-summary"
     tabindex="-1" aria-labelledby="resumo-titulo" autofocus>
  <h2 class="eds-error-summary-title" id="resumo-titulo"
      th:text="\${#fields.errors('*').size() == 1} ? 'Corrija 1 campo' : |Corrija \${#fields.errors('*').size()} campos|"></h2>
  <ul class="eds-error-summary-list">
    <li th:each="erro : \${#fields.detailedErrors()}">
      <a th:href="|#\${erro.fieldName}|" th:text="|\${erro.fieldName}: \${erro.message}|"></a>
    </li>
  </ul>
</div>

<input class="eds-input" th:field="*{cnpj}"
       th:attr="aria-invalid=\${#fields.hasErrors('cnpj')} ? 'true' : null,
                aria-describedby=\${#fields.hasErrors('cnpj')} ? 'cnpj-erro' : null" />
<p class="eds-error" id="cnpj-erro" th:if="\${#fields.hasErrors('cnpj')}" th:errors="*{cnpj}"></p>`;

const aspnet = `@* ASP.NET Core (Razor): o ModelState traz os erros das DataAnnotations e do seu validador. *@
@if (!ViewData.ModelState.IsValid)
{
  var erros = ViewData.ModelState.Where(e => e.Value!.Errors.Count > 0).ToList();
  <div class="eds-error-summary" tabindex="-1" aria-labelledby="resumo-titulo" autofocus>
    <h2 class="eds-error-summary-title" id="resumo-titulo">
      @(erros.Count == 1 ? "Corrija 1 campo" : $"Corrija {erros.Count} campos")
    </h2>
    <ul class="eds-error-summary-list">
      @foreach (var (campo, estado) in erros)
      {
        <li><a href="#@campo">@campo: @estado.Errors[0].ErrorMessage</a></li>
      }
    </ul>
  </div>
}

<input class="eds-input" asp-for="Cnpj" aria-describedby="Cnpj-erro" />
<span class="eds-error" id="Cnpj-erro" asp-validation-for="Cnpj"></span>`;

export default function ReceitasPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Como usar a <a href={toHref('/comecar/validacao')}>validação</a> e o{' '}
        <a href={toHref('/componentes/error-summary')}>resumo de erros</a> do efDS.ui com React Hook
        Form, Zod e a validação do servidor (Laravel, Spring, ASP.NET). São receitas: o efDS.ui não
        depende de nenhuma dessas bibliotecas, e os exemplos usam dados fictícios.
      </p>

      <Alert tone="info" title="O servidor sempre valida de novo">
        A validação no navegador é conveniência: ela evita a ida e volta, mas qualquer pessoa pode
        enviar dados sem passar por ela. Repita as regras no servidor (os validadores do efDS.ui são
        JavaScript; no PHP, Java ou C#, use a regra equivalente da sua plataforma).
      </Alert>

      <Section title="React Hook Form">
        <p>
          Use <code>noValidate</code> no formulário e deixe o React Hook Form decidir os erros; os
          validadores do efDS.ui entram em <code>validate</code>. O <code>Field</code> mostra a
          mensagem e liga <code>aria-invalid</code>; o <code>ErrorSummary</code> recebe a lista e
          leva o foco ao topo a cada envio recusado. Não combine com <code>useFormValidation</code>{' '}
          no mesmo formulário: escolha um dos dois.
        </p>
        <CodeBlock code={rhf} label="Código TSX: React Hook Form com ErrorSummary" />
      </Section>

      <Section title="Zod">
        <p>
          Os validadores do efDS.ui são funções <code>(valor) =&gt; boolean</code>, então entram em
          um schema por <code>refine</code>. A função <code>paraResumo</code> converte os problemas
          do Zod na lista do <code>ErrorSummary</code>.
        </p>
        <CodeBlock code={zod} label="Código TypeScript: schema Zod e lista do resumo" />
      </Section>

      <Section title="Validação no servidor">
        <p>
          Quando o servidor recusa o envio, devolva a mesma página com o resumo já visível (sem{' '}
          <code>hidden</code>), o erro junto de cada campo e os valores preservados. Esse resumo é
          estático (sem <code>data-eds-error-summary</code>): o behavior monta a lista pela validade
          do navegador e não conhece o erro que só o servidor detecta (como “CNPJ já cadastrado”).
          Funciona igual sem JavaScript, e o <code>autofocus</code> leva o foco a ele no
          carregamento.
        </p>
        <CodeBlock code={servidorHtml} label="Código HTML: página devolvida pelo servidor" />
        <CodeBlock code={laravel} label="Código Blade: Laravel" />
        <CodeBlock code={spring} label="Código Thymeleaf: Spring MVC" />
        <CodeBlock code={aspnet} label="Código Razor: ASP.NET Core" />
        <p>
          Nos três casos, troque o nome técnico do campo pelo rótulo que a pessoa vê (ex.:{' '}
          <code>cnpj</code> → “CNPJ”), como no exemplo do Laravel. Para envio por <code>fetch</code>
          , veja o <a href={toHref('/componentes/form-submit')}>estado de envio</a>: o evento{' '}
          <code>eds:form-error</code> traz a resposta do servidor em <code>detail.response</code>.
        </p>
      </Section>
    </>
  );
}
