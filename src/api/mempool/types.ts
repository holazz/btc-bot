export interface RecommendedFees {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
  minimumFee: number
}

export interface Address {
  address: string
  chain_stats: {
    funded_txo_count: number
    funded_txo_sum: number
    spent_txo_count: number
    spent_txo_sum: number
    tx_count: number
  }
  mempool_stats: {
    funded_txo_count: number
    funded_txo_sum: number
    spent_txo_count: number
    spent_txo_sum: number
    tx_count: number
  }
}

export interface Tx {
  txid: string
  version: number
  locktime: number
  size: number
  weight: number
  fee: number
  vin: {
    is_coinbase: boolean
    prevout: {
      value: number
      scriptpubkey: string
      scriptpubkey_address: string
      scriptpubkey_asm: string
      scriptpubkey_type: string
    }
    scriptsig: string
    scriptsig_asm: string
    sequence: number
    txid: string
    vout: number
    witness: string[]
    inner_redeemscript_asm: string
    inner_witnessscript_asm: string
  }[]
  vout: {
    value: number
    scriptpubkey: string
    scriptpubkey_address: string
    scriptpubkey_asm: string
    scriptpubkey_type: string
  }[]
  status: {
    confirmed: boolean
    block_height: number
    block_hash: string
    block_time: number
  }
}
