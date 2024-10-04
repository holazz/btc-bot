export interface RpcApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface BlockchainInfo {
  chain: string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  time: number
  mediantime: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
  warnings: string
}
