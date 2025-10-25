import { computed } from 'vue';
import { useAnchorWallet } from 'solana-wallets-vue';
import { Connection, PublicKey } from '@solana/web3.js';
import { Idl, Program, AnchorProvider, Wallet } from '@project-serum/anchor';
import { SolanaTwitter } from '@src/idl/solana_twitter';
import { IWorkspace } from '@src/interface';
import idl from '@src/idl/solana_twitter.json';

const preflightCommitment = 'confirmed';
const commitment = 'confirmed';
const programId = new PublicKey((idl as Idl).metadata.address);
let workspace: IWorkspace;

export const useWorkspace = () => workspace;

export const initWorkspace = () => {
  const wallet = useAnchorWallet();
  // Using QuickNode paid APIs for better performance and reliability
  const connection = new Connection(
    'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
    commitment
  );
  const provider = computed(
    () =>
      new AnchorProvider(connection, wallet.value as Wallet, {
        preflightCommitment,
        commitment,
        skipPreflight: false,
      })
  );
  const program = computed(
    // @ts-ignore
    () => new Program<SolanaTwitter>(idl, programId, provider.value)
  );

  workspace = {
    wallet,
    connection,
    provider,
    program,
  };
};
