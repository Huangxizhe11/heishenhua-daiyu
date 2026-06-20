const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'sk-api-XnoTn00Cgy9Hr9UVreDVVyHEQCKyqGZ8YndNNrlzi3i9q-ULo29bubjTyGD4K9Kt1CdJdefQ7J6HccC9sZLvMBICqANTnmPxUB-_mLS0Fk6AE4exkeAS7qc';

const tracks = [
    {
        name: 'prologue',
        prompt: 'Chinese traditional instruments, ethereal, mysterious, slow tempo, guzheng and dizi, ancient temple atmosphere, ambient, 80 BPM',
        lyrics: '[Instrumental]'
    },
    {
        name: 'level1',
        prompt: 'Chinese action RPG battle music, intense, dramatic, erhu and pipa, fast tempo, orchestral Chinese orchestra, combat, 120 BPM, dark fantasy',
        lyrics: '[Instrumental]'
    },
    {
        name: 'level2',
        prompt: 'Chinese fire-themed battle music, aggressive, heavy drums, suona and guzheng, fast tempo, intense combat, 130 BPM, rage and fury',
        lyrics: '[Instrumental]'
    },
    {
        name: 'level3',
        prompt: 'Epic Chinese final boss music, mystical, ethereal choir, guzheng and erhu, medium tempo, celestial atmosphere, dreamlike, 100 BPM, otherworldly',
        lyrics: '[Instrumental]'
    },
    {
        name: 'ending',
        prompt: 'Chinese peaceful ending music, gentle, beautiful, guzheng and dizi, slow tempo, emotional, resolution, hope, 70 BPM, serene',
        lyrics: '[Instrumental]'
    }
];

async function generateMusic(track) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: 'music-2.6',
            prompt: track.prompt,
            lyrics: track.lyrics,
            is_instrumental: true,
            audio_setting: {
                sample_rate: 44100,
                bitrate: 256000,
                format: 'mp3'
            },
            output_format: 'url'
        });

        const options = {
            hostname: 'api.minimaxi.com',
            path: '/v1/music_generation',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch(e) {
                    reject(new Error('Parse error: ' + body.substring(0, 200)));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

async function main() {
    const outputDir = path.join(__dirname, 'bgm');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    for (const track of tracks) {
        console.log(`\nGenerating: ${track.name}...`);
        try {
            const result = await generateMusic(track);
            console.log(`  Response: ${JSON.stringify(result).substring(0, 200)}`);

            if (result.data && result.data.audio) {
                const url = result.data.audio;
                const filepath = path.join(outputDir, track.name + '.mp3');
                console.log(`  Downloading to: ${filepath}`);
                await downloadFile(url, filepath);
                console.log(`  ✓ Saved: ${track.name}.mp3`);
            } else if (result.data && result.data.audio_file && result.data.audio_file.url) {
                const url = result.data.audio_file.url;
                const filepath = path.join(outputDir, track.name + '.mp3');
                console.log(`  Downloading to: ${filepath}`);
                await downloadFile(url, filepath);
                console.log(`  ✓ Saved: ${track.name}.mp3`);
            } else {
                console.log('  No audio URL found in response');
            }
        } catch(e) {
            console.log(`  Error: ${e.message}`);
        }
    }

    console.log('\nDone!');
}

main().catch(console.error);
