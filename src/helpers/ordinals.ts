import pLimit from 'p-limit'
import { toXOnly } from '@unisat/wallet-sdk/lib/utils'
import { sendBTC } from '@unisat/wallet-sdk/lib/tx-helpers'
import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { mempoolApi, pushTx } from '../api'
import { retry, sleep } from '../utils'
import logger from '../utils/logger'
import type { LocalWallet } from '@unisat/wallet-sdk/lib/wallet'
import type { UTXO } from '../api'
import type { Inscription } from '../types'

export function chunkContent(data: Buffer) {
  const chunkSize = 520
  const chunksCount = Math.ceil(data.length / chunkSize)
  return Array.from({ length: chunksCount }, (_, i) =>
    data.subarray(i * chunkSize, (i + 1) * chunkSize),
  )
}

export function createInscriptionTapScript(
  wallet: LocalWallet,
  inscription: Inscription,
) {
  const xOnlyPublicKey = toXOnly(Buffer.from(wallet.pubkey, 'hex'))
  const script = bitcoin.script.compile([
    xOnlyPublicKey,
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_0,
    bitcoin.opcodes.OP_IF,
    Buffer.from('ord', 'utf-8'),
    1,
    1,
    Buffer.from(inscription.mimetype, 'utf-8'),
    bitcoin.opcodes.OP_0,
    ...chunkContent(inscription.content),
    bitcoin.opcodes.OP_ENDIF,
  ])
  const scriptTree = {
    output: script,
    redeemVersion: 192,
  }
  const scriptTaproot = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(Buffer.from(wallet.pubkey, 'hex')),
    network: wallet.network,
    scriptTree,
    redeem: scriptTree,
  }) as Omit<bitcoin.payments.Payment, 'address'> & {
    address: string
  }
  const tapLeafScript = [
    {
      leafVersion: scriptTaproot.redeemVersion!,
      script,
      controlBlock: scriptTaproot.witness![scriptTaproot.witness!.length - 1],
    },
  ]

  return { scriptTaproot, tapLeafScript }
}

export async function createCommitTx({
  wallet,
  utxos,
  outputs,
  feeRate,
}: {
  wallet: LocalWallet
  utxos: UTXO[]
  outputs: {
    address: string
    satoshis: number
  }[]
  feeRate: number
}) {
  const { psbt, toSignInputs } = await sendBTC({
    btcUtxos: utxos.map((v) => ({
      txid: v.txid,
      vout: v.vout,
      satoshis: v.satoshi,
      scriptPk: v.scriptPk,
      pubkey: wallet.pubkey,
      addressType: wallet.addressType,
      inscriptions: v.inscriptions,
      atomicals: [],
    })),
    tos: outputs,
    networkType: wallet.networkType,
    changeAddress: wallet.address,
    feeRate,
  })

  await wallet.signPsbt(psbt, {
    autoFinalized: true,
    toSignInputs,
  })

  const tx = psbt.extractTransaction()

  return {
    id: tx.getId(),
    hex: tx.toHex(),
    size: tx.virtualSize(),
  }
}

export async function createRevealTx({
  wallet,
  commitTxId,
  index,
  inputValue,
  destination,
  postage,
  scriptTaproot,
  tapLeafScript,
}: {
  wallet: LocalWallet
  commitTxId: string
  index: number
  inputValue: number
  destination: string
  postage: number
  scriptTaproot: ReturnType<typeof createInscriptionTapScript>['scriptTaproot']
  tapLeafScript: ReturnType<typeof createInscriptionTapScript>['tapLeafScript']
}) {
  const psbt = new bitcoin.Psbt({ network: wallet.network })

  psbt.addInput({
    hash: commitTxId,
    index,
    tapInternalKey: toXOnly(Buffer.from(wallet.pubkey, 'hex')),
    witnessUtxo: { value: inputValue, script: scriptTaproot.output! },
    tapLeafScript,
  })

  psbt.addOutput({
    address: destination,
    value: postage,
  })

  await wallet.signPsbt(psbt, {
    autoFinalized: true,
    toSignInputs: [
      {
        index: 0,
        publicKey: wallet.pubkey,
        disableTweakSigner: true,
      },
    ],
  })

  const tx = psbt.extractTransaction()

  return {
    id: tx.getId(),
    hex: tx.toHex(),
    size: tx.virtualSize(),
  }
}

export async function estimateRevealTxSize({
  wallet,
  destination,
  scriptTaproot,
  tapLeafScript,
}: {
  wallet: LocalWallet
  destination: string
  scriptTaproot: ReturnType<typeof createInscriptionTapScript>['scriptTaproot']
  tapLeafScript: ReturnType<typeof createInscriptionTapScript>['tapLeafScript']
}) {
  const psbt = new bitcoin.Psbt({ network: wallet.network })
  psbt.addInput({
    hash: Buffer.alloc(32, 0),
    index: 0,
    tapInternalKey: toXOnly(Buffer.from(wallet.pubkey, 'hex')),
    witnessUtxo: { value: 546, script: scriptTaproot.output! },
    tapLeafScript,
  })
  psbt.addOutput({
    address: destination,
    value: 546,
  })
  await wallet.signPsbt(psbt, {
    autoFinalized: true,
    toSignInputs: [
      {
        index: 0,
        publicKey: wallet.pubkey,
        disableTweakSigner: true,
      },
    ],
  })
  const txSize = psbt.extractTransaction().virtualSize()
  return txSize
}

export async function waitForConfirmation(txId: string, interval = 5000) {
  if (!txId) return

  while (true) {
    try {
      await mempoolApi.getTxStatus(txId)
    } catch {
      logger.error(`Waiting for ${txId} to appear in the mempool...`)
      await sleep(interval)
      continue
    }
    const { confirmed } = await mempoolApi.getTxStatus(txId)
    if (confirmed) break
    logger.warn(`Waiting for ${txId} to be confirmed...`)
    await sleep(interval)
  }
  logger.success(`${txId} has been confirmed\n`)
}

export async function pushTxs(commitTx: string, revealTxs: string[]) {
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

  const limit = pLimit(10)
  const firstBatchRevealTxs = revealTxs.slice(0, 25)
  const secondBatchRevealTxs = revealTxs.slice(25)

  const batchPushTxs = async (txs: string[]) => {
    const promises = txs.map((txHex) =>
      limit(async () => {
        const {
          code,
          msg,
          data: txId,
        } = await retry(pushTx, Number.MAX_SAFE_INTEGER)({ txHex })
        if (msg.includes('too-long-mempool-chain')) {
          secondBatchRevealTxs.unshift(txHex)
        }
        if (code === 0) logger.success(`Tx ${txId} has been submitted`)
        return code === 0 ? txId : null
      }),
    )

    const txIds = (await Promise.all(promises)).filter(Boolean)
    return txIds
  }

  const firstBatchRevealTxIds = await batchPushTxs(firstBatchRevealTxs)

  if (secondBatchRevealTxs.length === 0) return firstBatchRevealTxIds

  await waitForConfirmation(commitTxId)

  const secondBatchRevealTxIds = await batchPushTxs(secondBatchRevealTxs)

  const revealTxIds = [...firstBatchRevealTxIds, ...secondBatchRevealTxIds]
  logger.success(`Total submitted ${revealTxIds.length} txs`)

  return revealTxIds
}
