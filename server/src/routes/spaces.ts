import { Router } from 'express'

import type { Repositories } from '../db/repositories/index.js'
import { isConversationMode } from '../db/repositories/conversations.js'
import { LOCAL_USER_ID } from '../db/migrate.js'
import { notFound, validationError } from '../http/errors.js'
import { readBody, readString } from '../http/validate.js'

export const SPACE_TITLE_MAX = 100
export const SPACE_DESCRIPTION_MAX = 1000
export const CONVERSATION_TITLE_MAX = 200
const DEFAULT_CONVERSATION_TITLE = '新对话'

/** 学习空间 + 空间下的对话列表/新建。MVP 单用户，全部归属 local。 */
export function createSpacesRouter(repos: Repositories): Router {
  const router = Router()

  function requireSpace(id: string) {
    const space = repos.spaces.findById(id)
    if (!space || space.userId !== LOCAL_USER_ID) throw notFound('学习空间不存在或已被删除。')
    return space
  }

  router.get('/spaces', (_req, res) => {
    res.json({ success: true, data: repos.spaces.listByUser(LOCAL_USER_ID) })
  })

  router.post('/spaces', (req, res) => {
    const body = readBody(req.body)
    const title = readString(body.title, { label: '空间名称', max: SPACE_TITLE_MAX, required: true })!
    const description = readString(body.description, {
      label: '空间描述',
      max: SPACE_DESCRIPTION_MAX,
    })

    const space = repos.spaces.create({ userId: LOCAL_USER_ID, title, description })
    res.status(201).json({ success: true, data: space })
  })

  router.get('/spaces/:id', (req, res) => {
    res.json({ success: true, data: requireSpace(req.params.id) })
  })

  router.delete('/spaces/:id', (req, res) => {
    requireSpace(req.params.id)
    repos.spaces.delete(req.params.id)
    res.json({ success: true, data: { id: req.params.id } })
  })

  router.get('/spaces/:id/conversations', (req, res) => {
    requireSpace(req.params.id)
    res.json({ success: true, data: repos.conversations.listBySpace(req.params.id) })
  })

  router.post('/spaces/:id/conversations', (req, res) => {
    const space = requireSpace(req.params.id)
    const body = readBody(req.body)
    const title =
      readString(body.title, { label: '对话标题', max: CONVERSATION_TITLE_MAX }) ??
      DEFAULT_CONVERSATION_TITLE

    if (body.mode !== undefined && !isConversationMode(body.mode)) {
      throw validationError("mode 只能是 'explain' 或 'socratic'。")
    }

    const conversation = repos.db.transaction(() => {
      const created = repos.conversations.create({
        spaceId: space.id,
        title,
        mode: body.mode as 'explain' | 'socratic' | undefined,
      })
      repos.spaces.touch(space.id, created.createdAt)
      return created
    })()

    res.status(201).json({ success: true, data: conversation })
  })

  return router
}
