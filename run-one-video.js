const fs = require('fs');
const { execSync } = require('child_process');
const { google } = require('googleapis');
const { EdgeTTS } = require('edge-tts-universal');

// Helper to format time for SRT
function toSrtTime(seconds) {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  return date.toISOString().substr(11, 12).replace('.', ',');
}

async function main() {
  console.log("🚀 Starting Professional Video Factory...");

  // 1. GENERATE SCRIPT (Algorithm Optimized for 18-34 Age Group)
  let scriptText = "Your brain is designed to protect you, but it's also your biggest enemy. Here is how dark psychology works.";
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `Write a 30-second viral YouTube Shorts script about Dark Psychology. Target audience: 18-34 year olds. Use an aggressive, intriguing hook in the first 3 seconds. Keep it under 60 words. Do not include scene directions, just the spoken text.`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      scriptText = data.candidates[0].content.parts[0].text.trim();
    }
  } catch (err) {
    console.log("⚠️ Gemini Error, using fallback script.");
  }
  console.log("📝 Script:", scriptText);

  // 2. GENERATE AI IMAGE (Pollinations.ai - Free, No Key)
  console.log("🎨 Downloading cinematic AI visual...");
  const imagePrompt = encodeURIComponent("Cinematic dark moody psychological thriller background, glowing neon lights, hyper-realistic, 8k, vertical format --ar 9:16");
  execSync(`curl -L "https://image.pollinations.ai/prompt/${imagePrompt}?width=1080&height=1920&nologo=true" -o bg.jpg`, { stdio: 'inherit' });

  // 3. GENERATE VOICEOVER (Edge-TTS - Free, No Key)
  console.log("🎙️ Generating AI Voiceover...");
  const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(scriptText)}`;
execSync(`curl -L "${voiceUrl}" -o voice.mp3`, { stdio: 'inherit' });

  // Get audio duration for captions
  const audioDuration = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 voice.mp3`).toString());
  const words = scriptText.split(" ");
  const timePerWord = audioDuration / words.length;

  // 4. GENERATE CAPTIONS (SRT Format for Retention)
  console.log("💬 Generating dynamic captions...");
  let srtContent = "";
  words.forEach((word, i) => {
    srtContent += `${i + 1}\n${toSrtTime(i * timePerWord)} --> ${toSrtTime((i + 1) * timePerWord)}\n${word.toUpperCase()}\n\n`;
  });
  fs.writeFileSync('captions.srt', srtContent);

  // 5. RENDER VIDEO (FFmpeg - Images + Audio + Burned-in Captions)
  console.log("🎬 Rendering final Short...");
  execSync(`ffmpeg -loop 1 -i bg.jpg -i voice.mp3 -vf "scale=1080:1920,zoompan=z='min(zoom+0.0015,1.5)':d=125:s=1080x1920,subtitles=captions.srt:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=100'" -c:v libx264 -t ${audioDuration} -pix_fmt yuv420p -c:a aac -shortest final_short.mp4`, { stdio: 'inherit' });

  // 6. UPLOAD TO YOUTUBE (SEO & Scheduling)
  console.log("📤 Uploading and scheduling...");
  const oauth2Client = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_CLIENT_SECRET, "https://developers.google.com/oauthplayground");
  oauth2Client.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Schedule for Tomorrow at 6:00 PM IST
  const scheduleDate = new Date();
  scheduleDate.setDate(scheduleDate.getDate() + 1);
  scheduleDate.setHours(18, 0, 0, 0); // 6 PM

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: scriptText.substring(0, 50) + " 🤯 #shorts", // SEO Optimized Title
        description: `${scriptText}\n\nFollow for more dark psychology facts!\n#psychology #darkpsychology #mindset #humanbehavior`, // SEO Description
        tags: ["dark psychology", "psychology facts", "human behavior", "mind control", "shorts"],
        categoryId: "27" // Education
      },
      status: {
        privacyStatus: 'private', // MUST be private to schedule
        publishAt: scheduleDate.toISOString(), // The Magic Auto-Publish Code
        selfDeclaredMadeForKids: false
      }
    },
    media: { body: fs.createReadStream('final_short.mp4') }
  });

  console.log(`✅ SUCCESS! Video scheduled for ${scheduleDate.toString()}`);
  console.log(`🆔 Video ID: ${res.data.id}`);
}

main().catch(console.error);
