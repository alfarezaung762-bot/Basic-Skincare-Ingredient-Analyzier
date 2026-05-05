import dotenv from 'dotenv';
dotenv.config();

async function testModelName(modelName: string) {
    const url = "https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions";
    const apiKey = process.env.BYTEPLUS_API_KEY || "";
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 5
            })
        });
        
        const data = await response.json();
        if (response.status === 200) {
            console.log(`✅ Success for model: ${modelName}`);
            return true;
        } else {
            console.log(`❌ Failed for model: ${modelName} (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
            return false;
        }
    } catch (e: any) {
        console.error(`Error for ${modelName}: ${e.message}`);
        return false;
    }
}

async function run() {
    const models = [
        "DeepSeek-V3.1",
        "deepseek-v3.1",
        "deepseek-v3",
        "DeepSeek-R1",
        "deepseek-r1",
        "GPT-OSS-120B",
        "gpt-oss-120b",
        "doubao-pro-4k",
        "doubao-lite-4k"
    ];
    
    for (const m of models) {
        await testModelName(m);
    }
}

run();
