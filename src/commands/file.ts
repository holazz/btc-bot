import 'dotenv/config'
import fsp from 'node:fs/promises'
import { join } from 'node:path'
import c from 'picocolors'
import prompts from 'prompts'
import dayjs from 'dayjs'
import mime from 'mime/lite'
import {
  buildTx,
  createCommitPsbt,
  createInscriptionTapScript,
  createRevealPsbt,
  estimateRevealTxSize,
  pushTxs,
} from '../helpers/inscriber'
import logger from '../utils/logger'
import { resolveConfig, retry, writeFile } from '../utils'
import { getFeeRate, openApi } from '../api'
import { TOKEN_SYMBOL } from '../constants'

async function resolveFiles() {
  const filesDir = 'data/files'
  const files = await fsp.readdir(filesDir)
  const promises = files.map(async (filename) => {
    const mimetype = mime.getType(filename) || 'application/octet-stream'
    const content = await fsp.readFile(join(filesDir, filename))
    return { filename, mimetype, content }
  })
  return Promise.all(promises)
}

async function run() {
  const {
    wallet,
    destination,
    postage,
    feeRate: initialFeeRate,
  } = await resolveConfig()

  const files = await resolveFiles()
  const count = files.length

  const feeRate = await getFeeRate(initialFeeRate)

  const revealTxScripts = await Promise.all(
    files.map(async ({ mimetype, content }) => {
      const { scriptTaproot, tapLeafScript } = createInscriptionTapScript(
        wallet,
        {
          mimetype,
          content,
        },
      )

      const revealTxSize = await estimateRevealTxSize({
        wallet,
        destination,
        scriptTaproot,
        tapLeafScript,
      })
      const revealTxFee = revealTxSize * feeRate
      const revealTxAmount = revealTxFee + postage

      return {
        scriptTaproot,
        tapLeafScript,
        revealTxAmount,
      }
    }),
  )

  const { data: btcUtxos } = await retry(
    openApi.getAddressUtxos.bind(openApi),
    Number.MAX_SAFE_INTEGER,
  )(wallet.address, { cursor: 0, size: 100 })

  const commitPsbt = await createCommitPsbt({
    wallet,
    utxos: btcUtxos.utxo,
    outputs: revealTxScripts.map(({ scriptTaproot, revealTxAmount }) => ({
      address: scriptTaproot.address,
      satoshis: revealTxAmount,
    })),
    feeRate,
  }).catch((e) => {
    logger.error(e.message)
    process.exit(0)
  })

  const commitTx = buildTx(commitPsbt)

  const revealTxs = await Promise.all(
    revealTxScripts.map(
      async ({ scriptTaproot, tapLeafScript, revealTxAmount }, index) => {
        const psbt = await createRevealPsbt({
          wallet,
          commitTxId: commitTx.id,
          index,
          inputValue: revealTxAmount,
          destination,
          postage,
          scriptTaproot,
          tapLeafScript,
        })
        return buildTx(psbt)
      },
    ),
  )

  const inscribeFee = revealTxScripts.reduce(
    (acc, { revealTxAmount }) => acc + revealTxAmount,
    0,
  )
  const networkFee = commitTx.size * feeRate
  const totalFee = inscribeFee + networkFee

  console.log(`
Files: ${c.green(count)}\n${c.bold(`${c.dim(c.green(`${files.map(({ filename }) => filename).join('\n')}`))}`)}

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
    files: files.map(({ filename }) => filename),
    count,
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
