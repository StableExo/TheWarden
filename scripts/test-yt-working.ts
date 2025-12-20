import { YoutubeTranscript } from 'youtube-transcript';

// Test with multiple videos to find one that works
const testVideos = [
  'Ks-_Mh1QhMc', // "Your body language may shape who you are" - TED talk
  '9bZkp7q19f0', // "What makes a good life?" - TED talk  
  'arj7oStGLkU', // "10 ways to have a better conversation" - TED talk
];

async function testMultiple() {
  for (const videoId of testVideos) {
    try {
      console.log(`\nTrying: https://www.youtube.com/watch?v=${videoId}`);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`✅ SUCCESS! Got ${transcript.length} segments`);
      
      if (transcript.length > 0) {
        console.log('\nFirst 5 segments:');
        transcript.slice(0, 5).forEach((seg: any) => {
          const mins = Math.floor(seg.offset / 60000);
          const secs = Math.floor((seg.offset % 60000) / 1000);
          console.log(`[${mins}:${String(secs).padStart(2, '0')}] ${seg.text}`);
        });
        break; // Found a working one, stop
      }
    } catch (err: any) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
}

testMultiple();
