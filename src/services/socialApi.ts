import axios from 'axios';
import { google } from 'googleapis';

export interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  dislikes: number;
  thumbnail: string;
}

export interface SocialMetrics {
  posts_per_day_7d: number;
  avg_reach_7d: number;
  saves_7d: number;
  shares_7d: number;
  watch_time_7d: number;
  follower_delta_7d: number;
  total_followers?: number;
  likes_7d?: number;
  dislikes_7d?: number;
  recentVideos?: YouTubeVideo[];
}

/**
 * Fetch real YouTube metrics using the YouTube Data API.
 * Requires YOUTUBE_API_KEY and the channel's ID.
 */
export async function fetchYouTubeMetrics(channelId: string, providedApiKey?: string): Promise<SocialMetrics | null> {
  const apiKey = providedApiKey || process.env.YOUTUBE_API_KEY;
  if (!apiKey || !channelId) return null;

  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });

    // 1. Get channel statistics (for follower delta)
    const channelRes = await youtube.channels.list({
      part: ['statistics'],
      id: [channelId],
    });
    const totalSubscribers = parseInt(channelRes.data.items?.[0]?.statistics?.subscriberCount || '0');

    // 2. Get videos from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const searchRes = await youtube.search.list({
      part: ['id', 'snippet'],
      channelId: channelId,
      publishedAfter: sevenDaysAgo.toISOString(),
      maxResults: 10,
      type: ['video'],
      order: 'date'
    });

    const videoIds = searchRes.data.items?.map(item => item.id?.videoId).filter(Boolean) as string[];
    const postCount = videoIds?.length || 0;

    let totalViews = 0;
    let totalLikes = 0;
    let totalDislikes = 0;
    const recentVideos: YouTubeVideo[] = [];
    
    if (videoIds.length > 0) {
      const videoRes = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds,
      });

      videoRes.data.items?.forEach(video => {
        const views = parseInt(video.statistics?.viewCount || '0');
        const likes = parseInt(video.statistics?.likeCount || '0');
        const dislikes = parseInt((video.statistics as any)?.dislikeCount || '0');
        
        totalViews += views;
        totalLikes += likes;
        totalDislikes += dislikes;

        recentVideos.push({
          id: video.id!,
          title: video.snippet?.title || 'Untitled',
          publishedAt: video.snippet?.publishedAt || '',
          views,
          likes,
          dislikes,
          thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || ''
        });
      });
    }

    return {
      posts_per_day_7d: postCount / 7,
      avg_reach_7d: postCount > 0 ? Math.floor(totalViews / postCount) : 0,
      saves_7d: Math.floor(totalLikes * 0.1), // Proxy: YouTube doesn't have "saves" in public API
      shares_7d: Math.floor(totalLikes * 0.05), // Proxy: YouTube doesn't have "shares" in public API
      watch_time_7d: Math.floor(totalViews * 3), // Proxy: 3 mins avg watch time
      follower_delta_7d: 0, 
      total_followers: totalSubscribers,
      likes_7d: totalLikes,
      dislikes_7d: totalDislikes,
      recentVideos
    };
  } catch (error: any) {
    if (error.code === 403 || error.message?.includes('key')) {
      console.warn('YouTube API: Invalid or missing API key.');
    } else {
      console.error('YouTube API Error:', error.message || error);
    }
    return null;
  }
}

/**
 * Fetch real Meta (Instagram) metrics using the Graph API.
 * Requires META_ACCESS_TOKEN and the Instagram Business Account ID.
 */
export async function fetchMetaMetrics(instagramId: string, providedAccessToken?: string): Promise<SocialMetrics | null> {
  const accessToken = (providedAccessToken || process.env.META_ACCESS_TOKEN || "").trim();
  if (!accessToken || accessToken === "undefined" || accessToken === "null" || !instagramId) {
    return null;
  }

  try {
    // 1. Get account info (followers)
    const accountRes = await axios.get(`https://graph.facebook.com/v21.0/${instagramId}`, {
      params: {
        fields: 'followers_count',
        access_token: accessToken,
      }
    });
    const totalFollowers = accountRes.data.followers_count || 0;

    // 2. Get media from the last 7 days
    const mediaRes = await axios.get(`https://graph.facebook.com/v21.0/${instagramId}/media`, {
      params: {
        fields: 'id,timestamp,media_type,like_count,comments_count,insights.metric(reach,saved,video_views)',
        access_token: accessToken,
      }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMedia = mediaRes.data.data.filter((item: any) => new Date(item.timestamp) > sevenDaysAgo);
    const postCount = recentMedia.length;

    let totalReach = 0;
    let totalSaves = 0;
    let totalViews = 0;
    let totalLikes = 0;

    recentMedia.forEach((media: any) => {
      totalLikes += media.like_count || 0;
      const insights = media.insights?.data || [];
      totalReach += insights.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;
      totalSaves += insights.find((i: any) => i.name === 'saved')?.values[0]?.value || 0;
      totalViews += insights.find((i: any) => i.name === 'video_views')?.values[0]?.value || 0;
    });

    return {
      posts_per_day_7d: postCount / 7,
      avg_reach_7d: postCount > 0 ? Math.floor(totalReach / postCount) : 0,
      saves_7d: totalSaves,
      shares_7d: Math.floor(totalLikes * 0.1), // Proxy: shares not always available in bulk media insights
      watch_time_7d: Math.floor(totalViews * 0.5), // Proxy: 30s avg watch time
      follower_delta_7d: 0,
      total_followers: totalFollowers,
      likes_7d: totalLikes
    };
  } catch (error: any) {
    if (error.response?.data?.error?.code === 190 || error.message?.includes('expired')) {
      console.warn('Meta API: Access token has expired. Please update it in Settings.');
    } else {
      console.warn('Meta API Notice:', error.response?.data?.error?.message || error.message);
    }
    return null;
  }
}

/**
 * Resolve a YouTube handle (e.g., @avemariaradio) to a Channel ID.
 */
export async function resolveYouTubeHandle(handle: string, providedApiKey?: string): Promise<string | null> {
  const apiKey = providedApiKey || process.env.YOUTUBE_API_KEY;
  if (!apiKey || !handle) return null;

  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;

  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    
    // 1. Try resolving via handle (modern way)
    const res = await youtube.channels.list({
      part: ['id'],
      forHandle: cleanHandle
    });

    if (res.data.items?.[0]?.id) {
      return res.data.items[0].id;
    }

    // 2. Fallback: Search for the channel by handle name
    const searchRes = await youtube.search.list({
      part: ['id'],
      q: handle,
      type: ['channel'],
      maxResults: 1
    });

    return searchRes.data.items?.[0]?.id?.channelId || null;
  } catch (error) {
    console.error('YouTube Resolve Error:', error);
    return null;
  }
}

/**
 * Resolve an Instagram handle to a Business Account ID.
 * This requires Business Discovery permissions and a valid Business ID to act as the requester.
 */
export async function resolveInstagramHandle(handle: string, requesterBusinessId: string, providedAccessToken?: string): Promise<string | null> {
  const accessToken = providedAccessToken || process.env.META_ACCESS_TOKEN;
  if (!accessToken || !handle || !requesterBusinessId) return null;

  const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;

  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/${requesterBusinessId}`, {
      params: {
        fields: `business_discovery.username(${cleanHandle}){id}`,
        access_token: accessToken,
      }
    });

    return res.data.business_discovery?.id || null;
  } catch (error) {
    console.error('Instagram Resolve Error:', error);
    return null;
  }
}

/**
 * Get the Instagram Business Account ID associated with the access token.
 */
export async function getInstagramBusinessIdFromToken(providedAccessToken?: string): Promise<string | null> {
  const accessToken = (providedAccessToken || process.env.META_ACCESS_TOKEN || "").trim();
  if (!accessToken || accessToken === "undefined" || accessToken === "null") return null;

  try {
    // 1. Get Facebook Pages associated with the token
    const pagesRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: {
        access_token: accessToken,
      }
    });

    const pages = pagesRes.data.data;
    if (!pages || pages.length === 0) return null;

    // 2. For each page, check if it has a linked Instagram Business Account
    for (const page of pages) {
      const igRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: accessToken,
        }
      });

      if (igRes.data.instagram_business_account?.id) {
        return igRes.data.instagram_business_account.id;
      }
    }

    return null;
  } catch (error: any) {
    if (error.response?.data?.error?.code === 190 || error.message?.includes('expired')) {
      console.warn('Meta API: Access token has expired or is invalid. Please update it in Settings.');
    } else {
      console.warn('Meta API Notice:', error.response?.data?.error?.message || error.message);
    }
    return null;
  }
}
