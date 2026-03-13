import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ override: true });

async function testYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  console.log('Using API Key:', apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING');
  
  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    const res = await youtube.channels.list({
      part: ['id'],
      forHandle: '@avemariaradio'
    });
    console.log('YouTube response:', JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.error('YouTube API Error:', error.message);
  }
}

testYouTube();
