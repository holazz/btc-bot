import 'dotenv/config'
import c from 'picocolors'
import prompts from 'prompts'
import dayjs from 'dayjs'
import { RuneId, Runestone, none, some } from 'runelib'
import { AddressType } from '@unisat/wallet-sdk'
import { LocalWallet } from '@unisat/wallet-sdk/lib/wallet'
import { TOKEN_SYMBOL } from '../constants'
import { getFeeRate, openApi } from '../api'
import { calTxFee, resolveConfig, retry, writeFile } from '../utils'
import logger from '../utils/logger'
import {
  createCommitTx,
  createMintTxs,
  estimateMintTxFee,
  pushTxs,
} from '../helpers/runes'

async function run() {
  const {
    wallet,
    destination,
    postage,
    feeRate: initialFeeRate,
    rune,
  } = await resolveConfig()

  let { id, repeat } = rune!

  if (repeat > 25) {
    logger.warn('Mint count should be less than 25')
    repeat = 25
  }

  const feeRate = await getFeeRate(initialFeeRate)

  const [block, txIndex] = id.split(':').map((v) => parseInt(v))
  const mintstone = new Runestone(
    [],
    none(),
    some(new RuneId(block, txIndex)),
    some(1),
  )

  const mintWallet = LocalWallet.fromRandom(
    AddressType.P2TR,
    wallet.networkType,
  )

  const perMintFee = await estimateMintTxFee({
    wallet: mintWallet,
    runestone: mintstone,
    feeRate,
  })

  const mintFee = perMintFee * (repeat - 1) + postage

  const { data: btcUtxos } = await retry(
    openApi.getAddressUtxos.bind(openApi),
    Number.MAX_SAFE_INTEGER,
  )(wallet.address, { cursor: 0, size: 100 })

  const commitTx = await createCommitTx({
    wallet,
    runestone: mintstone,
    utxos: btcUtxos.utxo,
    outputs: [
      {
        address: repeat > 1 ? mintWallet.address : destination,
        satoshis: mintFee,
      },
    ],
    feeRate,
  })

  const mintTxs = await createMintTxs({
    wallet: mintWallet,
    runestone: mintstone,
    count: repeat - 1,
    commitTxId: commitTx.id,
    commitTxAmount: mintFee,
    perMintFee,
    toAddress: destination,
    feeRate,
  })

  const networkFee = calTxFee(commitTx.size, feeRate)
  const totalFee = mintFee + networkFee

  console.log(`
Rune: ${c.bold(`${c.dim(c.green(`${id}`))} ${c.green(`x ${repeat}`)}`)}

Payment Address: ${c.bold(c.dim(wallet.address))}
Receive Address: ${c.bold(c.dim(destination))}

Commit Tx: ${c.bold(c.dim(c.green(commitTx.id)))}
Fee Rate: ${c.bold(c.yellow(feeRate))}
Fee: ${c.bold(c.green(`${totalFee} sats`))} ${c.dim(`(Mint Fee: ${c.green(`${mintFee} sats`)}, Network Fee: ${c.green(`${networkFee} sats`)}) →`)} ${c.bold(c.green(`${totalFee / 1e8} ${TOKEN_SYMBOL}`))}
`)

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Confirm to submit?',
    initial: true,
  })

  if (!confirm) return

  const mintWalletPrivateKey = await mintWallet.keyring.exportAccount(
    mintWallet.pubkey,
  )

  const dump = {
    rune: id,
    count: repeat,
    payment: wallet.address,
    destination,
    mintWallet: {
      address: mintWallet.address,
      privateKey: mintWalletPrivateKey,
    },
    feeRate,
    spendSats: totalFee,
    commitTxId: commitTx.id,
    commitTxHex: commitTx.hex,
    mintTxIds: mintTxs.map((tx) => tx.id),
    mintTxHexes: mintTxs.map((tx) => tx.hex),
  }

  await writeFile('data/dump.json', `${JSON.stringify(dump, null, 2)}\n`)
  await writeFile(
    `data/archive/${dayjs().format('YYYY-MM-DD HH:mm:ss')}.json`,
    `${JSON.stringify(dump, null, 2)}\n`,
  )

  await pushTxs(
    commitTx.hex,
    mintTxs.map((tx) => tx.hex),
  )
}

run()
