import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ override: true });

async function testMeta() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  console.log('Using token:', accessToken ? accessToken.substring(0, 10) + '...' : 'MISSING');
  
  try {
    console.log('Attempting to get pages...');
    const pagesRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: {
        access_token: accessToken,
      }
    });
    console.log('Pages response:', JSON.stringify(pagesRes.data, null, 2));
  } catch (error: any) {
    console.error('Meta API Error:', error.response?.status, error.response?.data);
  }
}

testMeta();
