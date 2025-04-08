import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";

export async function getUserID(token: string) {
  const decoded = jwt.verify(token, ENV.JWT_SECRET || "fallback_secret") as {
    id: string;
  };
  return { userId: decoded.id };
}
export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};
async function clearDatabase() {
  try {
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("Database cleared");
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log(users);
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function getUserWallet(userId: string) {
  try {
    const userWallets = await prisma.wallet.findMany({
      where: { userId },
    });

    return userWallets;
  } catch (error) {
    console.error("Error fetching user wallets:", error);
    throw error;
  }
}

async function createUserWallet() {
  try {
    const createdWallets = await prisma.wallet.createMany({
      data: [
        {
          userId: "ee2ab57b-a46c-467f-bb49-0d54c7f94656",
          cryptoId: "bitcoin",
          quantity: 1.4,
        },
        {
          userId: "ee2ab57b-a46c-467f-bb49-0d54c7f94656",
          cryptoId: "ethereum",
          quantity: 100.2,
        },
        {
          userId: "ee2ab57b-a46c-467f-bb49-0d54c7f94656",
          cryptoId: "tether",
          quantity: 120.13,
        },
      ],
    });

    console.log("Created wallets:", createdWallets);
    return createdWallets;
  } catch (error) {
    console.error("Error during adding new wallets to database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createdUsers() {
  try {
    const hashedPassword = await hashPassword("dupa123");

    const createdUsers = await prisma.user.createMany({
      data: [
        {
          email: "user1@example.com",
          name: "User 1",
          password: hashedPassword,
        },
        {
          email: "user2@example.com",
          name: "User 2",
          password: hashedPassword,
        },
      ],
    });

    console.log("Created users:", createdUsers);
    return createdUsers;
  } catch (error) {
    console.error("Error during adding new users to database:", error);
    throw error;
  }
}

async function getAllWallets() {
  try {
    const wallets = await prisma.wallet.findMany();
    console.log(wallets);
    return wallets;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function updateUserWallet(
  userId: string,
  cryptoId: string,
  Quantity: number
) {
  try {
    const wallet = await prisma.wallet.findFirst({
      where: { userId, cryptoId },
    });

    if (!wallet) {
      return { error: "Wallet not found" };
    }
    const newQuantity = Math.max(0, wallet.quantity + Quantity);

    const updatedWallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { quantity: newQuantity },
    });

    return updatedWallet;
  } catch (error) {
    console.error("Error updating wallet:", error);
    throw error;
  }
}

export async function UpdateUserMoney(userId: string, MoneyToUpdate: number) {
  const Money = await prisma.user.update({
    where: { id: userId },
    data: { money: { increment: MoneyToUpdate } },
  });
  return Money.money;
}


































async function main() {
  // await clearDatabase()
  // await createdUsers()
  // await getAllUsers()
  //   await createUserWallet()
  //   await getAllWallets()
  //   await getUserWallet("98e5df30-5e99-4ef4-b06c-c4dbc86558ce")
  // const Item = await prisma.equipment.findMany({
  //   where: { userId: "98e5df30-5e99-4ef4-b06c-c4dbc86558ce", gunId: 14 },
  // });
  // console.log(Item);


  const items = await prisma.equipment.findMany({
    where: {
      userId: "98e5df30-5e99-4ef4-b06c-c4dbc86558ce",
    },
  });

  let MoneyToUpdate = 0;


}

