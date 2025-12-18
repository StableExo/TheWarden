import { Wallet } from 'ethers';

const newKey = "0x34240829e275219b8b32b0b53cb10bf83c5f0cbc44f887af61f1114e4401849b";
const wallet = new Wallet(newKey);
console.log("New private key generates address:", wallet.address);
console.log("Expected address:", "0x4c1b46be097024e5712eb3f97b46d2ecf2b531d7");
console.log("Match:", wallet.address.toLowerCase() === "0x4c1b46be097024e5712eb3f97b46d2ecf2b531d7");
