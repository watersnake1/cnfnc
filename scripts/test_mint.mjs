import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';

const NFT_PROVER = '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e';

const pA = [
  BigInt('0x0e8b50766056fc237776012e095ceb231389777c44e4efce232388614baa7414'),
  BigInt('0x27964221445a8aa13acc6b59f0367a4e70d63eb279d3e4da9e1b427935b08a9c'),
];
const pB = [
  [BigInt('0x016f1929c8c56d2b7e97276f8147c14e401f498b2acbe25938c5c23faa5c8ee2'), BigInt('0x0f0f35e60910bf5b4a8832b94f74991d58ccfb5a2014d6f6b0c7cb3b962ae7e3')],
  [BigInt('0x2ae9d3cf05686ce78126727fe87e26b40c359ec359d931c8a17af009f0a1feb4'), BigInt('0x179d05f1a2e73f612bbb287b1868a697ec66da068818651ba1786ad37c92cb88')],
];
const pC = [
  BigInt('0x0697e07c90688070b6291ffebf8749bb4b5d199720c415148287d755e0f647f7'),
  BigInt('0x23ffc55f71f10599078d07277da5fc477549bf1ce72696ea6d4371ef7a67dc63'),
];
const pubSignals = [
  BigInt('0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8'),
  BigInt('0x2ad27db282f3d26975af3ada7bc73a6d90062378f6199a2a1fe759d7f66a9404'),
  BigInt('0x116da978dbf8205678d762c4dfc9c2f5284120db8e18a80de3d7c64eb61e0f25'),
];

const abi = [{
  name: 'mint',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'pA', type: 'uint256[2]' },
    { name: 'pB', type: 'uint256[2][2]' },
    { name: 'pC', type: 'uint256[2]' },
    { name: 'pubSignals', type: 'uint256[3]' },
  ],
  outputs: [{ name: 'tokenId', type: 'uint256' }],
},{
  name: 'hasBadge',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'walletB', type: 'address' }],
  outputs: [{ name: '', type: 'bool' }],
}];

const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
const publicClient = createPublicClient({ chain: anvil, transport: http() });
const walletClient = createWalletClient({ account, chain: anvil, transport: http() });

try {
  const sim = await publicClient.simulateContract({
    address: NFT_PROVER,
    abi,
    functionName: 'mint',
    args: [pA, pB, pC, pubSignals],
    account: account.address,
  });
  console.log('Simulation OK, tokenId:', sim.result);

  const hash = await walletClient.writeContract(sim.request);
  console.log('TX hash:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status);
  
  const hasBadge = await publicClient.readContract({
    address: NFT_PROVER,
    abi,
    functionName: 'hasBadge',
    args: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
  });
  console.log('hasBadge after mint:', hasBadge);
} catch(e) {
  console.error('FAILED:', e.shortMessage || e.message || String(e));
}
