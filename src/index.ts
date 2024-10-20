import { resolve } from 'node:path'
import prompts from 'prompts'

async function run() {
  const { command } = await prompts({
    type: 'select',
    name: 'command',
    message: 'Choose a command to run',
    choices: [
      {
        title: 'Mint Rune',
        value: resolve('src/commands/rune.ts'),
      },
      {
        title: 'Inscribe Text',
        value: resolve('src/commands/text.ts'),
      },
      {
        title: 'Inscribe File',
        value: resolve('src/commands/file.ts'),
      },
      {
        title: 'Broadcast Transaction',
        value: resolve('src/commands/broadcast.ts'),
      },
    ],
  })

  if (!command) return
  await import(command)
}

run()
