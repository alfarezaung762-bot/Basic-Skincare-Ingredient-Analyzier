import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.BYTEPLUS_API_KEY,
    baseURL: process.env.BYTEPLUS_BASE_URL,
});

async function test() {
    try {
        console.log("Testing DeepSeek-V3...");
        const response = await client.chat.completions.create({
            model: 'DeepSeek-V3', // Or process.env.BYTEPLUS_MODEL_ID
            messages: [{ role: 'user', content: 'Say hello' }],
        });
        console.log(response.choices[0].message);
    } catch (e: any) {
        console.error("DeepSeek-V3 Error:", e.message);
    }

    try {
        console.log("Testing with BYTEPLUS_MODEL_ID...");
        const response = await client.chat.completions.create({
            model: process.env.BYTEPLUS_MODEL_ID as string,
            messages: [{ role: 'user', content: 'Say hello' }],
        });
        console.log(response.choices[0].message);
    } catch (e: any) {
        console.error("BYTEPLUS_MODEL_ID Error:", e.message);
    }
}

test();
