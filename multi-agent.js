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
  console.log("🎬 Downloading cinematic video background...");
  // Backup videos (free, public, verified 200 video/mp4). Tried in order if download fails.
  const backupVideoUrls = [
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4"
  ];
  let videoUrl = backupVideoUrls[0];
  
  try {
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    const searchQuery = encodeURIComponent("dark cinematic abstract");
    const pexelsResponse = execSync(`curl -s -H "Authorization: ${pexelsApiKey}" "https://api.pexels.com/videos/search?query=${searchQuery}&orientation=portrait&per_page=1"`).toString();
    const pexelsData = JSON.parse(pexelsResponse);
    
    if (pexelsData.videos && pexelsData.videos.length > 0) {
      videoUrl = pexelsData.videos[0].video_files[0].link;
      console.log("✅ Using Pexels video.");
    } else {
      console.log("⚠️ Pexels failed, using backup video.");
    }
  } catch (err) {
    console.log("⚠️ Pexels API failed, using backup video.");
  }

  // Try the primary URL (Pexels or backup 1), then fall back to the remaining backups.
  const videoCandidates = [videoUrl, ...backupVideoUrls.filter(u => u !== videoUrl)];
  let videoDownloaded = false;
  if (fs.existsSync('bg.mp4')) fs.unlinkSync('bg.mp4'); // avoid accepting a stale file
  for (const candidate of videoCandidates) {
    try {
      execSync(`curl -f -L --retry 2 -m 120 "${candidate}" -o bg.mp4`, { stdio: 'inherit' });
      if (fs.existsSync('bg.mp4') && fs.statSync('bg.mp4').size > 10000) {
        console.log(`✅ Background video downloaded from: ${candidate}`);
        videoDownloaded = true;
        break;
      }
      console.log(`⚠️ Download from ${candidate} was empty, trying next.`);
    } catch (err) {
      console.log(`⚠️ Download failed from ${candidate}, trying next backup.`);
    }
  }
  if (!videoDownloaded) {
    throw new Error("All background video sources failed. Aborting render.");
  }

  console.log("🎙️ Generating Voiceover...");
  const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(script)}`;
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
  execSync(`ffmpeg -y -i voice.mp3 -ar 44100 -ac 2 clean_voice.mp3`, { stdio: 'inherit' });
  execSync(`ffmpeg -y -stream_loop -1 -i bg.mp4 -i clean_voice.mp3 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles=captions.srt:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=100'" -c:v libx264 -t ${safeDuration} -pix_fmt yuv420p -c:a aac -shortest final_short.mp4`, { stdio: 'inherit' });

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
