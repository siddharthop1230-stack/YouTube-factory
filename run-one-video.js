const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log("Starting one-time video generation...");
  
  // 1. Generate a script with Gemini
  console.log("Calling Gemini API...");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing.");
    process.exit(1);
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Write a 1-sentence dark psychology fact for a YouTube Short. Keep it under 20 words." }] }]
    })
  });
  
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  console.log("AI Generated Script:", text);
  
  // 2. Render a test video with FFmpeg
  console.log("Rendering video with FFmpeg...");
  execSync(`ffmpeg -f lavfi -i color=c=blue:s=1080x1920:d=5 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -c:a aac -shortest output.mp4`, { stdio: 'inherit' });
  
  console.log("Video created successfully!");
}

main().catch(console.error);
