import c from 'picocolors'
import prompts from 'prompts'
import dayjs from 'dayjs'
import {
  createCommitTx,
  createInscriptionTapScript,
  createRevealTx,
  estimateRevealTxSize,
  pushTxs,
} from '../helpers/ordinals'
import logger from '../utils/logger'
import { calTxFee, resolveConfig, retry, writeFile } from '../utils'
import { getFeeRate, openApi } from '../api'
import { TOKEN_SYMBOL } from '../constants'

async function run() {
  const {
    wallet,
    destination,
    postage,
    feeRate: initialFeeRate,
    text,
  } = await resolveConfig()

  const { content, repeat } = text!

  const feeRate = await getFeeRate(initialFeeRate)

  const { scriptTaproot, tapLeafScript } = createInscriptionTapScript(wallet, {
    mimetype: 'text/plain',
    content: Buffer.from(content, 'utf-8'),
  })

  const revealTxSize = await estimateRevealTxSize({
    wallet,
    destination,
    scriptTaproot,
    tapLeafScript,
  })
  const revealTxFee = calTxFee(revealTxSize, feeRate)
  const revealTxAmount = revealTxFee + postage

  const { data: btcUtxos } = await retry(
    openApi.getAddressUtxos.bind(openApi),
    Number.MAX_SAFE_INTEGER,
  )(wallet.address, { cursor: 0, size: 100 })

  const commitTx = await createCommitTx({
    wallet,
    utxos: btcUtxos.utxo,
    outputs: Array(repeat).fill({
      address: scriptTaproot.address,
      satoshis: revealTxAmount,
    }),
    feeRate,
  }).catch((e) => {
    logger.error(e.message)
    process.exit(0)
  })

  const revealTxs = await Promise.all(
    Array.from({ length: repeat }, async (_, i) =>
      createRevealTx({
        wallet,
        commitTxId: commitTx.id,
        index: i,
        inputValue: revealTxAmount,
        destination,
        postage,
        scriptTaproot,
        tapLeafScript,
      }),
    ),
  )

  const inscribeFee = revealTxAmount * repeat
  const networkFee = calTxFee(commitTx.size, feeRate)
  const totalFee = inscribeFee + networkFee

  console.log(`
Inscription: ${c.bold(`${c.dim(c.green(`${content}`))} ${c.green(`x ${repeat}`)}`)}

Payment Address: ${c.bold(c.dim(wallet.address))}
Receive Address: ${c.bold(c.dim(destination))}

Commit Tx: ${c.bold(c.dim(c.green(commitTx.id)))}
Fee Rate: ${c.bold(c.yellow(feeRate))}
Fee: ${c.bold(c.green(`${totalFee} sats`))} ${c.dim(`(Inscribe Fee: ${c.green(`${inscribeFee} sats`)}, Network Fee: ${c.green(`${networkFee} sats`)}) →`)} ${c.bold(c.green(`${totalFee / 1e8} ${TOKEN_SYMBOL}`))}
`)

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Confirm to submit?',
    initial: true,
  })

  if (!confirm) return

  const dump = {
    inscription: JSON.parse(content),
    count: repeat,
    payment: wallet.address,
    destination,
    feeRate,
    spendSats: totalFee,
    commitTxId: commitTx.id,
    commitTxHex: commitTx.hex,
    revealTxIds: revealTxs.map((tx) => tx.id),
    revealTxHexes: revealTxs.map((tx) => tx.hex),
  }

  await writeFile('data/dump.json', `${JSON.stringify(dump, null, 2)}\n`)
  await writeFile(
    `data/archive/${dayjs().format('YYYY-MM-DD HH:mm:ss')}.json`,
    `${JSON.stringify(dump, null, 2)}\n`,
  )

  await pushTxs(
    commitTx.hex,
    revealTxs.map((tx) => tx.hex),
  )
}

run()
