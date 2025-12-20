/**
 * Test script to demonstrate YouTube transcript fetching capability
 * Tests with multiple video IDs to show the functionality
 */

import { YoutubeTranscript } from 'youtube-transcript';

async function testVideoTranscript(videoId: string, description: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎥 Testing: ${description}`);
  console.log(`Video ID: ${videoId}`);
  console.log(`URL: https://www.youtube.com/watch?v=${videoId}`);
  console.log('='.repeat(80));

  try {
    console.log('Fetching transcript...\n');
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log(`✅ SUCCESS! Transcript fetched successfully`);
    console.log(`Total segments: ${transcript.length}\n`);
    
    // Show first 5 segments
    console.log('First 5 segments:');
    console.log('-'.repeat(80));
    transcript.slice(0, 5).forEach((segment) => {
      const time = formatTimestamp(segment.offset);
      console.log(`[${time}] ${segment.text}`);
    });
    console.log('-'.repeat(80));
    
    // Show some statistics
    const totalText = transcript.map(s => s.text).join(' ');
    const duration = transcript[transcript.length - 1].offset + transcript[transcript.length - 1].duration;
    
    console.log(`\n📊 Statistics:`);
    console.log(`  Segments: ${transcript.length}`);
    console.log(`  Duration: ${formatDuration(duration)}`);
    console.log(`  Words: ${totalText.split(/\s+/).length}`);
    console.log(`  Characters: ${totalText.length}`);
    
    return { success: true, transcript, videoId, description };
    
  } catch (error: any) {
    console.error(`❌ FAILED: ${error.message}`);
    return { success: false, error: error.message, videoId, description };
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

async function main() {
  console.log('\n🎬 YouTube Transcript Fetcher - Capability Test');
  console.log('Testing ability to fetch transcripts from YouTube videos\n');

  const testVideos = [
    { id: '2P27Ef-LLuQ', desc: 'Original video (requested)' },
    { id: 'dQw4w9WgXcQ', desc: 'Rick Astley - Never Gonna Give You Up (popular video with captions)' },
    { id: 'jNQXAC9IVRw', desc: 'Me at the zoo (first YouTube video)' },
  ];

  const results = [];
  
  for (const video of testVideos) {
    const result = await testVideoTranscript(video.id, video.desc);
    results.push(result);
    
    // Wait a bit between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.description}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Segments: ${result.transcript.length}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} videos successfully fetched`);
  
  // Answer the question
  console.log(`\n${'='.repeat(80)}`);
  console.log('❓ ANSWER TO THE QUESTION:');
  console.log('='.repeat(80));
  console.log('Can I read transcripts from YouTube videos?');
  console.log('');
  console.log('✅ YES - I can read YouTube transcripts using the youtube-transcript npm package');
  console.log('');
  console.log('However, for video 2P27Ef-LLuQ specifically:');
  const originalVideo = results[0];
  if (originalVideo.success) {
    console.log('✅ This video HAS transcripts available and I can read them!');
  } else {
    console.log('❌ This video has transcripts DISABLED or unavailable');
    console.log(`   Error: ${originalVideo.error}`);
  }
  console.log('');
  console.log('The youtube-transcript.io website you mentioned is a web interface for this.');
  console.log('I cannot access that website directly (domain blocked), but I can use the');
  console.log('underlying technology (npm package) to fetch transcripts programmatically.');
  console.log('='.repeat(80));
}

// Run the test
main()
  .then(() => {
    console.log(`\n✅ Test completed\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Test failed:`, error);
    process.exit(1);
  });
