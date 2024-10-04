import axios from 'axios'
import logger from '../../utils/logger'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type { BlockchainInfo, RpcApiResponse } from './types'
export * from './types'

export class RpcApi {
  private client: AxiosInstance
  private static readonly RPC_ID = 'ordinals-bot'

  constructor(params: { baseURL: string; username: string; password: string }) {
    this.client = axios.create({
      baseURL: params.baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${params.username}:${params.password}`,
        ).toString('base64')}`,
      },
    })
    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    this.client.interceptors.response.use(
      (response) => {
        return {
          code: 0,
          msg: 'OK',
          data: response.data.result,
        } as AxiosResponse['data']
      },
      (error) => {
        const rpcError = error?.response?.data?.error
        if (rpcError) {
          const { code, message: msg } = rpcError
          logger.error(`[${error.config.url}] ${msg}`)
          return {
            code,
            msg,
            data: null,
          }
        }
        return Promise.reject(error)
      },
    )
  }

  private async callRpcMethod<T>(
    method: string,
    params: unknown[] = [],
  ): Promise<RpcApiResponse<T>> {
    return this.client.post('/', {
      jsonrpc: '2.0',
      id: RpcApi.RPC_ID,
      method,
      params,
    })
  }

  async getBlockchainInfo(): Promise<RpcApiResponse<BlockchainInfo>> {
    return this.callRpcMethod('getblockchaininfo', [])
  }

  async getBlockCount(): Promise<RpcApiResponse<number>> {
    return this.callRpcMethod('getblockcount', [])
  }

  async pushTx(data: { txHex: string }): Promise<RpcApiResponse<string>> {
    return this.callRpcMethod('sendrawtransaction', [data.txHex])
  }
}
