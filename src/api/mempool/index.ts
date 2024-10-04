import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { Address, RecommendedFees, Tx } from './types'
export * from './types'

export class MempoolApi {
  private client: AxiosInstance

  constructor(params: { baseURL: string }) {
    this.client = axios.create({
      baseURL: params.baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
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
        return response.data
      },
      (error) => {
        return Promise.reject(error)
      },
    )
  }

  async getBlockTipHeight(): Promise<number> {
    return this.client.get('/blocks/tip/height')
  }

  async getRecommendFee(): Promise<RecommendedFees> {
    return this.client.get('/fees/recommended')
  }

  async getTx(txId: string): Promise<Tx> {
    return this.client.get(`/tx/${txId}`)
  }

  async getTxStatus(txId: string): Promise<Tx['status']> {
    return this.client.get(`/tx/${txId}/status`)
  }

  async getRawTx(txId: string): Promise<string> {
    return this.client.get(`/tx/${txId}/hex`)
  }

  async getAddress(address: string): Promise<Address> {
    return this.client.get(`/address/${address}`)
  }

  async getAddressTxs(address: string): Promise<Tx[]> {
    return this.client.get(`/address/${address}/txs`)
  }
}
