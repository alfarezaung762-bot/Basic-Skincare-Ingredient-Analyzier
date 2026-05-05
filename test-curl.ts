import { execSync } from 'child_process';
try {
    const output = execSync('curl -v https://ark.byteplus.com/api/v3/chat/completions');
    console.log(output.toString());
} catch (e: any) {
    console.error("CURL Error:", e.message);
}
