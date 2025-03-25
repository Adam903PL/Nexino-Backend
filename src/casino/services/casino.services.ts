import { PrismaClient } from '@prisma/client';
import bcrypt from "bcrypt";

const prisma = new PrismaClient();


const hashPassword = async (password:string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};


async function clearDatabase() {
  try {
    await prisma.wallet.deleteMany(); 
    await prisma.user.deleteMany(); 

    console.log("Database cleared successfully.");
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error;
  }
}

async function getAllUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log(users);
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function getAllWallets() {
  try {
    const wallets = await prisma.wallet.findMany();
    console.log(wallets);
    return wallets;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function createdUsers() {
  try {
    const hashedPassword = await hashPassword("dupa123");

    const createdUsers = await prisma.user.createMany({
      data: [
        { email: "user1@example.com", name: "User 1", password: hashedPassword },
        { email: "user2@example.com", name: "User 2", password: hashedPassword },
      ],
    });



    console.log("Created users:", createdUsers);
    return createdUsers;
  } catch (error) {
    console.error("Error during adding new users to database:", error);
    throw error;
  }
}

async function createUserWallet() {
  try {
    const createdWallets = await prisma.wallet.createMany({
      data: [
        { userId: "637512c2-64e1-4b58-82ce-935f29336520", cryptoId: "bitcoin", quantity: 1.4 },
        { userId: "637512c2-64e1-4b58-82ce-935f29336520", cryptoId: "ethereum", quantity: 100.2 },
        { userId: "637512c2-64e1-4b58-82ce-935f29336520", cryptoId: "tether", quantity: 120.13 },
        { userId: "5d2b6e2f-0c2b-410d-a49c-eca8d73a25e6", cryptoId: "bitcoin", quantity: 1.4 },
        { userId: "5d2b6e2f-0c2b-410d-a49c-eca8d73a25e6", cryptoId: "ethereum", quantity: 100.2 },
        { userId: "5d2b6e2f-0c2b-410d-a49c-eca8d73a25e6", cryptoId: "tether", quantity: 120.13 },
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

async function main() {
  await clearDatabase();    
  await createdUsers()
  // await createUserWallet()
  await getAllUsers();    
  // await getAllWallets()


}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());