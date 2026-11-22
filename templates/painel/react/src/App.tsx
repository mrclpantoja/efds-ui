import { useEffect, useState } from 'react';
import { DialogProvider, SessionTimeout, ToastProvider, useToast } from '@efds-ui/react';
import { notificacoesIniciais } from './data';
import { lerPreferencias } from './preferencias';
import { estadoShell, type Rota, type ShellBaseProps } from './Shell';
import { Configuracoes } from './screens/Configuracoes';
import { Inicio } from './screens/Inicio';
import { NaoEncontrada } from './screens/NaoEncontrada';
import { Notificacoes } from './screens/Notificacoes';
import { Perfil } from './screens/Perfil';

/** Roteamento por hash, sem biblioteca: #/, #/notificacoes, #/perfil, #/configuracoes. */
const rotas: Record<string, Rota> = {
  '': 'inicio',
  '#': 'inicio',
  '#/': 'inicio',
  '#/notificacoes': 'notificacoes',
  '#/perfil': 'perfil',
  '#/configuracoes': 'configuracoes',
};

const rotaAtual = (): Rota => rotas[location.hash] ?? 'nao-encontrada';

function Rotas() {
  const toast = useToast();
  const [rota, setRota] = useState(rotaAtual);
  const [notificacoes, setNotificacoes] = useState(notificacoesIniciais);
  const [sessao, setSessao] = useState(() => lerPreferencias().sessao);

  useEffect(() => {
    const aoNavegar = () => {
      estadoShell.navegou = true;
      setRota(rotaAtual());
    };
    window.addEventListener('hashchange', aoNavegar);
    return () => window.removeEventListener('hashchange', aoNavegar);
  }, []);

  const base: ShellBaseProps = {
    notificacoes,
    onLer: (id) =>
      setNotificacoes((lista) => lista.map((n) => (n.id === id ? { ...n, unread: false } : n))),
    onLerTodas: () => setNotificacoes((lista) => lista.map((n) => ({ ...n, unread: false }))),
  };

  return (
    <>
      {rota === 'inicio' && <Inicio {...base} />}
      {rota === 'notificacoes' && <Notificacoes {...base} />}
      {rota === 'perfil' && <Perfil {...base} />}
      {rota === 'configuracoes' && (
        <Configuracoes {...base} sessao={sessao} onSessaoChange={setSessao} />
      )}
      {rota === 'nao-encontrada' && <NaoEncontrada {...base} />}
      {sessao > 0 && (
        <SessionTimeout
          key={sessao}
          timeout={sessao * 60}
          warnBefore={60}
          storageKey="painel-sessao"
          onExpire={() =>
            // Num sistema real, aqui vai a saída (ex.: location.assign('/sair')).
            toast.show({
              variant: 'warning',
              message:
                'Sessão encerrada por inatividade. Num sistema real, você voltaria à tela de entrada.',
            })
          }
        />
      )}
    </>
  );
}

export function App() {
  return (
    <ToastProvider>
      <DialogProvider>
        <Rotas />
      </DialogProvider>
    </ToastProvider>
  );
}
