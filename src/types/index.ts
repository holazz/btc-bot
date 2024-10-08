export interface Config {
  apiKey: string
  rpc?: {
    url: string
    username: string
    password: string
  }
  feeRate?: number
  funding: {
    wif: string
    address?: string
  }
  destination?: string
  text?: {
    content: string
    repeat: number
  }
  rune?: {
    id: string
    repeat: number
  }
}

export interface Inscription {
  mimetype: string
  content: Buffer
}
