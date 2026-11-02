import type { DB } from '../client.js'
import { createConversationRepository } from './conversations.js'
import { createMessageRepository } from './messages.js'
import { createRoundRepository } from './rounds.js'
import { createSpaceRepository } from './spaces.js'

export function createRepositories(db: DB) {
  return {
    db,
    spaces: createSpaceRepository(db),
    conversations: createConversationRepository(db),
    messages: createMessageRepository(db),
    rounds: createRoundRepository(db),
  }
}

export type Repositories = ReturnType<typeof createRepositories>
