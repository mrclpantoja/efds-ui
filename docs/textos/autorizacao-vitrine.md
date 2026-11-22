# Autorização para a vitrine "Quem usa"

Textos para o formulário de download dos templates e para o formulário "Envie seu projeto" do site. Versão do texto: **v1 (22/11/2026)**. Toda alteração de texto gera uma versão nova; o registro guarda a versão aceita.

## Regras

- A caixa de autorização fica **desmarcada por padrão** e **separada** do aceite da licença.
- Baixar o template **não depende** dessa autorização.
- Marcar a caixa autoriza só o **contato**. Nada é publicado sem a confirmação do item 2, feita por quem responde pelo sistema.
- A pessoa pode retirar a autorização a qualquer momento, e o projeto sai da vitrine em até 5 dias úteis.

## 1. No formulário de download

**Rótulo da caixa (desmarcada):**

> Autorizo a Innovation Tech a entrar em contato pelo e-mail informado para convidar este projeto a aparecer na página "Quem usa" do efDS.ui. Nada será publicado sem a minha confirmação.

**Texto de apoio (abaixo da caixa, ligado por `aria-describedby`):**

> Opcional. Não interfere no download nem na licença. Você pode retirar a autorização quando quiser.

## 2. Confirmação antes de publicar

Enviada por e-mail a quem autorizou o contato. A publicação só acontece com todos os itens marcados.

**Assunto:** Convite para a vitrine "Quem usa" do efDS.ui

> Olá! Você autorizou nosso contato ao baixar um template do efDS.ui. Se quiser que o seu projeto apareça na página "Quem usa" (https://efds-ui.com.br/#/comecar/quem-usa), responda com as informações abaixo ou preencha o formulário do link.
>
> - Nome do projeto ou sistema
> - Organização responsável (empresa ou órgão)
> - Endereço público (URL), se houver
> - Descrição curta (até 140 caracteres)
> - Logo ou captura de tela (opcional)
>
> Se não quiser participar, basta ignorar este e-mail.

**Caixas do formulário de confirmação (todas obrigatórias para publicar):**

- [ ] Sou responsável por este sistema ou tenho autorização da organização responsável para divulgá-lo.
- [ ] Autorizo a publicação do nome do projeto, da organização, da URL, da descrição e da imagem enviados na página "Quem usa" do efDS.ui e em materiais de divulgação do efDS.ui.
- [ ] Entendo que posso pedir a retirada a qualquer momento.

**Órgão público:** a confirmação vem de servidor com competência para autorizar a divulgação, por exemplo a área de comunicação ou de TI do órgão. Na dúvida, não publicar.

## 3. Retirada

**Texto na página "Quem usa" e no rodapé dos e-mails:**

> Para retirar um projeto da vitrine, escreva pelo canal de contato da Innovation Tech informando o nome do projeto. A retirada é feita em até 5 dias úteis.

## 4. O que registrar (LGPD)

Guardar o mínimo, para comprovar o consentimento:

| Campo           | Exemplo                                     |
| --------------- | ------------------------------------------- |
| `licenseId`     | id do arquivo de licença do download        |
| `email`         | e-mail de quem autorizou o contato          |
| `consentimento` | `contato` (item 1) ou `publicacao` (item 2) |
| `versaoTexto`   | `v1`                                        |
| `aceitoEm`      | data e hora (UTC)                           |
| `retiradoEm`    | vazio até a retirada                        |

Não registrar IP nem dados de navegação. Base legal: consentimento (art. 7º, I, da LGPD), específico para esta finalidade. Apagar o e-mail se o contato não resultar em publicação em até 12 meses.

## 5. Antes de publicar

- Abrir a URL e conferir se o sistema está no ar e se o conteúdo é adequado.
- Não usar captura de tela com dados de pessoas reais.
- Usar a logo do cliente só com a autorização do item 2.
