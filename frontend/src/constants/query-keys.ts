export const queryKeys = {
  tools: { stats: () => ['tools', 'stats'] as const },
  inventory: { trace: { resolve: (value: string) => ['inventory', 'trace', 'resolve', value] as const } },
}
