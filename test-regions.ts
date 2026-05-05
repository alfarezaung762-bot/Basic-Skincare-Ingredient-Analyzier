import dotenv from 'dotenv';
dotenv.config();

async function testConnection(url: string, apiKey: string, modelId: string, label: string) {
    console.log(`\n--- Testing ${label} ---`);
    console.log(`URL: ${url}`);
    console.log(`Model/Endpoint: ${modelId}`);
    
    try {
        const response = await fetch(`${url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: 'Say hi' }]
            })
        });
        
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(data)}`);
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    }
}

async function runTests() {
    const apiKey = process.env.BYTEPLUS_API_KEY || "";
    const modelId = process.env.BYTEPLUS_MODEL_ID || "";
    
    // Test 1: Southeast Asia (International)
    await testConnection("https://ark.ap-southeast.bytepluses.com/api/v3", apiKey, modelId, "BytePlus SE Asia");
    
    // Test 2: China Mainland (Domestic)
    await testConnection("https://ark.cn-beijing.volces.com/api/v3", apiKey, modelId, "Volcengine China");
    
    // Test 3: Model Name instead of Endpoint ID
    await testConnection("https://ark.ap-southeast.bytepluses.com/api/v3", apiKey, "DeepSeek-V3.1", "Direct Model Name (SE Asia)");
}

runTests();
