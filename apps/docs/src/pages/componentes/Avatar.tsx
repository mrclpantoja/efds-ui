import { Alert } from '@efds-ui/react';
import { ClassTable } from '../../components/ClassTable';
import { Example } from '../../components/Example';
import { PropsTable } from '../../components/PropsTable';
import { Section } from '../../components/Section';
import { UseCases } from '../../components/UseCases';
import Basico from '../../examples/avatar/basico';
import basicoHtml from '../../examples/avatar/basico.html?raw';
import basicoSource from '../../examples/avatar/basico.tsx?raw';
import ComNome from '../../examples/avatar/com-nome';
import comNomeHtml from '../../examples/avatar/com-nome.html?raw';
import comNomeSource from '../../examples/avatar/com-nome.tsx?raw';
import Grupo from '../../examples/avatar/grupo';
import grupoHtml from '../../examples/avatar/grupo.html?raw';
import grupoSource from '../../examples/avatar/grupo.tsx?raw';
import Status from '../../examples/avatar/status';
import statusHtml from '../../examples/avatar/status.html?raw';
import statusSource from '../../examples/avatar/status.tsx?raw';
import Tamanhos from '../../examples/avatar/tamanhos';
import tamanhosHtml from '../../examples/avatar/tamanhos.html?raw';
import tamanhosSource from '../../examples/avatar/tamanhos.tsx?raw';

export default function AvatarPage() {
  return (
    <>
      <p className="eds-text-body-lg docs-muted">
        Monograma (as iniciais) ou foto de uma pessoa, em três tamanhos, com status opcional e um
        grupo que sobrepõe vários avatares. A cor vem do nome: a mesma pessoa tem sempre o mesmo
        tom.
      </p>

      <UseCases
        use={[
          'Para identificar o autor, o responsável ou o usuário logado em listas, cabeçalhos e comentários.',
          'No grupo (AvatarGroup), para mostrar quem participa sem ocupar a linha toda.',
        ]}
        avoid={[
          'Como único sinal de quem é a pessoa: o nome precisa estar acessível, no próprio avatar ou ao lado.',
          'Para logotipos de organizações ou ícones de objetos: o avatar é de pessoa.',
        ]}
      />

      <Section title="Exemplos">
        <Example
          title="Monogramas e tons"
          description="Seis tons com contraste AA nos cinco temas e nos dois modos. Sem classe de tom, o avatar é cinza suave."
          html={basicoHtml}
          react={{ Component: Basico, source: basicoSource }}
        />
        <Example
          title="Tamanhos"
          description="32, 40 (padrão) e 48 px. A forma segue o tema (data-shape); circle força o círculo."
          html={tamanhosHtml}
          react={{ Component: Tamanhos, source: tamanhosSource }}
        />
        <Example
          title="Com o nome ao lado"
          description="Quando o nome já está escrito, o avatar é decorativo (aria-hidden) e não o repete."
          html={comNomeHtml}
          react={{ Component: ComNome, source: comNomeSource }}
        />
        <Example
          title="Status"
          description="Online, ocupado, ausente e offline. A cor não é a única pista (ponto cheio, ponto com traço, anel vazio) e o status entra no nome acessível."
          html={statusHtml}
          react={{ Component: Status, source: statusSource }}
        />
        <Example
          title="Grupo"
          description="role=group com nome. O excedente vira um avatar “+N” chamado “Mais N pessoas”."
          html={grupoHtml}
          react={{ Component: Grupo, source: grupoSource }}
        />
      </Section>

      <Section title="HTML puro">
        <Alert variant="info" title="Tom pelo nome, sem escrever a classe">
          <p>
            No HTML você pode escrever <code>eds-avatar-tone-1</code> a <code>6</code> à mão. Com o{' '}
            <a href="#/comecar/comportamento">@efds-ui/behavior</a>, um <code>.eds-avatar</code> sem
            classe de tom recebe a certa pelo nome (<code>data-name</code>, <code>aria-label</code>{' '}
            ou o texto): hash do nome sem acento nem caixa, módulo 6, mais 1. Com{' '}
            <code>data-name</code> e o avatar vazio, o JS escreve as iniciais e dá{' '}
            <code>role=&quot;img&quot;</code> com o nome. Quem já definiu o tom (classe ou{' '}
            <code>data-eds-tone</code>) não é alterado. O React usa o mesmo algoritmo, então a cor
            coincide nos dois.
          </p>
        </Alert>
      </Section>

      <Section title="API React">
        <PropsTable
          caption="Props de Avatar"
          rows={[
            {
              name: 'name',
              type: 'string',
              required: true,
              description: 'Nome da pessoa: iniciais, nome acessível e tom.',
            },
            {
              name: 'src',
              type: 'string',
              description: 'Foto, decorativa (alt vazio). Se não carregar, valem as iniciais.',
            },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho (ou o do AvatarGroup).',
            },
            {
              name: 'status',
              type: "'online' | 'busy' | 'away' | 'offline'",
              description: 'Situação; entra também no nome acessível.',
            },
            {
              name: 'tone',
              type: '1 | 2 | 3 | 4 | 5 | 6',
              description: 'Força o tom; sem isso vem do nome.',
            },
            {
              name: 'circle',
              type: 'boolean',
              default: 'false',
              description: 'Círculo em vez da forma do tema.',
            },
            {
              name: 'decorative',
              type: 'boolean',
              default: 'false',
              description: 'Nome já escrito ao lado: aria-hidden, sem role.',
            },
            {
              name: 'texts',
              type: '{ online, busy, away, offline }',
              description: 'Textos do status (pt-BR por padrão).',
            },
          ]}
        />
        <PropsTable
          caption="Props de AvatarGroup"
          rows={[
            { name: 'aria-label', type: 'string', required: true, description: 'Nome do grupo.' },
            { name: 'max', type: 'number', description: 'Quantos mostrar; o resto vira “+N”.' },
            {
              name: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tamanho dos avatares sem size próprio.',
            },
            {
              name: 'texts',
              type: '{ more(count) }',
              description: 'Nome do “+N” (padrão: “Mais 3 pessoas”).',
            },
          ]}
        />
      </Section>

      <Section title="Classes CSS">
        <ClassTable
          caption="Classes do Avatar"
          rows={[
            { name: '.eds-avatar', effect: 'O avatar (40 px). Sem tom: cinza suave.' },
            { name: '.eds-avatar-sm / -lg', effect: '32 e 48 px.' },
            { name: '.eds-avatar-circle', effect: 'Força o círculo.' },
            {
              name: '.eds-avatar-tone-1 … 6',
              effect: 'Tons: ação, sucesso, atenção, perigo, informação, neutro sólido.',
            },
            {
              name: '.eds-avatar-status[data-status]',
              effect: 'online, busy, away ou offline, dentro do avatar.',
            },
            {
              name: '.eds-avatar-group',
              effect: 'Avatares sobrepostos (role=group com aria-label).',
            },
            { name: '.eds-avatar-more', effect: 'O “+N” do grupo.' },
          ]}
        />
      </Section>

      <Section title="Acessibilidade">
        <ul className="docs-list">
          <li>
            <strong>Nome:</strong> o avatar com <code>role=&quot;img&quot;</code> leva o nome (e o
            status) em <code>aria-label</code>; as iniciais são decorativas.
          </li>
          <li>
            <strong>Cor nunca sozinha:</strong> as iniciais identificam; o status tem forma própria
            além da cor.
          </li>
          <li>
            <strong>Contraste:</strong> todos os tons passam AA (4,5:1) nos cinco temas e nos dois
            modos.
          </li>
        </ul>
      </Section>
    </>
  );
}
