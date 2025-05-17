import { http, createConfig } from '@wagmi/core'
import { mainnet, sepolia , liskSepolia} from '@wagmi/core/chains'

export const config = createConfig({
  chains: [mainnet, sepolia, liskSepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    // [liskSepolia.id]: http('https://rpc.sepolia-api.lisk.com', {
    //     retryCount: 5,
    //     batch: false
    // }),
    // [liskSepolia.id]: http(),
    [liskSepolia.id]: http('https://rpc.sepolia-api.lisk.com', { retryCount: 5, retryDelay: 1000 }),
  },
})
