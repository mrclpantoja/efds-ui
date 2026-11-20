import { Avatar, AvatarGroup } from '@eds-ui/react';

export default function Grupo() {
  return (
    <AvatarGroup aria-label="Responsáveis pelo projeto" max={4}>
      <Avatar name="Ana Exemplo" />
      <Avatar name="Bruno Teste" />
      <Avatar name="Carla Modelo" />
      <Avatar name="Diego Fictício" />
      <Avatar name="Elisa Demo" />
      <Avatar name="Fábio Amostra" />
      <Avatar name="Gabi Modelo" />
    </AvatarGroup>
  );
}
