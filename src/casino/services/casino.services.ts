import { prisma } from "../../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env";
import { getAllUsers, hashPassword } from "../../services/main.services";













async function main() {
  // await clearDatabase();    
  // await createdUsers()
  // await createUserWallet()
  await getAllUsers();    
  // await getAllWallets()


}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());