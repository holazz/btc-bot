import { Transaction, utxoHelper } from '@unisat/wallet-sdk/lib/transaction'
import { UTXO_DUST } from '@unisat/wallet-sdk'
import { pushTx } from '../api'
import { retry } from '../utils'
import logger from '../utils/logger'
import type { UTXO } from '../api'
import type { LocalWallet } from '@unisat/wallet-sdk/lib/wallet'
import type { Runestone } from 'runelib'
import type { UnspentOutput } from '@unisat/wallet-sdk'

export function genDummyUtxo(
  wallet: LocalWallet,
  satoshis: number,
  txid?: string,
  vout?: number,
): UnspentOutput {
  return {
    txid: txid || '0'.repeat(64),
    vout: vout ?? 0,
    satoshis,
    scriptPk: wallet.scriptPk,
    addressType: wallet.addressType,
    pubkey: wallet.pubkey,
    inscriptions: [],
    atomicals: [],
    runes: [],
  }
}

export async function createCommitTx({
  wallet,
  runestone,
  utxos,
  outputs,
  feeRate,
  enableRBF = true,
}: {
  wallet: LocalWallet
  runestone: Runestone
  utxos: UTXO[]
  outputs: {
    address: string
    satoshis: number
  }[]
  feeRate: number
  enableRBF?: boolean
}) {
  const btcUtxos = utxos.map((v) => ({
    txid: v.txid,
    vout: v.vout,
    satoshis: v.satoshi,
    scriptPk: v.scriptPk,
    pubkey: wallet.pubkey,
    addressType: wallet.addressType,
    inscriptions: v.inscriptions,
    atomicals: [],
  }))

  if (utxoHelper.hasAnyAssets(btcUtxos)) {
    throw new Error('Not safe utxos')
  }

  const tx = new Transaction()
  tx.setNetworkType(wallet.networkType)
  tx.setFeeRate(feeRate)
  tx.setEnableRBF(enableRBF)
  tx.setChangeAddress(wallet.address)

  tx.addScriptOutput(runestone.encipher(), 0)
  outputs.forEach((v) => {
    tx.addOutput(v.address, v.satoshis)
  })

  const toSignInputs = await tx.addSufficientUtxosForFee(btcUtxos)
  const psbt = tx.toPsbt()

  await wallet.signPsbt(psbt, {
    autoFinalized: true,
    toSignInputs,
  })

  const commitTx = psbt.extractTransaction()
  return {
    id: commitTx.getId(),
    hex: commitTx.toHex(),
    size: commitTx.virtualSize(),
  }
}

export async function estimateMintTxFee({
  wallet,
  runestone,
  feeRate,
}: {
  wallet: LocalWallet
  runestone: Runestone
  feeRate: number
}) {
  const dummyUtxo = genDummyUtxo(wallet, 100000000)
  const tx = new Transaction()
  tx.setNetworkType(wallet.networkType)
  tx.setFeeRate(feeRate)
  tx.addInput(dummyUtxo)
  tx.addScriptOutput(runestone.encipher(), 0)
  tx.addOutput(wallet.address, UTXO_DUST)
  const fee = await tx.calNetworkFee()
  return fee
}

export async function createMintTx({
  wallet,
  runestone,
  txId,
  txIndex,
  inputValue,
  outputValue,
  toAddress,
  feeRate,
}: {
  wallet: LocalWallet
  runestone: Runestone
  txId: string
  txIndex: number
  inputValue: number
  outputValue: number
  toAddress: string
  feeRate: number
}) {
  const tx = new Transaction()
  tx.setNetworkType(wallet.networkType)
  tx.setFeeRate(feeRate)
  tx.addInput({
    txid: txId,
    vout: txIndex,
    satoshis: inputValue,
    scriptPk: wallet.scriptPk,
    addressType: wallet.addressType,
    pubkey: wallet.pubkey,
    inscriptions: [],
    atomicals: [],
  })
  tx.addScriptOutput(runestone.encipher(), 0)
  tx.addOutput(toAddress, outputValue)

  const psbt = tx.toPsbt()

  await wallet.signPsbt(psbt, {
    autoFinalized: true,
    toSignInputs: [{ index: 0, publicKey: wallet.pubkey }],
  })

  const mintTx = psbt.extractTransaction()

  return {
    id: mintTx.getId(),
    hex: mintTx.toHex(),
    outputValue,
  }
}

export async function createMintTxs({
  wallet,
  runestone,
  count,
  commitTxId,
  commitTxAmount,
  perMintFee,
  toAddress,
  feeRate,
}: {
  wallet: LocalWallet
  runestone: Runestone
  count: number
  commitTxId: string
  commitTxAmount: number
  perMintFee: number
  toAddress: string
  feeRate: number
}) {
  const mintTxs: {
    id: string
    hex: string
  }[] = []

  let txId = commitTxId
  let amount = commitTxAmount

  for (let i = 0; i < count; i++) {
    const {
      id: mintTxId,
      hex: mintTxHex,
      outputValue: mintTxAmount,
    } = await createMintTx({
      wallet,
      runestone,
      txId,
      txIndex: 1,
      inputValue: amount,
      outputValue: amount - perMintFee,
      toAddress: i === count - 1 ? toAddress : wallet.address,
      feeRate,
    })

    txId = mintTxId
    amount = mintTxAmount

    mintTxs.push({
      id: mintTxId,
      hex: mintTxHex,
    })
  }

  return mintTxs
}

export async function pushTxs(commitTx: string, mintTxs: string[]) {
  const {
    code,
    msg,
    data: commitTxId,
  } = await retry(
    pushTx,
    Number.MAX_SAFE_INTEGER,
  )({
    txHex: commitTx,
  })

  if (code !== 0 && !msg.includes('Transaction already in block chain'))
    process.exit(0)
  logger.success(`Tx ${commitTxId} has been submitted`)

  const mintTxIds = []
  for (let i = 0; i < mintTxs.length; i++) {
    const { code, data: mintTxId } = await retry(
      pushTx,
      Number.MAX_SAFE_INTEGER,
    )({
      txHex: mintTxs[i],
    })

    if (code === 0) {
      mintTxIds.push(mintTxId)
      logger.success(`Tx ${mintTxId} has been submitted`)
    }
  }
  logger.success(`Total submitted ${mintTxIds.length + 1} txs`)
}
