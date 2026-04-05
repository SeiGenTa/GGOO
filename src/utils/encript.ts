import { createCipheriv, createDecipheriv, createHash } from "node:crypto";

export const encript_string = (data: string): string => {
    const key = createHash('sha256')
        .update(String(process.env.SECRET_KEY || "fallback_key"))
        .digest();

    const iv = Buffer.alloc(16, 0); // IV fijo de 16 bytes

    const cipher = createCipheriv("aes-256-cbc", key, iv);

    // 2. IMPORTANTE: Debes concatenar el 'final()' para que el cifrado sea válido
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}


/**
 * Desencripta un string en formato hexadecimal usando AES-256-CBC.
 * @param encryptedData El string cifrado en formato hex.
 * @returns El texto original en formato utf8.
 */
export const decrypt_string = (encryptedData: string): string => {
    // 1. Generar la clave idéntica a la función de cifrado
    const key: Buffer = createHash('sha256')
        .update(String(process.env.SECRET_KEY || "fallback_key"))
        .digest();

    // 2. Definir el IV (debe ser el mismo que el usado al cifrar)
    const iv: Buffer = Buffer.alloc(16, 0);

    // 3. Crear el objeto de descifrado
    const decipher = createDecipheriv("aes-256-cbc", key, iv);

    try {
        // 4. Realizar la conversión de 'hex' a 'utf8'
        let decrypted: string = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        // Manejo de errores si la llave es incorrecta o el hash está corrupto
        throw new Error("Fallo en el proceso de desencriptado: " + (error as Error).message);
    }
}

export const encript_json = (data: any): string => {
    const jsonString = JSON.stringify(data);
    return encript_string(jsonString);
}

export const decrypt_json = (encryptedData: string): any => {
    const decryptedString = decrypt_string(encryptedData);
    return JSON.parse(decryptedString);
}