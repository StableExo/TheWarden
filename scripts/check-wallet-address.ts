import { Wallet } from 'ethers';

// The old private key from memory
const oldKey = "0x7811789d56a43229d0e4a01ff226af0153b69727b64056cd844e8c6d0c133e72";
const oldWallet = new Wallet(oldKey);
console.log("Old key from memory generates:", oldWallet.address);

// Expected address from StableExo
const expectedAddress = "0x4c1b46be097024e5712eb3f97b46d2ecf2b531d7";
console.log("Expected address from StableExo:", expectedAddress);
console.log("Match:", oldWallet.address.toLowerCase() === expectedAddress.toLowerCase());
