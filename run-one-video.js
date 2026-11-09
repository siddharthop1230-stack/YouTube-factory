const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log("Starting one-time video generation...");
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing in GitHub Secrets.");
    process.exit(1);
  }
  
  console.log("Calling Gemini API...");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Write a 1-sentence dark psychology fact for a YouTube Short. Keep it under 20 words." }] }]
    })
  });
  
  const data = await response.json();
  
  // THIS WILL TELL US EXACTLY WHAT GOOGLE IS COMPLAINING ABOUT
  if (!response.ok) {
    console.error("🚨 GEMINI API ERROR DETAILS:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  if (!data.candidates || !data.candidates[0].content) {
    console.error("🚨 UNEXPECTED RESPONSE FROM GOOGLE:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  
  const text = data.candidates[0].content.parts[0].text;
  console.log("✅ AI Generated Script:", text);
  
  console.log("Rendering video with FFmpeg...");
  execSync(`ffmpeg -f lavfi -i color=c=blue:s=1080x1920:d=5 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -c:a aac -shortest output.mp4`, { stdio: 'inherit' });
  
  console.log("✅ Video created successfully!");
}

main().catch(console.error);
