import fsp from 'node:fs/promises'
import logger from '../utils/logger'
import { pushTxs as pushOrdinalsTxs } from '../helpers/ordinals'
import { pushTxs as pushRunesTxs } from '../helpers/runes'

const dumpFile = await fsp
  .readFile('data/dump.json', 'utf-8')
  .catch((e: any) => {
    logger.error(e.message)
    process.exit(0)
  })

const { commitTxHex, revealTxHexes, mintTxHexes } = JSON.parse(dumpFile)

if (revealTxHexes) {
  await pushOrdinalsTxs(commitTxHex, revealTxHexes)
}

if (mintTxHexes) {
  await pushRunesTxs(commitTxHex, mintTxHexes)
}
