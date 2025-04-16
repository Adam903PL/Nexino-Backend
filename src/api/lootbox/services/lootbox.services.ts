import { redis } from "../../../config/redis";
import { prisma } from "../../../prisma";

export const SellItem = async (
  userId: string,
  gunId: number,
  quantity: number
) => {
  try {
    const items = await prisma.equipment.findMany({
      where: {
        userId: userId,
        gunId: gunId,
      },
    });

    if (!items || items.length === 0) {
      return { success: false, message: "You don't have this item in your EQ" };
    }

    if (items.length < quantity) {
      return {
        success: false,
        message: `You don't have the ${quantity} of this item`,
      };
    }

    const itemPrice = items[0].gunPrice || 0;
    const moneyToAdd = quantity * itemPrice;

    await prisma.equipment.deleteMany({
      where: {
        userId: userId,
        gunId: gunId,
      },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        money: user.money + moneyToAdd,
      },
    });

    return {
      success: true,
      message: "Items sold successfully",
      soldQuantity: quantity,
      itemPrice: itemPrice,
      totalEarned: moneyToAdd,
      newBalance: updatedUser.money,
    };
  } catch (error) {
    console.error("Error in SellItem function:", error);
    return { success: false, message: "An error occurred while selling items" };
  }
};



export async function getAllGuns() {
  try {
    
    const gunIds = await redis.smembers('guns');
        
    const gunsData = await Promise.all(
      gunIds.map(async (id) => {
        const gunData = await redis.hgetall(`gun:${id}`);
        return { id, ...gunData };
      })
    );
    
    return gunsData;
  } catch (error) {
    console.error("Error fetching guns:", error);
    throw error;
  }
}
