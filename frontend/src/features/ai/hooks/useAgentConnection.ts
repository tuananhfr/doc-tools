import { useCallback, useEffect, useMemo, useState } from 'react'
import { AiError, aiService } from '../services/ai.service'
import { AgentWsClient } from '../services/ws-client'
import { CONNECTION_STATES, type AiErrorCode, type ConnectionState } from '../types/ai.types'

/** One socket per mounted chat; it opens only when `enabled` and closes on unmount. */
export function useAgentConnection(enabled: boolean) {
  const [state, setState] = useState<ConnectionState>(CONNECTION_STATES.idle)
  // Why a ticket was refused (not ready, Pro ended…); the socket layer itself only knows "failed".
  const [ticketError, setTicketError] = useState<AiErrorCode | null>(null)
  const client = useMemo(() => new AgentWsClient(async () => {
    try {
      const ticket = await aiService.session()
      setTicketError(null)
      return ticket
    } catch (error) {
      setTicketError(error instanceof AiError ? error.code : 'UNKNOWN')
      throw error
    }
  }, setState), [])

  useEffect(() => {
    if (!enabled) return
    void client.connect()
    return () => client.disconnect()
  }, [client, enabled])

  const retry = useCallback(() => {
    client.disconnect()
    void client.connect()
  }, [client])

  return { client, state, connected: state === CONNECTION_STATES.connected, ticketError, retry }
}
