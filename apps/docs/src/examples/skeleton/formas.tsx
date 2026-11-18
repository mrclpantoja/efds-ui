import { Skeleton, Stack } from '@eds-ui/react';

export default function Formas() {
  return (
    <Stack gap={4}>
      <Skeleton />
      <div>
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" shimmer />
      </div>
      <Stack direction="row" gap={3}>
        <Skeleton variant="circle" shimmer />
        <Skeleton variant="circle" />
      </Stack>
    </Stack>
  );
}
