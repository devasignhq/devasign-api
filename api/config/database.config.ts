import { PrismaClient } from "../../prisma_client/index.js";
import { withAccelerate } from "@prisma/extension-accelerate";

export const prisma = new PrismaClient().$extends(withAccelerate());
