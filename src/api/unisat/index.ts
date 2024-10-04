import axios from 'axios'
import logger from '../../utils/logger'
import type { AxiosInstance } from 'axios'
import type {
  AddressBalance,
  AddressUTXOData,
  BRC20Data,
  BRC20InfoItem,
  BRC20ListParams,
  InscriptionInfo,
  OpenApiResponse,
} from './types'
export * from './types'

export class OpenApi {
  private client: AxiosInstance

  constructor(params: { baseURL: string; apiKey: string }) {
    this.client = axios.create({
      baseURL: params.baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
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
        if (response.data.code !== 0) {
          logger.error(`[${response.config.url}] ${response.data.msg}`)
        }
        return response.data
      },
      (error) => {
        return Promise.reject(error)
      },
    )
  }

  async getAddressBalance(
    address: string,
  ): Promise<OpenApiResponse<AddressBalance>> {
    return this.client.get(`/v1/indexer/address/${address}/balance`)
  }

  async getAddressUtxos(
    address: string,
    params: {
      cursor: number
      size: number
    } = { cursor: 0, size: 16 },
  ): Promise<OpenApiResponse<AddressUTXOData>> {
    return this.client.get(`/v1/indexer/address/${address}/utxo-data`, {
      params,
    })
  }

  async getInscriptionInfo(
    inscriptionId: string,
  ): Promise<OpenApiResponse<InscriptionInfo>> {
    return this.client.get(`/v1/indexer/inscription/info/${inscriptionId}`)
  }

  async getInscriptionsByAddress(
    address: string,
    params: {
      cursor: number
      size: number
    } = { cursor: 0, size: 16 },
  ): Promise<
    OpenApiResponse<{
      inscription: InscriptionInfo[]
      cursor: number
      total: number
    }>
  > {
    return this.client.get(`/v1/indexer/address/${address}/inscription-data`, {
      params,
    })
  }

  async getBRC20List(
    params: BRC20ListParams,
  ): Promise<OpenApiResponse<BRC20Data>> {
    return this.client.get('/v1/indexer/brc20/list', {
      params,
    })
  }

  async getBRC20Info(ticker: string): Promise<OpenApiResponse<BRC20InfoItem>> {
    return this.client.get(`/v1/indexer/brc20/${ticker}/info`)
  }

  async pushTx(data: { txHex: string }): Promise<OpenApiResponse<string>> {
    return this.client.post('/v1/indexer/local_pushtx', data)
  }
}
