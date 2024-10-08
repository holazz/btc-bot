import { access, copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from '../src/utils'
import { NETWORK_NAMES } from '../src/constants'
import logger from '../src/utils/logger'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT_DIR, 'data/files')
const CONFIGS_DIR = join(ROOT_DIR, 'configs')

function generateConfig() {
  return `import type { Config } from '../src/types'

const config: Config = {
  apiKey: '',
  rpc: {
    url: '',
    username: '',
    password: '',
  },
  feeRate: 1,
  funding: {
    wif: '',
    address: '',
  },
  destination: '',
  text: {
    content: '',
    repeat: 1,
  },
  rune: {
    id: '',
    repeat: 1,
  },
}

export default config
`
}

async function createConfigFiles(directory: string) {
  const promises = NETWORK_NAMES.map(async (network) => {
    const config = generateConfig()
    const filename = `${network}.ts`
    const filepath = join(directory, filename)
    try {
      await access(filepath)
    } catch {
      await writeFile(filepath, config)
      logger.success(`Created: ${relative(ROOT_DIR, filepath)}`)
    }
  })
  await Promise.all(promises)
}

async function createDirectories(directories: string[]) {
  const promises = directories.map(async (directory) => {
    try {
      await access(directory)
    } catch {
      await mkdir(directory, { recursive: true })
      logger.success(`Created: ${relative(ROOT_DIR, directory)}`)
    }
  })

  await Promise.all(promises)
}

async function cloneExampleFiles(directory: string) {
  try {
    const files = await readdir(directory)
    const exampleFiles = files.filter((file) => file.endsWith('.example'))

    await Promise.all(
      exampleFiles.map(async (file) => {
        const targetFile = file.replace('.example', '')
        const sourcePath = join(directory, file)
        const targetPath = join(directory, targetFile)
        try {
          await access(targetPath)
        } catch {
          await copyFile(sourcePath, targetPath)
          logger.success(`Cloned: ${file} → ${targetFile}`)
        }
      }),
    )
  } catch (e) {
    console.error('Error cloning example files:', e)
  }
}

async function run() {
  await Promise.all([
    createDirectories([DATA_DIR]),
    createConfigFiles(CONFIGS_DIR),
    cloneExampleFiles(ROOT_DIR),
  ])
}

run()
