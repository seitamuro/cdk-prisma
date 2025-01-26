import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const handler = async () => {
  const allUsers = await prisma.user.findMany();
  console.log(allUsers);

  return {
    statusCode: 200,
    users: allUsers,
  };
};
