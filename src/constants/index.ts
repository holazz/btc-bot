import 'dotenv/config'
import { NetworkType } from '@unisat/wallet-sdk/lib/network'

export const NETWORK_NAMES = [
  'btc-mainnet',
  'btc-testnet',
  'fractal-mainnet',
  'fractal-testnet',
] as const

const getNetworkConstants = (network: (typeof NETWORK_NAMES)[number]) => {
  switch (network) {
    case 'btc-mainnet':
      return {
        NETWORK_NAME: 'btc-mainnet',
        NETWORK_TYPE: NetworkType.MAINNET,
        UNISAT_API_URL: 'https://open-api.unisat.io',
        MEMPOOL_API_URL: 'https://mempool.space/api',
      }
    case 'btc-testnet':
      return {
        NETWORK_NAME: 'btc-testnet',
        NETWORK_TYPE: NetworkType.TESTNET,
        UNISAT_API_URL: 'https://open-api-testnet.unisat.io',
        MEMPOOL_API_URL: 'https://mempool.space/testnet',
      }
    case 'fractal-mainnet':
      return {
        NETWORK_NAME: 'fractal-mainnet',
        NETWORK_TYPE: NetworkType.MAINNET,
        UNISAT_API_URL: 'https://open-api-fractal.unisat.io',
        MEMPOOL_API_URL: 'https://mempool.fractalbitcoin.io/api',
      }
    case 'fractal-testnet':
      return {
        NETWORK_NAME: 'fractal-testnet',
        NETWORK_TYPE: NetworkType.MAINNET,
        UNISAT_API_URL: 'https://open-api-fractal-testnet.unisat.io',
        MEMPOOL_API_URL: 'https://mempool-testnet.fractalbitcoin.io/api',
      }
    default:
      throw new Error(`Invalid network: ${network}`)
  }
}

export const { NETWORK_NAME, NETWORK_TYPE, UNISAT_API_URL, MEMPOOL_API_URL } =
  getNetworkConstants(process.env.NETWORK as (typeof NETWORK_NAMES)[number])
