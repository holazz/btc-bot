import { copyFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import logger from '../src/utils/logger'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

async function cloneExampleFiles(directory: string) {
  try {
    const files = await readdir(directory)
    const exampleFiles = files.filter((file) => file.endsWith('.example.ts'))

    await Promise.all(
      exampleFiles.map(async (file) => {
        const targetFile = file.replace('.example.ts', '.ts')
        const sourcePath = join(directory, file)
        const targetPath = join(directory, targetFile)
        await copyFile(sourcePath, targetPath)
        logger.success(`Cloned: ${file} → ${targetFile}`)
      }),
    )
    console.log()
  } catch (e) {
    console.error('Error cloning example files:', e)
  }
}

cloneExampleFiles(ROOT_DIR)
