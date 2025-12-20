/**
 * Test script to fetch YouTube transcripts
 * Tests the youtube-transcript package with video ID: 2P27Ef-LLuQ
 */

import { YoutubeTranscript } from 'youtube-transcript';

async function testYoutubeTranscript() {
  const videoId = '2P27Ef-LLuQ';
  
  console.log(`\n🎥 Testing YouTube Transcript Fetching`);
  console.log(`Video ID: ${videoId}`);
  console.log(`URL: https://www.youtube.com/watch?v=${videoId}\n`);

  try {
    console.log('Fetching transcript...\n');
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log(`✅ SUCCESS! Transcript fetched successfully`);
    console.log(`Total segments: ${transcript.length}\n`);
    
    // Show first 10 segments
    console.log('First 10 segments:');
    console.log('='.repeat(80));
    transcript.slice(0, 10).forEach((segment, index) => {
      const time = new Date(segment.offset).toISOString().substr(11, 8);
      console.log(`[${time}] ${segment.text}`);
    });
    console.log('='.repeat(80));
    
    // Show some statistics
    console.log(`\n📊 Statistics:`);
    console.log(`Total segments: ${transcript.length}`);
    console.log(`Total duration: ${formatDuration(transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration)}`);
    
    const totalText = transcript.map(s => s.text).join(' ');
    console.log(`Total words: ${totalText.split(/\s+/).length}`);
    console.log(`Total characters: ${totalText.length}`);
    
    // Save to file
    const outputPath = '/tmp/youtube-transcript-2P27Ef-LLuQ.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(transcript, null, 2));
    console.log(`\n💾 Full transcript saved to: ${outputPath}`);
    
    // Also save as readable text
    const textOutputPath = '/tmp/youtube-transcript-2P27Ef-LLuQ.txt';
    const readableText = transcript.map(segment => {
      const time = formatTimestamp(segment.offset);
      return `[${time}] ${segment.text}`;
    }).join('\n');
    fs.writeFileSync(textOutputPath, readableText);
    console.log(`💾 Readable transcript saved to: ${textOutputPath}`);
    
    return transcript;
    
  } catch (error: any) {
    console.error(`❌ ERROR: Failed to fetch transcript`);
    console.error(`Message: ${error.message}`);
    console.error(`\nPossible reasons:`);
    console.error(`- Video doesn't have captions/subtitles`);
    console.error(`- Video is private or deleted`);
    console.error(`- Network/API issues`);
    console.error(`- YouTube changed their API`);
    throw error;
  }
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
}

// Run the test
testYoutubeTranscript()
  .then(() => {
    console.log(`\n✅ Test completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Test failed`);
    process.exit(1);
  });
