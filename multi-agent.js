const fs = require('fs');
const { execSync } = require('child_process');
const { google } = require('googleapis');

async function callGemini(role, prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fullPrompt = `You are a ${role}. ${prompt}`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Fallback text.";
}

async function main() {
  console.log("🚀 MULTI-AGENT FACTORY STARTING...");

  // 1. AGENT 1: THE RESEARCHER
  console.log("🕵️ Agent 1: Finding a viral topic...");
  const topic = await callGemini("YouTube Trend Researcher", "Give me 1 highly viral, controversial topic about dark psychology or human behavior. Output ONLY the topic, no extra text.");
  console.log(`✅ Topic Found: ${topic}`);

  // 2. AGENT 2: THE SCRIPTWRITER
  console.log("✍️ Agent 2: Writing the script...");
  const script = await callGemini("Viral Shorts Scriptwriter", `Write a 30-second script about this topic: "${topic}". Keep it under 60 words. Use a strong hook in the first 3 seconds. Output ONLY the spoken text, no scene directions.`);
  console.log(`✅ Script Written: ${script}`);

  // 3. AGENT 3: THE SEO EXPERT
  console.log("📈 Agent 3: Optimizing SEO...");
  const seoPrompt = `Based on this script: "${script}", generate a JSON object with: "title" (under 50 chars, include #shorts), "description" (with 3 hashtags), and "tags" (array of 5 strings). Output ONLY valid JSON.`;
  const seoRaw = await callGemini("YouTube SEO Expert", seoPrompt);
  
  let metadata = { title: "Dark Psychology Fact #shorts", description: script, tags: ["psychology", "shorts"] };
  try {
    metadata = JSON.parse(seoRaw.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    console.log("⚠️ SEO Agent JSON parse failed, using fallback.");
  }
  console.log(`✅ SEO Ready: ${metadata.title}`);

  // 4. RENDER THE VIDEO
  console.log("🎨 Downloading AI Visual...");
  const imagePrompt = encodeURIComponent("Cinematic dark moody psychological thriller background, neon lights, 8k, vertical --ar 9:16");
  execSync(`curl -L "https://image.pollinations.ai/prompt/${imagePrompt}?width=1080&height=1920&nologo=true" -o bg.jpg`, { stdio: 'inherit' });

  console.log("🎙️ Generating Voiceover...");
  const voiceUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Matthew&text=${encodeURIComponent(script)}`;
  execSync(`curl -L "${voiceUrl}" -o voice.mp3`, { stdio: 'inherit' });

  console.log("💬 Generating Captions...");
  const audioDuration = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 voice.mp3`).toString());
  const words = script.split(" ");
  const safeDuration = isNaN(audioDuration) ? (words.length * 0.4) : audioDuration;
const timePerWord = safeDuration / words.length;

function toSrtTime(seconds) {
  const date = new Date(0);
  date.setMilliseconds(Math.max(0, seconds * 1000));
  return date.toISOString().substr(11, 12).replace('.', ',');
}

let srtContent = "";
words.forEach((word, i) => {
  srtContent += `${i + 1}\n${toSrtTime(i * timePerWord)} --> ${toSrtTime((i + 1) * timePerWord)}\n${word.toUpperCase()}\n\n`;
});
fs.writeFileSync('captions.srt', srtContent);
  

  console.log("🎬 Rendering Final Short with FFmpeg...");
  execSync(`ffmpeg -loop 1 -i bg.jpg -i voice.mp3 -vf "scale=1080:1920,zoompan=z='min(zoom+0.0015,1.5)':d=${Math.floor(safeDuration * 25)}:s=1080x1920,subtitles=captions.srt:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=100'" -c:v libx264 -t ${safeDuration} -pix_fmt yuv420p -c:a aac -shortest final_short.mp4`, { stdio: 'inherit' });

  // 5. UPLOAD TO YOUTUBE
  console.log("📤 Uploading to YouTube...");
  const oauth2Client = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_CLIENT_SECRET, "https://developers.google.com/oauthplayground");
  oauth2Client.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: "27"
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false
      }
    },
    media: { body: fs.createReadStream('final_short.mp4') }
  });

  console.log(`🎉 MULTI-AGENT SUCCESS! Video ID: ${res.data.id}`);
}

main().catch(console.error);
