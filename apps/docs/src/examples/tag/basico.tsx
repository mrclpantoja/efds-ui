import { Tag } from '@efds-ui/react';

export default function Basico() {
  return (
    <div className="eds-tag-list">
      <Tag>Rascunho</Tag>
      <Tag tone="accent">Prioridade</Tag>
      <Tag tone="info">Financeiro</Tag>
      <Tag tone="success">Aprovado</Tag>
      <Tag tone="warning">Revisar</Tag>
      <Tag tone="danger">Bloqueado</Tag>
    </div>
  );
}
