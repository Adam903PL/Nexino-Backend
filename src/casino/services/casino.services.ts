import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function clearDatabase() {
  try {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

async function createUser() {
    try {
        const createdUsers = await prisma.user.createMany({
            data: [
              { email: 'user1@example.com', name: 'User 1' },
              { email: 'user2@example.com', name: 'User 2' },
            ],
          });
        console.log('Created users:', createdUsers);
        return createdUsers;
      } catch (error) {
        console.error('Error during adding new user to database:', error);
        throw error;
      }
}

async function main() {
  // await clearDatabase();  
  // await createUser();     
  await getAllUsers();    
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());