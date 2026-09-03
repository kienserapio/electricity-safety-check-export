import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  // Next writes AGENTS.md and CLAUDE.md into the repo root on dev start.
  // Flip to true if the team wants them.
  agentRules: false,
}

export default nextConfig
