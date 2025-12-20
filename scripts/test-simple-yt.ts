import { YoutubeTranscript } from 'youtube-transcript';

// Test with a popular educational video
const videoId = 'UF8uR6Z6KLc'; // Steve Jobs Stanford Commencement
console.log(`Testing: https://www.youtube.com/watch?v=${videoId}`);

YoutubeTranscript.fetchTranscript(videoId)
  .then(transcript => {
    console.log(`✅ Success! Fetched ${transcript.length} segments`);
    if (transcript.length > 0) {
      console.log('\nFirst 3 segments:');
      transcript.slice(0, 3).forEach((seg: any) => {
        const time = Math.floor(seg.offset / 1000);
        console.log(`[${time}s] ${seg.text}`);
      });
    }
  })
  .catch(err => console.error(`❌ Error: ${err.message}`));
