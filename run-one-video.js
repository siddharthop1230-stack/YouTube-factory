const fs = require('fs');
const { execSync } = require('child_process');
const { google } = require('googleapis');

async function main() {
  console.log("Starting video generation and upload...");
  
  // 1. Generate Script
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Write a 1-sentence dark psychology fact for a YouTube Short. Keep it under 20 words." }] }]
    })
  });
  
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  console.log("✅ AI Generated Script:", text);
  
  // 2. Render Video
  console.log("Rendering video with FFmpeg...");
  execSync(`ffmpeg -f lavfi -i color=c=blue:s=1080x1920:d=5 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -c:a aac -shortest output.mp4`, { stdio: 'inherit' });
  
  // 3. Upload to YouTube
  console.log("Connecting to YouTube API...");
  const oauth2Client = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground" 
  );
  
  oauth2Client.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  console.log("Uploading video...");
  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: text.substring(0, 50), 
        description: text + "\n\n#shorts #psychology",
        tags: ["shorts", "psychology"]
      },
      status: {
        privacyStatus: 'unlisted', // We make it unlisted first to test
        selfDeclaredMadeForKids: false
      }
    },
    media: {
      body: fs.createReadStream('output.mp4')
    }
  });

  console.log(`✅ Video uploaded successfully! Video ID: ${res.data.id}`);
}

main().catch(console.error);
