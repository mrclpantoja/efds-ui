import { useRef, useState, type MouseEvent } from 'react';
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  IconDisc,
  SegmentedControl,
} from '@efds-ui/react';
import { caminhos, Shell, type ShellBaseProps } from '../Shell';

const filtros = [
  { value: 'todas', label: 'Todas' },
  { value: 'nao-lidas', label: 'Não lidas' },
  { value: 'lidas', label: 'Lidas' },
] as const;

/** Item escondido pelo filtro (o CSS usa :has com o rádio marcado). */
const oculto = (el: Element) => (el as HTMLElement).offsetParent === null;

/**
 * Caixa de entrada: o filtro esconde itens só com CSS (mesmo arquivo da versão HTML); aqui fica
 * o estado de leitura e o cuidado de não perder o foco quando o item lido sai do filtro.
 */
export function Notificacoes(props: ShellBaseProps) {
  const { notificacoes, onLer, onLerTodas } = props;
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [aviso, setAviso] = useState('');
  const naoLidas = notificacoes.filter((n) => n.unread).length;

  /** Depois do React aplicar a mudança: se o foco ficou num item escondido, vai ao próximo visível. */
  const manterFoco = (item: Element | null) => {
    setTimeout(() => {
      const ativo = document.activeElement;
      if (
        ativo &&
        ativo !== document.body &&
        !(ativo as HTMLButtonElement).disabled &&
        !oculto(ativo)
      )
        return;
      let proximo = item?.nextElementSibling;
      while (proximo && oculto(proximo)) proximo = proximo.nextElementSibling;
      const alvo = proximo?.querySelector<HTMLElement>('button') ?? tituloRef.current;
      if (alvo === tituloRef.current && tituloRef.current) tituloRef.current.tabIndex = -1;
      alvo?.focus();
    }, 0);
  };

  const ler = (event: MouseEvent<HTMLButtonElement>, id: string, unread: boolean) => {
    if (!unread) return;
    onLer(id);
    manterFoco(event.currentTarget.closest('li'));
  };

  return (
    <Shell
      {...props}
      rota="notificacoes"
      titulo="Notificações"
      descricao="Avisos do sistema e das unidades que você administra."
      trilha={[{ label: 'Início', href: caminhos.inicio }, { label: 'Notificações' }]}
      largura="lg"
    >
      <Card className="pn-inbox" role="region" aria-labelledby="not-caixa-t">
        <CardHeader>
          <CardTitle level={2} id="not-caixa-t" ref={tituloRef}>
            Caixa de entrada
          </CardTitle>
          <CardActions>
            <Button
              variant="ghost"
              size="sm"
              disabled={naoLidas === 0}
              onClick={() => {
                onLerTodas();
                setAviso('Todas as notificações foram marcadas como lidas.');
                manterFoco(null);
              }}
            >
              Marcar todas como lidas
            </Button>
          </CardActions>
        </CardHeader>
        <CardBody className="eds-stack eds-gap-3">
          <SegmentedControl legend="Mostrar" name="filtro" defaultValue="todas" options={filtros} />
          <p className="eds-text-small pn-muted">
            Selecione uma notificação não lida para marcá-la como lida.
          </p>
        </CardBody>
        <ul className="eds-notifications-list" aria-labelledby="not-caixa-t">
          {notificacoes.map((n) => (
            <li key={n.id} className="eds-notification" data-unread={n.unread || undefined}>
              <button
                type="button"
                className="eds-notification-link"
                onClick={(event) => ler(event, n.id, n.unread)}
              >
                <span className="eds-notification-dot" aria-hidden="true" />
                <IconDisc size="sm" tone={n.tom}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    focusable="false"
                    aria-hidden="true"
                  >
                    <path d={n.icone} />
                  </svg>
                </IconDisc>
                <span className="eds-notification-body">
                  <span className="eds-notification-status">Não lida</span>
                  <span className="eds-notification-title">{n.title}</span>
                  {n.text ? <span className="eds-notification-text">{n.text}</span> : null}
                  <time className="eds-notification-time" dateTime={n.dateTime}>
                    {n.time}
                  </time>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="pn-inbox-none">Nenhuma notificação neste filtro.</p>
        <span className="eds-visually-hidden" role="status">
          {aviso}
        </span>
      </Card>
    </Shell>
  );
}
