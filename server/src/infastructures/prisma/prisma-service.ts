import { Injectable } from "@nestjs/common";
import { PrismaClient } from "./common/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../../common/utils/database-url";

@Injectable()
export class PrismaService extends PrismaClient {
    constructor() {
        const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
        super({ adapter });
    }
}
