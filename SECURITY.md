# Política de segurança

## Versões que recebem correção de segurança

| Versão                     | Suporte                                                      |
| -------------------------- | ------------------------------------------------------------ |
| Maior atual (1.x)          | Correções de segurança e de defeitos                         |
| Maior anterior             | Só correções de segurança, por 6 meses após a maior seguinte |
| Versões 0.x e mais antigas | Sem suporte                                                  |

Detalhes em [Políticas](https://efds-ui.com.br/comecar/politicas).

## Como relatar uma vulnerabilidade

**Não abra uma issue pública.** Use o relato privado do GitHub:

1. Abra [github.com/mrclpantoja/efds-ui/security/advisories/new](https://github.com/mrclpantoja/efds-ui/security/advisories/new) (aba **Security**, botão **Report a vulnerability**).
2. Descreva o problema: pacote e versão afetados, passos para reproduzir, o impacto e, se tiver, uma sugestão de correção.
3. Use apenas dados fictícios no relato. Não envie dados pessoais nem credenciais reais.

## O que esperar

Prazos propostos (boa-fé, sem contrato):

- **Confirmação de recebimento:** até 3 dias úteis.
- **Avaliação inicial** (se procede e qual a gravidade): até 10 dias úteis.
- **Correção de falhas confirmadas:** o prazo depende da gravidade. Falhas críticas e altas são tratadas primeiro, e o relato é atualizado a cada etapa.
- **Divulgação:** combinada com quem relatou, depois que a versão corrigida estiver publicada no npm. Quem relatou é citado no aviso, se quiser.

## O que está no escopo

- Os pacotes publicados `@efds-ui/core`, `@efds-ui/themes`, `@efds-ui/icons`, `@efds-ui/behavior`, `@efds-ui/react` e `@efds-ui/editor`.
- Falhas como XSS (HTML ou atributos inseridos sem tratamento), execução de código a partir de dados do usuário e problemas na cadeia de publicação (por exemplo, pacote com conteúdo inesperado).

Fora do escopo: uso incorreto da biblioteca; problemas já conhecidos em dependências de terceiros (relate ao projeto de origem); ataques que exigem acesso físico ou navegador já comprometido; e o HTML do editor sem a limpeza no servidor (a documentação pede que o servidor sanitize o conteúdo antes de gravar e exibir).

## Integridade dos pacotes

Os pacotes saem do GitHub Actions com proveniência (SLSA) e aprovação manual com 2FA no npm. Para os arquivos por CDN, a documentação traz os hashes de integridade (SRI): [Instalação](https://efds-ui.com.br/comecar/instalacao).
