## Installation

```bash
pnpm install
```

## Configuration

1. Edit the `.env` file in the root of the project and set the `NETWORK` environment variable:

```bash
NETWORK=<network> # 'btc-mainnet' | 'btc-testnet' | 'fractal-mainnet' | 'fractal-testnet'
```

2. Edit the configuration file in `configs` to match your network:

```typescript
import type { Config } from '../src/types'

const config: Config = {
  /**
   * API key (required)
   * @see {@link https://developer.unisat.io/dashboard}
   */
  apiKey: '',
  /**
   * RPC (optional)
   */
  rpc: {
    url: '',
    username: '',
    password: '',
  },
  /**
   * Fee rate in satoshis per byte (optional)
   */
  feeRate: 1,
  /**
   * Payment wallet (required)
   */
  funding: {
    wif: '', // WIF
    address: '', // Address (optional)
  },
  /**
   * Destination address (optional)
   */
  destination: '',
  /**
   * Text inscription (optional)
   */
  text: {
    content: '',
    repeat: 1,
  },
  /**
   * Rune (optional)
   */
  rune: {
    id: '',
    repeat: 1,
  },
}

export default config
```

## Usage

### Inscribe Text

```bash
pnpm run text
```

### Inscribe File

Place the files in the `data/files` folder and run the following command:

```bash
pnpm run file
```

### Mint Rune

```bash
pnpm run rune
```
