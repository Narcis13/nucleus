import "server-only"

import { getOrCreateConversation as getOrCreateConversationQuery } from "@/lib/db/queries/messages"
import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"

export type GetOrCreateConversationInput = { clientId: string }
export type GetOrCreateConversationResult = { id: string }

export async function getOrCreateConversation(
  _ctx: ServiceContext,
  input: GetOrCreateConversationInput,
): Promise<GetOrCreateConversationResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()
  const conversation = await getOrCreateConversationQuery(input.clientId)
  return { id: conversation.id }
}
