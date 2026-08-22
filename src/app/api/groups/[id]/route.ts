import { getGroupDetail } from '@/lib/store/db'
import { fail, handle } from '@/lib/store/respond'

export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const detail = await getGroupDetail(id)

  if (!detail) return fail("We couldn't find that group", 404)
  return handle(async () => detail)
}
