import c from 'picocolors'
import { rpcApi } from '../api'

async function run() {
  const { data } = await rpcApi.getBlockchainInfo()
  const { blocks, headers } = data
  console.log(`Synced Height: ${blocks < headers ? c.red(blocks) : c.green(blocks)}
Latest Height: ${c.green(headers)}
`)
}

run()
