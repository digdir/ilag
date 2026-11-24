import type { PayloadRequest } from 'payload'

import { idOf } from '../utils/ids'

type ID = number

// The units the request's user leads (`leader` on Enheter, LO-02), looked up
// once per request: the access functions of one request often ask several times.
export const unitIdsLedBy = (req: PayloadRequest): Promise<ID[]> => {
  const cached = req.context.unitIdsLedBy as Promise<ID[]> | undefined
  if (cached) return cached
  const person = req.user?.person
  const personId = idOf(person)
  const ids = personId
    ? req.payload
        .find({
          collection: 'enheter',
          where: { leader: { equals: personId } },
          pagination: false,
          depth: 0,
          req,
        })
        .then(({ docs }) => docs.map((u) => u.id))
    : Promise.resolve([])
  req.context.unitIdsLedBy = ids
  return ids
}

export const isUnitLeader = async (req: PayloadRequest): Promise<boolean> =>
  (await unitIdsLedBy(req)).length > 0
