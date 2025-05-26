// NobelVestingUI.tsx

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet, UseWalletProvider } from "use-wallet";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import "tailwindcss/tailwind.css";

const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE";
const ABI = [ /* ABI JSON from compiled contract */ ];

const provider = new ethers.providers.Web3Provider(window.ethereum);

function NobelVestingUI() {
  const wallet = useWallet();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [claimable, setClaimable] = useState<string>("0");
  const [isAdmin, setIsAdmin] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [merkleProof, setMerkleProof] = useState<string>("");

  useEffect(() => {
    if (wallet.account && provider) {
      const signer = provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      setContract(contractInstance);

      // Check if wallet.account has ADMIN_ROLE
      contractInstance.ADMIN_ROLE().then((role: string) => {
        contractInstance.hasRole(role, wallet.account).then(setIsAdmin);
      });

      // Fetch claimable tokens
      contractInstance.claimableTokens().then((val: ethers.BigNumber) => {
        setClaimable(ethers.utils.formatUnits(val, 18));
      });
    }
  }, [wallet.account]);

  async function handleClaim() {
    if (!contract) return;
    setTxStatus("Waiting for confirmation...");
    try {
      let tx;
      if (isAdmin) {
        tx = await contract.claim();
      } else {
        // User claims with merkle proof, parse proof string JSON
        const proofArray = JSON.parse(merkleProof);
        const claimAmount = ethers.utils.parseUnits(claimable, 18);
        tx = await contract.claimWithProof(claimAmount, proofArray);
      }
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Claim successful!");
    } catch (err: any) {
      setTxStatus("Error: " + (err?.message ?? "Unknown error"));
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-xl shadow-lg text-white font-sans">
      <h1 className="text-4xl font-bold mb-4">Nobel Vesting Token Claim</h1>
      {!wallet.account ? (
        <button
          onClick={() => wallet.connect()}
          className="px-6 py-3 bg-green-500 rounded-md hover:bg-green-600"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <p className="mb-2">Connected as: {wallet.account}</p>
          <p className="mb-2 text-lg">
            Claimable Tokens: <span className="font-mono">{claimable}</span>
          </p>

          {!isAdmin && (
            <textarea
              placeholder='Enter Merkle Proof JSON array here (e.g. ["0xabc...", ...])'
              rows={4}
              value={merkleProof}
              onChange={(e) => setMerkleProof(e.target.value)}
              className="w-full p-2 mb-4 text-black rounded"
            />
          )}

          <button
            onClick={handleClaim}
            disabled={claimable === "0" || (!isAdmin && !merkleProof)}
            className={`w-full py-3 font-semibold rounded ${
              claimable === "0" || (!isAdmin && !merkleProof)
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Claim Tokens
          </button>

          {txStatus && <p className="mt-4">{txStatus}</p>}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <UseWalletProvider chainId={1}>
      <NobelVestingUI />
    </UseWalletProvider>
  );
}
