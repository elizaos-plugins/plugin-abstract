// src/actions/transferAction.ts
import {
  ModelClass,
  elizaLogger as elizaLogger2,
  composeContext,
  generateObject,
  stringToUuid
} from "@elizaos/core";

// src/environment.ts
import { isAddress } from "viem";
import { z } from "zod";
var abstractEnvSchema = z.object({
  ABSTRACT_ADDRESS: z.string().min(1, "Abstract address is required").refine((address) => isAddress(address, { strict: false }), {
    message: "Abstract address must be a valid address"
  }),
  ABSTRACT_PRIVATE_KEY: z.string().min(1, "Abstract private key is required").refine((key) => /^[a-fA-F0-9]{64}$/.test(key), {
    message: "Abstract private key must be a 64-character hexadecimal string (32 bytes) without the '0x' prefix"
  })
});
async function validateAbstractConfig(runtime) {
  try {
    const config = {
      ABSTRACT_ADDRESS: runtime.getSetting("ABSTRACT_ADDRESS"),
      ABSTRACT_PRIVATE_KEY: runtime.getSetting("ABSTRACT_PRIVATE_KEY")
    };
    return abstractEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `Abstract configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/actions/transferAction.ts
import { erc20Abi, formatUnits, isAddress as isAddress3, parseUnits } from "viem";
import { abstractTestnet as abstractTestnet3 } from "viem/chains";
import { createAbstractClient } from "@abstract-foundation/agw-client";
import { z as z2 } from "zod";

// src/constants/index.ts
var ETH_ADDRESS = "0x000000000000000000000000000000000000800A";

// src/hooks/useGetAccount.ts
import { privateKeyToAccount } from "viem/accounts";
var useGetAccount = (runtime) => {
  const PRIVATE_KEY = runtime.getSetting("ABSTRACT_PRIVATE_KEY");
  if (!PRIVATE_KEY) {
    throw new Error("ABSTRACT_PRIVATE_KEY is not set");
  }
  return privateKeyToAccount(`0x${PRIVATE_KEY}`);
};

// src/hooks/useGetWalletClient.ts
import { createWalletClient, http } from "viem";
import { abstractTestnet } from "viem/chains";
import { eip712WalletActions } from "viem/zksync";
var useGetWalletClient = () => {
  const client = createWalletClient({
    chain: abstractTestnet,
    transport: http()
  }).extend(eip712WalletActions());
  return client;
};

// src/utils/viemHelpers.ts
import {
  createPublicClient,
  getAddress,
  http as http2,
  isAddress as isAddress2
} from "viem";
import { abstractTestnet as abstractTestnet2, mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { elizaLogger } from "@elizaos/core";
var ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http2()
});
var abstractPublicClient = createPublicClient({
  chain: abstractTestnet2,
  transport: http2()
});
async function resolveAddress(addressOrEns) {
  if (isAddress2(addressOrEns)) {
    return getAddress(addressOrEns);
  }
  let address;
  try {
    const name = normalize(addressOrEns.trim());
    const resolved = await ethereumClient.getEnsAddress({ name });
    if (resolved) {
      address = resolved;
      elizaLogger.log(`Resolved ${name} to ${resolved}`);
    }
  } catch (error) {
    elizaLogger.error("Error resolving ENS name:", error);
  }
  return address ? getAddress(address) : null;
}
var tokens = [
  {
    address: ETH_ADDRESS,
    symbol: "ETH",
    decimals: 18
  },
  {
    address: "0xe4c7fbb0a626ed208021ccaba6be1566905e2dfc",
    symbol: "USDC",
    decimals: 6
  }
];
function getTokenByName(name) {
  const token = tokens.find(
    (token2) => token2.symbol.toLowerCase() === name.toLowerCase()
  );
  if (!token) {
    throw new Error(`Token ${name} not found`);
  }
  return token;
}

// src/actions/transferAction.ts
var TransferSchema = z2.object({
  tokenAddress: z2.string().optional().nullable(),
  recipient: z2.string(),
  amount: z2.string(),
  useAGW: z2.boolean(),
  tokenSymbol: z2.string().optional().nullable()
});
var validatedTransferSchema = z2.object({
  tokenAddress: z2.string().refine(isAddress3, { message: "Invalid token address" }),
  recipient: z2.string().refine(isAddress3, { message: "Invalid recipient address" }),
  amount: z2.string(),
  useAGW: z2.boolean()
});
var transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "<TOKEN_ADDRESS>",
    "recipient": "<TOKEN_ADDRESS>",
    "amount": "1000",
    "useAGW": true,
    "tokenSymbol": "USDC"
}
\`\`\`

User message:
"{{currentMessage}}"

Given the message, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer
- Whether to use Abstract Global Wallet aka AGW
- The symbol of the token that wants to be transferred. Between 1 to 6 characters usually.

If the user did not specify "global wallet", "AGW", "agw", or "abstract global wallet" in their message, set useAGW to false, otherwise set it to true.
s
Respond with a JSON markdown block containing only the extracted values.`;
var transferAction = {
  name: "SEND_TOKEN",
  similes: [
    "TRANSFER_TOKEN_ON_ABSTRACT",
    "TRANSFER_TOKENS_ON_ABSTRACT",
    "SEND_TOKENS_ON_ABSTRACT",
    "SEND_ETH_ON_ABSTRACT",
    "PAY_ON_ABSTRACT",
    "MOVE_TOKENS_ON_ABSTRACT",
    "MOVE_ETH_ON_ABSTRACT"
  ],
  // eslint-disable-next-line
  validate: async (runtime) => {
    await validateAbstractConfig(runtime);
    return true;
  },
  description: "Transfer tokens from the agent's wallet to another address",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger2.log("Starting Abstract SEND_TOKEN handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    currentState.currentMessage = `${currentState.recentMessagesData[1].content.text}`;
    const transferContext = composeContext({
      state: currentState,
      template: transferTemplate
    });
    const content = (await generateObject({
      runtime,
      context: transferContext,
      modelClass: ModelClass.SMALL,
      schema: TransferSchema
    })).object;
    let tokenAddress = content.tokenAddress;
    if (content.tokenSymbol) {
      const tokenMemory = await runtime.messageManager.getMemoryById(
        stringToUuid(`${content.tokenSymbol}-${runtime.agentId}`)
      );
      if (typeof ((_a = tokenMemory == null ? void 0 : tokenMemory.content) == null ? void 0 : _a.tokenAddress) === "string") {
        tokenAddress = tokenMemory.content.tokenAddress;
      }
      if (!tokenAddress) {
        tokenAddress = (_b = getTokenByName(content.tokenSymbol)) == null ? void 0 : _b.address;
      }
    }
    const resolvedRecipient = await resolveAddress(content.recipient);
    const input = {
      tokenAddress,
      recipient: resolvedRecipient,
      amount: content.amount.toString(),
      useAGW: content.useAGW
    };
    const result = validatedTransferSchema.safeParse(input);
    if (!result.success) {
      elizaLogger2.error(
        "Invalid content for TRANSFER_TOKEN action.",
        result.error.message
      );
      if (callback) {
        callback({
          text: "Unable to process transfer request. Did not extract valid parameters.",
          content: { error: result.error.message, ...input }
        });
      }
      return false;
    }
    if (!resolvedRecipient) {
      throw new Error("Invalid recipient address or ENS name");
    }
    try {
      const account = useGetAccount(runtime);
      let symbol = "ETH";
      let decimals = 18;
      const isEthTransfer = result.data.tokenAddress === ETH_ADDRESS;
      const { tokenAddress: tokenAddress2, recipient, amount, useAGW } = result.data;
      if (!isEthTransfer) {
        [symbol, decimals] = await Promise.all([
          abstractPublicClient.readContract({
            address: tokenAddress2,
            abi: erc20Abi,
            functionName: "symbol"
          }),
          abstractPublicClient.readContract({
            address: tokenAddress2,
            abi: erc20Abi,
            functionName: "decimals"
          })
        ]);
      }
      let hash;
      const tokenAmount = parseUnits(amount.toString(), decimals);
      if (useAGW) {
        const abstractClient = await createAbstractClient({
          chain: abstractTestnet3,
          signer: account
        });
        if (isEthTransfer) {
          hash = await abstractClient.sendTransaction({
            chain: abstractTestnet3,
            to: recipient,
            value: tokenAmount,
            kzg: void 0
          });
        } else {
          hash = await abstractClient.writeContract({
            chain: abstractTestnet3,
            address: tokenAddress2,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, tokenAmount]
          });
        }
      } else {
        const walletClient = useGetWalletClient();
        if (isEthTransfer) {
          hash = await walletClient.sendTransaction({
            account,
            chain: abstractTestnet3,
            to: recipient,
            value: tokenAmount,
            kzg: void 0
          });
        } else {
          hash = await walletClient.writeContract({
            account,
            chain: abstractTestnet3,
            address: tokenAddress2,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, tokenAmount]
          });
        }
      }
      elizaLogger2.success(
        `Transfer completed successfully! Transaction hash: ${hash}`
      );
      if (callback) {
        callback({
          text: `Transfer completed successfully! Succesfully sent ${formatUnits(tokenAmount, decimals)} ${symbol} to ${recipient} using ${useAGW ? "AGW" : "wallet client"}. Transaction hash: ${hash}`,
          content: {
            hash,
            tokenAmount: formatUnits(tokenAmount, decimals),
            symbol,
            recipient,
            useAGW
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger2.error("Error during token transfer:", error);
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll send 0.01 ETH to that address now.",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4\nTransaction: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4 using your abstract global wallet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll send 0.01 ETH to that address now using my AGW.",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4\nTransaction: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b using my AGW"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 0.01 ETH to alim.getclave.eth"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll send 0.01 ETH to alim.getclave.eth now.",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 0.01 ETH to alim.getclave.eth\nTransaction: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 100 USDC to 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll send 100 USDC to that address now.",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 100 USDC to 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62\nTransaction: 0x4fed598033f0added272c3ddefd4d83a521634a738474400b27378db462a76ec"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Please send 0.1 ETH to 0xbD8679cf79137042214fA4239b02F4022208EE82"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Of course. Sending 0.1 ETH to that address now.",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 0.1 ETH to 0xbD8679cf79137042214fA4239b02F4022208EE82\nTransaction: 0x0b9f23e69ea91ba98926744472717960cc7018d35bc3165bdba6ae41670da0f0"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Please send 1 MyToken to 0xbD8679cf79137042214fA4239b02F4022208EE82"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Of course. Sending 1 MyToken right away.",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 1 MyToken to 0xbD8679cf79137042214fA4239b02F4022208EE82\nTransaction: 0x0b9f23e69ea91ba98926744472717960cc7018d35bc3165bdba6ae41670da0f0"
        }
      }
    ]
  ]
};

// src/actions/getBalanceAction.ts
import {
  ModelClass as ModelClass2,
  elizaLogger as elizaLogger3,
  composeContext as composeContext2,
  generateObject as generateObject2,
  stringToUuid as stringToUuid2
} from "@elizaos/core";
import { erc20Abi as erc20Abi2, formatUnits as formatUnits2, isAddress as isAddress4 } from "viem";
import { z as z3 } from "zod";
var BalanceSchema = z3.object({
  tokenAddress: z3.string().optional().nullable(),
  walletAddress: z3.string().optional().nullable(),
  tokenSymbol: z3.string().optional().nullable()
});
var validatedSchema = z3.object({
  tokenAddress: z3.string().refine(isAddress4, { message: "Invalid token address" }),
  walletAddress: z3.string().refine(isAddress4, { message: "Invalid token address" })
});
var balanceTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.


Example response:
\`\`\`json
{
    "tokenAddress": "<TOKEN_ADDRESS>",
    "walletAddress": "<TOKEN_ADDRESS>",
    "tokenSymbol": "USDC"
}
\`\`\`

User message:
"{{currentMessage}}"

Given the message, extract the following information about the requested balance check:
- Token contract address (optional, if not specified set to null)
- Wallet address to check (optional, if not specified set to null)
- The symbol of the token to check (optional, if not specified set to null). Between 1 to 6 characters usually.

Respond with a JSON markdown block containing only the extracted values.`;
var getBalanceAction = {
  name: "GET_BALANCE",
  similes: [
    "CHECK_BALANCE",
    "VIEW_BALANCE",
    "SHOW_BALANCE",
    "BALANCE_CHECK",
    "TOKEN_BALANCE"
  ],
  validate: async (runtime, _message) => {
    await validateAbstractConfig(runtime);
    return true;
  },
  description: "Check token balance for a given address",
  handler: async (runtime, message, state, _options, callback) => {
    var _a, _b;
    elizaLogger3.log("Starting Abstract GET_BALANCE handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    currentState.currentMessage = `${currentState.recentMessagesData[1].content.text}`;
    const balanceContext = composeContext2({
      state: currentState,
      template: balanceTemplate
    });
    const content = (await generateObject2({
      runtime,
      context: balanceContext,
      modelClass: ModelClass2.SMALL,
      schema: BalanceSchema
    })).object;
    try {
      const account = useGetAccount(runtime);
      const addressToCheck = content.walletAddress || account.address;
      const resolvedAddress = await resolveAddress(addressToCheck);
      if (!resolvedAddress) {
        throw new Error("Invalid address or ENS name");
      }
      let tokenAddress = content.tokenAddress;
      if (content.tokenSymbol) {
        const tokenMemory = await runtime.messageManager.getMemoryById(
          stringToUuid2(`${content.tokenSymbol}-${runtime.agentId}`)
        );
        if (typeof ((_a = tokenMemory == null ? void 0 : tokenMemory.content) == null ? void 0 : _a.tokenAddress) === "string") {
          tokenAddress = tokenMemory.content.tokenAddress;
        }
        if (!tokenAddress) {
          tokenAddress = (_b = getTokenByName(content.tokenSymbol)) == null ? void 0 : _b.address;
        }
      }
      const result = validatedSchema.safeParse({
        tokenAddress: tokenAddress || ETH_ADDRESS,
        walletAddress: resolvedAddress
      });
      if (!result.success) {
        elizaLogger3.error("Invalid content for GET_BALANCE action.");
        if (callback) {
          callback({
            text: "Unable to process balance request. Invalid content provided.",
            content: { error: "Invalid balance content" }
          });
        }
        return false;
      }
      let balance;
      let symbol;
      let decimals;
      if (result.data.tokenAddress === ETH_ADDRESS) {
        balance = await abstractPublicClient.getBalance({
          address: resolvedAddress
        });
        symbol = "ETH";
        decimals = 18;
      } else {
        [balance, decimals, symbol] = await Promise.all([
          abstractPublicClient.readContract({
            address: result.data.tokenAddress,
            abi: erc20Abi2,
            functionName: "balanceOf",
            args: [resolvedAddress]
          }),
          abstractPublicClient.readContract({
            address: result.data.tokenAddress,
            abi: erc20Abi2,
            functionName: "decimals"
          }),
          abstractPublicClient.readContract({
            address: result.data.tokenAddress,
            abi: erc20Abi2,
            functionName: "symbol"
          })
        ]);
      }
      const formattedBalance = formatUnits2(balance, decimals);
      elizaLogger3.success(`Balance check completed for ${resolvedAddress}`);
      if (callback) {
        callback({
          text: `Balance for ${resolvedAddress}: ${formattedBalance} ${symbol}`,
          content: { balance: formattedBalance, symbol }
        });
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error checking balance:", error);
      if (callback) {
        callback({
          text: `Error checking balance: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's my ETH balance?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check your ETH balance.",
          action: "GET_BALANCE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Your ETH balance is 1.5 ETH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check USDC balance for 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the USDC balance for that address.",
          action: "GET_BALANCE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "The USDC balance for 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62 is 100 USDC"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check balance for 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62 with token 0xe4c7fbb0a626ed208021ccaba6be1566905e2dfc"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Let me check the balance for that address.",
          action: "GET_BALANCE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "The balance for 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62 with token 0xe4c7fbb0a626ed208021ccaba6be1566905e2dfc is 100"
        }
      }
    ]
  ]
};

// src/actions/deployTokenAction.ts
import {
  ModelClass as ModelClass3,
  elizaLogger as elizaLogger4,
  composeContext as composeContext3,
  generateObject as generateObject3,
  stringToUuid as stringToUuid3
} from "@elizaos/core";
import { parseEther } from "viem";
import { abstractTestnet as abstractTestnet4 } from "viem/chains";
import {
  createAbstractClient as createAbstractClient2
} from "@abstract-foundation/agw-client";
import { z as z4 } from "zod";

// src/constants/contracts/basicToken.json
var basicToken_default = {
  _format: "hh-sol-artifact-1",
  contractName: "BasicToken",
  sourceName: "contracts/BasicToken.sol",
  abi: [
    {
      inputs: [
        {
          internalType: "string",
          name: "name",
          type: "string"
        },
        {
          internalType: "string",
          name: "symbol",
          type: "string"
        },
        {
          internalType: "uint256",
          name: "initialSupply",
          type: "uint256"
        }
      ],
      stateMutability: "nonpayable",
      type: "constructor"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address"
        },
        {
          internalType: "uint256",
          name: "allowance",
          type: "uint256"
        },
        {
          internalType: "uint256",
          name: "needed",
          type: "uint256"
        }
      ],
      name: "ERC20InsufficientAllowance",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address"
        },
        {
          internalType: "uint256",
          name: "balance",
          type: "uint256"
        },
        {
          internalType: "uint256",
          name: "needed",
          type: "uint256"
        }
      ],
      name: "ERC20InsufficientBalance",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "approver",
          type: "address"
        }
      ],
      name: "ERC20InvalidApprover",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "receiver",
          type: "address"
        }
      ],
      name: "ERC20InvalidReceiver",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address"
        }
      ],
      name: "ERC20InvalidSender",
      type: "error"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address"
        }
      ],
      name: "ERC20InvalidSpender",
      type: "error"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address"
        },
        {
          indexed: true,
          internalType: "address",
          name: "spender",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256"
        }
      ],
      name: "Approval",
      type: "event"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address"
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address"
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256"
        }
      ],
      name: "Transfer",
      type: "event"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address"
        },
        {
          internalType: "address",
          name: "spender",
          type: "address"
        }
      ],
      name: "allowance",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address"
        },
        {
          internalType: "uint256",
          name: "value",
          type: "uint256"
        }
      ],
      name: "approve",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool"
        }
      ],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address"
        }
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [
        {
          internalType: "uint8",
          name: "",
          type: "uint8"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "name",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "to",
          type: "address"
        },
        {
          internalType: "uint256",
          name: "value",
          type: "uint256"
        }
      ],
      name: "transfer",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool"
        }
      ],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "from",
          type: "address"
        },
        {
          internalType: "address",
          name: "to",
          type: "address"
        },
        {
          internalType: "uint256",
          name: "value",
          type: "uint256"
        }
      ],
      name: "transferFrom",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool"
        }
      ],
      stateMutability: "nonpayable",
      type: "function"
    }
  ],
  bytecode: "0x608060405234801561001057600080fd5b506040516117bf3803806117bf833981810160405281019061003291906104c6565b828281600390816100439190610768565b5080600490816100539190610768565b505050610066338261006e60201b60201c565b50505061095a565b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036100e05760006040517fec442f050000000000000000000000000000000000000000000000000000000081526004016100d7919061087b565b60405180910390fd5b6100f2600083836100f660201b60201c565b5050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361014857806002600082825461013c91906108c5565b9250508190555061021b565b60008060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050818110156101d4578381836040517fe450d38c0000000000000000000000000000000000000000000000000000000081526004016101cb93929190610908565b60405180910390fd5b8181036000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550505b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361026457806002600082825403925050819055506102b1565b806000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161030e919061093f565b60405180910390a3505050565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61038282610339565b810181811067ffffffffffffffff821117156103a1576103a061034a565b5b80604052505050565b60006103b461031b565b90506103c08282610379565b919050565b600067ffffffffffffffff8211156103e0576103df61034a565b5b6103e982610339565b9050602081019050919050565b60005b838110156104145780820151818401526020810190506103f9565b60008484015250505050565b600061043361042e846103c5565b6103aa565b90508281526020810184848401111561044f5761044e610334565b5b61045a8482856103f6565b509392505050565b600082601f8301126104775761047661032f565b5b8151610487848260208601610420565b91505092915050565b6000819050919050565b6104a381610490565b81146104ae57600080fd5b50565b6000815190506104c08161049a565b92915050565b6000806000606084860312156104df576104de610325565b5b600084015167ffffffffffffffff8111156104fd576104fc61032a565b5b61050986828701610462565b935050602084015167ffffffffffffffff81111561052a5761052961032a565b5b61053686828701610462565b9250506040610547868287016104b1565b9150509250925092565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806105a357607f821691505b6020821081036105b6576105b561055c565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b60006008830261061e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826105e1565b61062886836105e1565b95508019841693508086168417925050509392505050565b6000819050919050565b600061066561066061065b84610490565b610640565b610490565b9050919050565b6000819050919050565b61067f8361064a565b61069361068b8261066c565b8484546105ee565b825550505050565b600090565b6106a861069b565b6106b3818484610676565b505050565b5b818110156106d7576106cc6000826106a0565b6001810190506106b9565b5050565b601f82111561071c576106ed816105bc565b6106f6846105d1565b81016020851015610705578190505b610719610711856105d1565b8301826106b8565b50505b505050565b600082821c905092915050565b600061073f60001984600802610721565b1980831691505092915050565b6000610758838361072e565b9150826002028217905092915050565b61077182610551565b67ffffffffffffffff81111561078a5761078961034a565b5b610794825461058b565b61079f8282856106db565b600060209050601f8311600181146107d257600084156107c0578287015190505b6107ca858261074c565b865550610832565b601f1984166107e0866105bc565b60005b82811015610808578489015182556001820191506020850194506020810190506107e3565b868310156108255784890151610821601f89168261072e565b8355505b6001600288020188555050505b505050505050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006108658261083a565b9050919050565b6108758161085a565b82525050565b6000602082019050610890600083018461086c565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006108d082610490565b91506108db83610490565b92508282019050808211156108f3576108f2610896565b5b92915050565b61090281610490565b82525050565b600060608201905061091d600083018661086c565b61092a60208301856108f9565b61093760408301846108f9565b949350505050565b600060208201905061095460008301846108f9565b92915050565b610e56806109696000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063313ce56711610066578063313ce5671461013457806370a082311461015257806395d89b4114610182578063a9059cbb146101a0578063dd62ed3e146101d057610093565b806306fdde0314610098578063095ea7b3146100b657806318160ddd146100e657806323b872dd14610104575b600080fd5b6100a0610200565b6040516100ad9190610aaa565b60405180910390f35b6100d060048036038101906100cb9190610b65565b610292565b6040516100dd9190610bc0565b60405180910390f35b6100ee6102b5565b6040516100fb9190610bea565b60405180910390f35b61011e60048036038101906101199190610c05565b6102bf565b60405161012b9190610bc0565b60405180910390f35b61013c6102ee565b6040516101499190610c74565b60405180910390f35b61016c60048036038101906101679190610c8f565b6102f7565b6040516101799190610bea565b60405180910390f35b61018a61033f565b6040516101979190610aaa565b60405180910390f35b6101ba60048036038101906101b59190610b65565b6103d1565b6040516101c79190610bc0565b60405180910390f35b6101ea60048036038101906101e59190610cbc565b6103f4565b6040516101f79190610bea565b60405180910390f35b60606003805461020f90610d2b565b80601f016020809104026020016040519081016040528092919081815260200182805461023b90610d2b565b80156102885780601f1061025d57610100808354040283529160200191610288565b820191906000526020600020905b81548152906001019060200180831161026b57829003601f168201915b5050505050905090565b60008061029d61047b565b90506102aa818585610483565b600191505092915050565b6000600254905090565b6000806102ca61047b565b90506102d7858285610495565b6102e285858561052a565b60019150509392505050565b60006012905090565b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60606004805461034e90610d2b565b80601f016020809104026020016040519081016040528092919081815260200182805461037a90610d2b565b80156103c75780601f1061039c576101008083540402835291602001916103c7565b820191906000526020600020905b8154815290600101906020018083116103aa57829003601f168201915b5050505050905090565b6000806103dc61047b565b90506103e981858561052a565b600191505092915050565b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b600033905090565b610490838383600161061e565b505050565b60006104a184846103f4565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8110156105245781811015610514578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161050b93929190610d6b565b60405180910390fd5b6105238484848403600061061e565b5b50505050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361059c5760006040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016105939190610da2565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361060e5760006040517fec442f050000000000000000000000000000000000000000000000000000000081526004016106059190610da2565b60405180910390fd5b6106198383836107f5565b505050565b600073ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16036106905760006040517fe602df050000000000000000000000000000000000000000000000000000000081526004016106879190610da2565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036107025760006040517f94280d620000000000000000000000000000000000000000000000000000000081526004016106f99190610da2565b60405180910390fd5b81600160008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555080156107ef578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516107e69190610bea565b60405180910390a35b50505050565b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361084757806002600082825461083b9190610dec565b9250508190555061091a565b60008060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050818110156108d3578381836040517fe450d38c0000000000000000000000000000000000000000000000000000000081526004016108ca93929190610d6b565b60405180910390fd5b8181036000808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550505b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361096357806002600082825403925050819055506109b0565b806000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610a0d9190610bea565b60405180910390a3505050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610a54578082015181840152602081019050610a39565b60008484015250505050565b6000601f19601f8301169050919050565b6000610a7c82610a1a565b610a868185610a25565b9350610a96818560208601610a36565b610a9f81610a60565b840191505092915050565b60006020820190508181036000830152610ac48184610a71565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610afc82610ad1565b9050919050565b610b0c81610af1565b8114610b1757600080fd5b50565b600081359050610b2981610b03565b92915050565b6000819050919050565b610b4281610b2f565b8114610b4d57600080fd5b50565b600081359050610b5f81610b39565b92915050565b60008060408385031215610b7c57610b7b610acc565b5b6000610b8a85828601610b1a565b9250506020610b9b85828601610b50565b9150509250929050565b60008115159050919050565b610bba81610ba5565b82525050565b6000602082019050610bd56000830184610bb1565b92915050565b610be481610b2f565b82525050565b6000602082019050610bff6000830184610bdb565b92915050565b600080600060608486031215610c1e57610c1d610acc565b5b6000610c2c86828701610b1a565b9350506020610c3d86828701610b1a565b9250506040610c4e86828701610b50565b9150509250925092565b600060ff82169050919050565b610c6e81610c58565b82525050565b6000602082019050610c896000830184610c65565b92915050565b600060208284031215610ca557610ca4610acc565b5b6000610cb384828501610b1a565b91505092915050565b60008060408385031215610cd357610cd2610acc565b5b6000610ce185828601610b1a565b9250506020610cf285828601610b1a565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680610d4357607f821691505b602082108103610d5657610d55610cfc565b5b50919050565b610d6581610af1565b82525050565b6000606082019050610d806000830186610d5c565b610d8d6020830185610bdb565b610d9a6040830184610bdb565b949350505050565b6000602082019050610db76000830184610d5c565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610df782610b2f565b9150610e0283610b2f565b9250828201905080821115610e1a57610e19610dbd565b5b9291505056fea2646970667358221220f413ecdb821df363531c0a0bcc98dfeb9baf7e41031710ae13ffb1596f19db2b64736f6c634300081c0033",
  linkReferences: {},
  deployedLinkReferences: {}
};

// src/actions/deployTokenAction.ts
var DeploySchema = z4.object({
  name: z4.string(),
  symbol: z4.string(),
  initialSupply: z4.string(),
  useAGW: z4.boolean()
});
var validatedSchema2 = z4.object({
  name: z4.string().min(1, "Name is required"),
  symbol: z4.string().min(1, "Symbol is required").max(5, "Symbol must be 5 characters or less"),
  initialSupply: z4.string().refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
    message: "Initial supply must be a positive number"
  }),
  useAGW: z4.boolean()
});
var deployTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "My Token",
    "symbol": "MTK",
    "initialSupply": "1000000",
    "useAGW": true
}
\`\`\`

User message:
"{{currentMessage}}"

Given the message, extract the following information about the requested token deployment:
- Token name
- Token symbol (usually 3-4 characters)
- Initial supply amount
- Whether to use Abstract Global Wallet aka AGW

If the user did not specify "global wallet", "AGW", "agw", or "abstract global wallet" in their message, set useAGW to false, otherwise set it to true.

Respond with a JSON markdown block containing only the extracted values.`;
var deployTokenAction = {
  name: "DEPLOY_TOKEN",
  similes: [
    "CREATE_TOKEN",
    "DEPLOY_NEW_TOKEN",
    "CREATE_NEW_TOKEN",
    "LAUNCH_TOKEN"
  ],
  validate: async (runtime) => {
    await validateAbstractConfig(runtime);
    return true;
  },
  description: "Deploy a new ERC20 token contract",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger4.log("Starting Abstract DEPLOY_TOKEN handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    currentState.currentMessage = `${currentState.recentMessagesData[1].content.text}`;
    const deployContext = composeContext3({
      state: currentState,
      template: deployTemplate
    });
    const content = (await generateObject3({
      runtime,
      context: deployContext,
      modelClass: ModelClass3.SMALL,
      schema: DeploySchema
    })).object;
    const result = validatedSchema2.safeParse(content);
    if (!result.success) {
      elizaLogger4.error("Invalid content for DEPLOY_TOKEN action.", {
        errors: result.error.errors
      });
      if (callback) {
        callback({
          text: "Unable to process token deployment request. Invalid parameters provided.",
          content: { error: "Invalid deployment parameters" }
        });
      }
      return false;
    }
    try {
      const account = useGetAccount(runtime);
      const supply = parseEther(content.initialSupply);
      let hash;
      if (content.useAGW) {
        const abstractClient = await createAbstractClient2({
          chain: abstractTestnet4,
          signer: account
        });
        hash = await abstractClient.deployContract({
          abi: basicToken_default.abi,
          bytecode: basicToken_default.bytecode,
          args: [result.data.name, result.data.symbol, supply]
        });
      } else {
        const walletClient = useGetWalletClient();
        hash = await walletClient.deployContract({
          chain: abstractTestnet4,
          account,
          abi: basicToken_default.abi,
          bytecode: basicToken_default.bytecode,
          args: [result.data.name, result.data.symbol, supply],
          kzg: void 0
        });
      }
      const receipt = await abstractPublicClient.waitForTransactionReceipt({
        hash
      });
      const contractAddress = receipt.contractAddress;
      elizaLogger4.success(
        `Token deployment completed! Contract address: ${contractAddress}. Transaction hash: ${hash}`
      );
      if (callback) {
        callback({
          text: `Token "${result.data.name}" (${result.data.symbol}) deployed successfully! Contract address: ${contractAddress} and transaction hash: ${hash}`,
          content: {
            hash,
            tokenName: result.data.name,
            tokenSymbol: result.data.symbol,
            contractAddress,
            transactionHash: hash
          }
        });
      }
      const metadata = {
        tokenAddress: contractAddress,
        name: result.data.name,
        symbol: result.data.symbol,
        initialSupply: String(result.data.initialSupply)
      };
      await runtime.messageManager.createMemory({
        id: stringToUuid3(`${result.data.symbol}-${runtime.agentId}`),
        userId: runtime.agentId,
        content: {
          text: `Token deployed: ${result.data.name}, symbol: ${result.data.symbol} and contract address: ${contractAddress}`,
          ...metadata,
          source: "abstract_token_deployment"
        },
        agentId: runtime.agentId,
        roomId: stringToUuid3(`tokens-${runtime.agentId}`),
        createdAt: Date.now()
      });
      elizaLogger4.success("memory saved for token deployment", metadata);
      return true;
    } catch (error) {
      elizaLogger4.error("Error during token deployment:", error);
      if (callback) {
        callback({
          text: `Error deploying token: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deploy a new token called MyToken with symbol MTK and initial supply of 1000000"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll deploy your new token now.",
          action: "DEPLOY_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully deployed MyToken (MTK) with 1000000 initial supply.\nContract address: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b\nTransaction hash: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a new token using AGW with name TestCoin, symbol TEST, and 5000 supply"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll deploy your token using the Abstract Global Wallet.",
          action: "DEPLOY_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully deployed TestCoin (TEST) with 5000 initial supply using AGW.\nContract address: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b\nTransaction: 0x4fed598033f0added272c3ddefd4d83a521634a738474400b27378db462a76ec"
        }
      }
    ]
  ]
};

// src/index.ts
var abstractPlugin = {
  name: "abstract",
  description: "Abstract Plugin for Eliza",
  actions: [transferAction, getBalanceAction, deployTokenAction],
  evaluators: [],
  providers: []
};
var index_default = abstractPlugin;
export {
  abstractPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map