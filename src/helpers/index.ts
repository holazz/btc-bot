import { mempoolApi } from '../api'
import { sleep } from '../utils'
import logger from '../utils/logger'

export async function waitForConfirmation(txId: string, interval = 5000) {
  if (!txId) return

  while (true) {
    try {
      await mempoolApi.getTxStatus(txId)
    } catch {
      logger.error(`Waiting for ${txId} to appear in the mempool...`)
      await sleep(interval)
      continue
    }
    const { confirmed } = await mempoolApi.getTxStatus(txId)
    if (confirmed) break
    logger.warn(`Waiting for ${txId} to be confirmed...`)
    await sleep(interval)
  }
  logger.success(`${txId} has been confirmed\n`)
}
