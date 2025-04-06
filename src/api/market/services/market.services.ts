import axios from "axios";
import { prisma } from "../../../prisma";

interface CoinGeckoResponse {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: {
      [key: string]: number;
    };
    market_cap: {
      [key: string]: number;
    };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
  };
  last_updated: string;
}

export const getCryptoPriceInUSD = async (coinId: string): Promise<number> => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
      }
    );

    const price = response.data.market_data?.current_price?.usd;

    if (price === undefined) {
      throw new Error(`USD price not found for ${coinId}`);
    }

    return price;
  } catch (error) {
    console.error(`Error while fetching price for ${coinId}:`, error);
    throw new Error(`Failed to fetch price for coin: ${coinId}`);
  }
};

export interface UserMoney {
  id: string;
  email: string;
  password: string;
  name: string;
  money: number;
  createdAt: Date;
}

export async function buyCrypto(
  userId: string, //id usera
  cryptoId: string, // crypto id
  quantity: number, // ilośc crypto
  cryptoPrice: number, // cena crypto

) {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { userId, cryptoId },
    });

    if (!wallet) {
      return { error: "Wallet not found" };
    }

    const totalCost = quantity * cryptoPrice; // realna aktulana cena krypto w USD
    const userMoney = await prisma.user.findUnique({
        where: { id: userId },
        select: { money: true },
      });
  
      if (!userMoney) {
        return {error:"User money not found"}
      }


    if (totalCost > userMoney.money) {
      // jełśi cena crypto w USD jest więszka od pienedzy usera wyjebać err
      return {
        error: `You don't have enough money. Required: $${totalCost}, Available: $${userMoney}`,
      };
    }

    const newUserMoney = userMoney.money - totalCost;

    const newQuantity = wallet.quantity + quantity;

    const [updatedWallet, updatedUser] = await Promise.all([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { quantity: newQuantity },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { money: newUserMoney },
      }),
    ]);

    return {
      message: `${quantity} ${cryptoId} purchased for $${totalCost}`,
      wallet: updatedWallet,
      user: updatedUser,
    };
  } catch (error) {
    console.error("Error processing crypto purchase:", error);
    throw new Error("Failed to process crypto purchase");
  }
}

export async function sellCrypto(
  userId: string, // id usera
  cryptoId: string, // crypto id
  quantity: number, // ilość crypto
  cryptoPrice: number, // cena crypto
) {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { userId, cryptoId },
    });

    if (!wallet) {
      return { error: "Wallet not found" };
    }

    if (wallet.quantity < quantity) {
      // Check if user has enough crypto to sell
      return {
        error: `You don't have enough ${cryptoId}. Required: ${quantity}, Available: ${wallet.quantity}`,
      };
    }

    const userMoney = await prisma.user.findUnique({
      where: { id: userId },
      select: { money: true },
    });

    if (!userMoney) {
      return {error:"User money not found"}
    }

    const totalProceeds = quantity * cryptoPrice;
    const newUserMoney = userMoney.money + totalProceeds;
    const newQuantity = wallet.quantity - quantity;

    const [updatedWallet, updatedUser] = await Promise.all([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { quantity: newQuantity },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { money: newUserMoney },
      }),
    ]);

    return {
      message: `${quantity} ${cryptoId} sold for $${totalProceeds}`,
      wallet: updatedWallet,
      user: updatedUser,
    };
  } catch (error) {
    console.error("Error processing crypto sale:", error);
    throw new Error("Failed to process crypto sale");
  }
}
