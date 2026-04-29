import "server-only"

import { getProfessional } from "@/lib/db/queries/professionals"

import type { ServiceContext } from "../_lib/context"
import { UnauthorizedError } from "../_lib/errors"
import { AVATAR_BUCKET } from "./_lib"

export type PrepareAvatarUploadInput = {
  filename: string
  contentType: string
  fileSize: number
}

export type PrepareAvatarUploadResult = {
  storageKey: string
  bucket: string
}

export async function prepareAvatarUpload(
  _ctx: ServiceContext,
  input: PrepareAvatarUploadInput,
): Promise<PrepareAvatarUploadResult> {
  const professional = await getProfessional()
  if (!professional) throw new UnauthorizedError()
  const extMatch = input.filename.match(/\.([a-z0-9]+)$/i)
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ""
  const storageKey = `${professional.id}/avatar-${crypto.randomUUID()}${ext}`
  return { storageKey, bucket: AVATAR_BUCKET }
}
