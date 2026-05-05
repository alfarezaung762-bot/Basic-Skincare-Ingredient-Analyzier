import dotenv from 'dotenv';
dotenv.config();

async function testFetch() {
    const url = `https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions`;
    console.log("Fetching URL:", url);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.BYTEPLUS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'ep-20250212-deepseek-r1', // let me try deepseek-r1 first
                messages: [{ role: 'user', content: 'Say hello' }]
            })
        });
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text);
    } catch (e: any) {
        console.error("Fetch Error:", e.message);
    }
}

testFetch();
