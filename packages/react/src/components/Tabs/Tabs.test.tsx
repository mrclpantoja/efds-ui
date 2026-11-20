import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

function Example({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="info" onValueChange={onValueChange}>
      <TabList aria-label="Dados do usuário">
        <Tab value="info">Informações</Tab>
        <Tab value="perm">Permissões</Tab>
        <Tab value="hist">Histórico</Tab>
        <Tab value="audit" disabled>
          Auditoria
        </Tab>
      </TabList>
      <TabPanel value="info">Dados cadastrais</TabPanel>
      <TabPanel value="perm">Perfis e escopos</TabPanel>
      <TabPanel value="hist">Alterações recentes</TabPanel>
      <TabPanel value="audit">Indisponível</TabPanel>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('monta o padrão tablist com classes do core e ARIA ligados', () => {
    render(<Example />);
    const list = screen.getByRole('tablist', { name: 'Dados do usuário' });
    expect(list).toHaveClass('eds-tablist');
    expect(list.parentElement).toHaveClass('eds-tabs');
    expect(tab('Informações')).toHaveClass('eds-tab');
    expect(tab('Informações')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Permissões')).toHaveAttribute('aria-selected', 'false');
    const panel = screen.getByRole('tabpanel', { name: 'Informações' });
    expect(panel).toHaveClass('eds-tabpanel');
    expect(tab('Informações')).toHaveAttribute('aria-controls', panel.id);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('roving tabindex: 0 na ativa e -1 nas demais; aria-disabled na indisponível', () => {
    render(<Example />);
    expect(tab('Informações')).toHaveAttribute('tabindex', '0');
    expect(tab('Permissões')).toHaveAttribute('tabindex', '-1');
    expect(tab('Auditoria')).toHaveAttribute('aria-disabled', 'true');
    expect(tab('Auditoria')).not.toBeDisabled();
  });

  it('Tab entra na aba ativa e sai direto para o painel', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(tab('Informações')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });

  it('→ move e ativa automaticamente; ← volta', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(tab('Permissões')).toHaveFocus();
    expect(tab('Permissões')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Permissões')).toHaveAttribute('tabindex', '0');
    expect(tab('Informações')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel', { name: 'Permissões' })).toHaveTextContent(
      'Perfis e escopos',
    );
    await user.keyboard('{ArrowLeft}');
    expect(tab('Informações')).toHaveFocus();
    expect(onValueChange.mock.calls).toEqual([['perm'], ['info']]);
  });

  it('as setas dão a volta; Home e End vão às pontas', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    // A última (Auditoria) está indisponível: recebe foco, não é ativada.
    expect(tab('Auditoria')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tab('Informações')).toHaveFocus();
    await user.keyboard('{End}');
    expect(tab('Auditoria')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(tab('Informações')).toHaveFocus();
    expect(tab('Informações')).toHaveAttribute('aria-selected', 'true');
  });

  it('foco numa aba desabilitada não move o tab stop: tabindex 0 fica na selecionada', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard('{End}');
    expect(tab('Auditoria')).toHaveFocus();
    expect(tab('Auditoria')).toHaveAttribute('tabindex', '-1');
    expect(tab('Informações')).toHaveAttribute('tabindex', '0');
    expect(tab('Informações')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(tab('Histórico')).toHaveAttribute('tabindex', '0');
    expect(tab('Auditoria')).toHaveAttribute('tabindex', '-1');
  });

  it('aba indisponível é alcançável por setas, mas não ativa; clique é ignorado', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await user.click(tab('Histórico'));
    onValueChange.mockClear();
    await user.keyboard('{ArrowRight}');
    expect(tab('Auditoria')).toHaveFocus();
    expect(tab('Auditoria')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Histórico')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Auditoria')).toHaveAttribute('tabindex', '-1');
    expect(tab('Histórico')).toHaveAttribute('tabindex', '0');
    await user.click(tab('Auditoria'));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(tab('Histórico')).toHaveAttribute('aria-selected', 'true');
  });

  it('com o foco fora da lista, o tab stop volta para a aba ativa', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">Fora</button>
      </>,
    );
    await user.click(tab('Permissões'));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(tab('Auditoria')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Fora' }));
    expect(tab('Histórico')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Histórico')).toHaveAttribute('tabindex', '0');
    expect(tab('Auditoria')).toHaveAttribute('tabindex', '-1');
  });

  it('clique ativa a aba', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(tab('Histórico'));
    expect(tab('Histórico')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Histórico' })).toBeVisible();
  });

  it('controlado: o valor vem de fora e onValueChange só pede a mudança', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs value="a" onValueChange={onValueChange}>
        <TabList aria-label="X">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">pa</TabPanel>
        <TabPanel value="b">pb</TabPanel>
      </Tabs>,
    );
    await user.click(tab('B'));
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(tab('A')).toHaveAttribute('aria-selected', 'true');
  });

  it('controlado com estado externo acompanha o teclado', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('a');
      return (
        <Tabs value={value} onValueChange={setValue}>
          <TabList aria-label="X">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">pa</TabPanel>
          <TabPanel value="b">pb</TabPanel>
        </Tabs>
      );
    }
    render(<Controlled />);
    await user.tab();
    await user.keyboard('{End}');
    expect(tab('B')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('pb');
  });

  it('fill, className e ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Tabs ref={ref} defaultValue="a" fill className="extra">
        <TabList aria-label="X" className="l">
          <Tab value="a" className="t">
            A
          </Tab>
        </TabList>
        <TabPanel value="a" className="p">
          pa
        </TabPanel>
      </Tabs>,
    );
    expect(ref.current).toHaveClass('eds-tabs', 'eds-tabs-fill', 'extra');
    expect(screen.getByRole('tablist')).toHaveClass('eds-tablist', 'l');
    expect(tab('A')).toHaveClass('eds-tab', 't');
    expect(screen.getByRole('tabpanel')).toHaveClass('eds-tabpanel', 'p');
  });

  it('value sem aba correspondente: a 1ª aba habilitada é o tab stop', () => {
    render(
      <Tabs value="inexistente">
        <TabList aria-label="X">
          <Tab value="a" disabled>
            A
          </Tab>
          <Tab value="b">B</Tab>
          <Tab value="c">C</Tab>
        </TabList>
        <TabPanel value="b">pb</TabPanel>
      </Tabs>,
    );
    expect(tab('A')).toHaveAttribute('tabindex', '-1');
    expect(tab('B')).toHaveAttribute('tabindex', '0');
    expect(tab('C')).toHaveAttribute('tabindex', '-1');
  });

  it('values com espaço e acento geram ids válidos e o teclado ainda os ativa', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="dados gerais">
        <TabList aria-label="X">
          <Tab value="dados gerais">Dados</Tab>
          <Tab value="histórico 2026">Histórico</Tab>
        </TabList>
        <TabPanel value="dados gerais">pa</TabPanel>
        <TabPanel value="histórico 2026">pb</TabPanel>
      </Tabs>,
    );
    expect(tab('Dados').id).not.toMatch(/\s/);
    expect(tab('Histórico').getAttribute('aria-controls')).not.toMatch(/\s/);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(tab('Histórico')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('pb');
  });

  it('exige aria-label ou aria-labelledby na lista (tipo) e <Tabs> acima (runtime)', () => {
    // @ts-expect-error: TabList sem nome acessível
    const bare = <TabList />;
    expect(bare).toBeTruthy();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <TabList aria-label="X">
          <span />
        </TabList>,
      ),
    ).toThrow(/<Tabs>/);
    spy.mockRestore();
  });
});
