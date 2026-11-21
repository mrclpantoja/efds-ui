import { SegmentedControl, Stack } from '@efds-ui/react';
import { MenuIcon, DashboardIcon } from '@efds-ui/icons';

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
