import { MEMPOOL_API_URL, UNISAT_API_URL } from '../constants'
import { getRawConfig } from '../utils'
import { MempoolApi } from './mempool'
import { RpcApi } from './rpc'
import { OpenApi } from './unisat'

const config = await getRawConfig()

export const openApi = new OpenApi({
  baseURL: UNISAT_API_URL,
  apiKey: config.apiKey,
})

export const mempoolApi = new MempoolApi({
  baseURL: MEMPOOL_API_URL,
})

export const rpcApi = new RpcApi({
  baseURL: (config.rpc && config.rpc.url) || '',
  username: (config.rpc && config.rpc.username) || '',
  password: (config.rpc && config.rpc.password) || '',
})

export async function getFeeRate(initialFeeRate?: number) {
  if (initialFeeRate) return initialFeeRate
  const feeRate = await mempoolApi.getRecommendFee()
  console.table(feeRate)
  return feeRate.fastestFee
}

export async function pushTx(data: { txHex: string }) {
  const pushTxMethod =
    config.rpc && config.rpc.url
      ? rpcApi.pushTx.bind(rpcApi)
      : openApi.pushTx.bind(openApi)
  return pushTxMethod(data)
}

export * from './mempool'
export * from './rpc'
export * from './unisat'
