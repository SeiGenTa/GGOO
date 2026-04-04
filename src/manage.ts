import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { createInterface } from "node:readline";
import { Pool } from "pg";
import { createHash } from "node:crypto";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


const createsuperuser = async () => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    let email = "";
    while (true) {
        email = await new Promise((resolve) => {
            rl.question("Email: ", (answer) => {
                resolve(answer);
            });
        });
        if (email.length === 0) {
            console.log("Email cannot be empty");
        } else {
            break;
        }
    }
    let password = "";
    while (true) {
        password = await new Promise((resolve) => {
            rl.question("Password: ", (answer) => {
                resolve(answer);
            });
        });
        if (password.length === 0) {
            console.log("Password cannot be empty");
        } else {
            break;
        }
    }
    let nombre = "";
    while (true) {
        nombre = await new Promise((resolve) => {
            rl.question("Nombre: ", (answer) => {
                resolve(answer);
            });
        });
        if (nombre.length === 0) {
            console.log("Nombre cannot be empty");
        } else {
            break;
        }
    }

    const hasher = createHash("blake2b512");
    hasher.update(password);
    const password_hashed =  hasher.digest("hex");

    const user = await prisma.user.create({
        data: {
            email,
            password: password_hashed,
            nombre,
            es_admin: true,
            es_valido: true,
            aprobado_por_admin: true,
        },
    });
    console.log(`Superuser ${user.email} created successfully. id: ${user.id}`);
    rl.close();
}

const manage = async () => {
    const command = process.argv[2];
    if (command === "createsuperuser") {
        await createsuperuser();
    } else {
        console.log("Unknown command");
    }
};

manage();