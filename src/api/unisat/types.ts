export interface OpenApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface AddressBalance {
  address: string
  satoshi: number
  pendingSatoshi: number
  utxoCount: number
  btcSatoshi: number
  btcPendingSatoshi: number
  btcUtxoCount: number
  inscriptionSatoshi: number
  inscriptionPendingSatoshi: number
  inscriptionUtxoCount: number
}

export interface UTXO {
  address: string
  codeType: number
  height: number
  idx: number
  inscriptions: {
    inscriptionId: string
    inscriptionNumber: number
    isBRC20: boolean
    moved: boolean
    offset: number
  }[]
  isOpInRBF: boolean
  satoshi: number
  scriptPk: string
  scriptType: string
  txid: string
  vout: number
  rawtx?: string
}

export interface AddressUTXOData {
  cursor: number
  total: number
  totalConfirmed: number
  totalUnconfirmed: number
  totalUnconfirmedSpend: number
  utxo: UTXO[]
}

export interface InscriptionInfo {
  address: string
  brc20?: {
    amt: string
    decimal: string
    lim: string
    max: string
    minted: string
    op: string
    tick: string
    to: string
  }
  contentBody?: string
  contentLength: number
  contentType: string
  height: number
  inSatoshi: number
  outSatoshi: number
  inscriptionId: string
  inscriptionIndex: number
  inscriptionNumber: number
  offset: number
  timestamp: number
  utxo: UTXO
}

export interface BRC20ListParams {
  start: number
  limit: number
  tick_filter: 8 | 16 | 24
}

export interface BRC20Data {
  height: number
  total: number
  start: number
  detail: string[]
}

export interface BRC20InfoItem {
  ticker: string
  selfMint: boolean
  holdersCount: number
  historyCount: number
  inscriptionNumber: number
  inscriptionId: string
  max: string
  limit: string
  minted: string
  totalMinted: string
  confirmedMinted: string
  confirmedMinted1h: string
  confirmedMinted24h: string
  mintTimes: number
  decimal: number
  creator: string
  txid: string
  deployHeight: number
  deployBlocktime: number
  completeHeight: number
  completeBlocktime: number
  inscriptionNumberStart: number
  inscriptionNumberEnd: number
}
