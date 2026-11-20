import { SegmentedControl, Stack } from '@eds-ui/react';
import { MenuIcon, DashboardIcon } from '@eds-ui/icons';

export default function Icones() {
  return (
    <Stack gap={4}>
      <SegmentedControl
        legend="Exibir como"
        defaultValue="lista"
        options={[
          { value: 'lista', label: 'Lista', icon: <MenuIcon /> },
          { value: 'grade', label: 'Grade', icon: <DashboardIcon /> },
        ]}
      />
      <SegmentedControl
        legend="Exibir como (só ícone)"
        defaultValue="lista"
        options={[
          { value: 'lista', label: 'Lista', icon: <MenuIcon />, iconOnly: true },
          { value: 'grade', label: 'Grade', icon: <DashboardIcon />, iconOnly: true },
        ]}
      />
    </Stack>
  );
}
