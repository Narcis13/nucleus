import "server-only"

import { updateProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { ServiceError } from "../_lib/errors"

export type SetAvatarUrlInput = {
  avatarUrl: string | null
}

export type SetAvatarUrlResult = {
  avatarUrl: string | null
}

export async function setAvatarUrl(
  _ctx: ServiceContext,
  input: SetAvatarUrlInput,
): Promise<SetAvatarUrlResult> {
  const updated = await updateProfessional({ avatarUrl: input.avatarUrl })
  if (!updated) throw new ServiceError("Couldn't save avatar")
  return { avatarUrl: updated.avatarUrl }
}
