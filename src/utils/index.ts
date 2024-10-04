import 'dotenv/config'
import { writeFile as _writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { AddressType } from '@unisat/wallet-sdk'
import { NetworkType } from '@unisat/wallet-sdk/lib/network'
import { LocalWallet } from '@unisat/wallet-sdk/lib/wallet'
import { getAddressType, isValidAddress } from '@unisat/wallet-sdk/lib/address'
import { NETWORK_NAME, NETWORK_TYPE } from '../constants'
import type { Config } from '../types'

export function getPostage(address: string) {
  const addressType = getAddressType(address, NetworkType.MAINNET)
  return [
    AddressType.P2TR,
    AddressType.P2WPKH,
    AddressType.M44_P2TR,
    AddressType.M44_P2WPKH,
  ].includes(addressType)
    ? 330
    : 546
}

export async function getRawConfig(): Promise<Config> {
  const config = (await import(`../../configs/${NETWORK_NAME}.ts`)).default
  return config
}

export async function resolveConfig() {
  const rawConfig = await getRawConfig()
  const wallet = new LocalWallet(
    rawConfig.funding.wif,
    isValidAddress(rawConfig.funding.address || '', NETWORK_TYPE)
      ? getAddressType(rawConfig.funding.address!)
      : AddressType.P2TR,
    NETWORK_TYPE,
  )
  const destination = isValidAddress(rawConfig.destination || '', NETWORK_TYPE)
    ? rawConfig.destination!
    : wallet.address

  const postage = getPostage(destination)

  return {
    network: NETWORK_NAME,
    wallet,
    destination,
    postage,
    feeRate: rawConfig.feeRate,
    text: rawConfig.text,
    rune: rawConfig.rune,
  }
}

export async function writeFile(
  filePath: string,
  content: string | Buffer | Uint8Array,
  options: {
    encoding?: BufferEncoding
    flag?: string
    mode?: number
  } = {},
) {
  await mkdir(dirname(filePath), { recursive: true })
  await _writeFile(filePath, content, options)
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function retry<T>(
  fn: (...args: any[]) => Promise<T>,
  times = 0,
  delay = 0,
) {
  return (...args: any[]): Promise<T> =>
    new Promise((resolve, reject) => {
      const attempt = async () => {
        try {
          resolve(await fn(...args))
        } catch (err) {
          if (times-- <= 0) {
            reject(err)
          } else {
            setTimeout(attempt, delay)
          }
        }
      }
      attempt()
    })
}

resolveConfig()
