import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { avatarInitials, avatarTone } from '../../internal/avatar-tone';
import { Avatar, AvatarGroup } from '.';

describe('Avatar', () => {
  it('o tom e as iniciais seguem o mesmo algoritmo do behavior', () => {
    expect(
      ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Dario', 'Eva Costa', 'Fábio'].map(avatarTone),
    ).toEqual([6, 1, 6, 3, 6, 3]);
    expect(avatarTone('José')).toBe(avatarTone('jose'));
    expect(avatarInitials('Ana Souza')).toBe('AS');
    expect(avatarInitials('Dario')).toBe('DA');
    expect(avatarInitials('Álvaro')).toBe('ÁL');
  });

  it('é uma imagem nomeada, com iniciais, tom e tamanho', () => {
    render(<Avatar name="Ana Souza" size="lg" round />);
    const el = screen.getByRole('img', { name: 'Ana Souza' });
    expect(el).toHaveTextContent('AS');
    expect(el).toHaveClass('eds-avatar', 'eds-avatar-lg', 'eds-avatar-round', 'eds-avatar-tone-6');
  });

  it('tom forçado, foto decorativa e status no nome', () => {
    render(<Avatar name="Bruno Lima" tone={2} src="/x.png" status="busy" />);
    const el = screen.getByRole('img', { name: 'Bruno Lima, ocupado' });
    expect(el).toHaveClass('eds-avatar-tone-2');
    expect(el.querySelector('img')).toHaveAttribute('alt', '');
    expect(el.querySelector('.eds-avatar-status')).toHaveAttribute('data-status', 'busy');
  });

  it('decorativo sai da árvore de acessibilidade', () => {
    const { container } = render(<Avatar name="Ana Souza" decorative status="online" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).not.toHaveAttribute('role');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('textos do status são substituíveis', () => {
    render(<Avatar name="Ana" status="away" texts={{ away: 'away' }} />);
    expect(screen.getByRole('img', { name: 'Ana, away' })).toBeInTheDocument();
  });

  it('AvatarGroup: limita, cria o "+N" nomeado e repassa o tamanho', () => {
    render(
      <AvatarGroup aria-label="Responsáveis" max={2} size="sm">
        <Avatar name="Ana Souza" />
        <Avatar name="Bruno Lima" />
        <Avatar name="Carla Dias" />
        <Avatar name="Dario Reis" />
      </AvatarGroup>,
    );
    const group = screen.getByRole('group', { name: 'Responsáveis' });
    expect(group).toHaveClass('eds-avatar-group');
    expect(group.querySelectorAll('.eds-avatar:not(.eds-avatar-more)')).toHaveLength(2);
    expect(group.querySelector('.eds-avatar')).toHaveClass('eds-avatar-sm');
    const more = screen.getByRole('img', { name: 'Mais 2 pessoas' });
    expect(more).toHaveTextContent('+2');
    expect(more).toHaveClass('eds-avatar-more', 'eds-avatar-sm');
  });
});
