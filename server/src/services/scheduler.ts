import cron from 'node-cron';
import { dbHelper } from '../db.js';
import { postToPlatform, getPostMetrics } from './mcpClient.js';

export function startScheduler() {
  console.log('[Scheduler] Starting background publisher and analytics tracking worker (native SQLite)...');

  // 1. Publishing Cron: Runs every 10 seconds for snappy demo experience
  cron.schedule('*/10 * * * * *', async () => {
    try {
      const now = new Date();
      // Fetch all scheduled posts that are due
      const pendingPosts = dbHelper.posts.findManyDue(now);

      if (pendingPosts.length > 0) {
        console.log(`[Scheduler] Found ${pendingPosts.length} post(s) due for publishing.`);
      }

      for (const post of pendingPosts) {
        console.log(`[Scheduler] Publishing post ${post.id} to ${post.platform}...`);
        
        try {
          const result = await postToPlatform(post.platform, {
            text: `${post.adCreative.headline}\n\n${post.adCreative.bodyText}\n\n${post.adCreative.hashtags}`,
            imageUrl: post.adCreative.imageUrl || undefined,
            videoUrl: post.adCreative.videoUrl || undefined
          });

          if (result.status === 'success') {
            dbHelper.posts.updateStatus(post.id, {
              status: 'PUBLISHED',
              publishedTime: new Date(),
              platformPostId: result.platformPostId
            });
            console.log(`[Scheduler] Post ${post.id} successfully published and updated.`);
          } else {
            throw new Error('Publish returned failed status');
          }
        } catch (postError: any) {
          console.error(`[Scheduler] Failed to publish post ${post.id}:`, postError);
          dbHelper.posts.updateStatus(post.id, {
            status: 'FAILED',
            errorMessage: postError.message || 'Unknown error during publish'
          });
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error in publishing cron:', err);
    }
  });

  // 2. Analytics Polling Cron: Runs every 20 seconds to keep stats fresh in dashboard
  cron.schedule('*/20 * * * * *', async () => {
    try {
      // Find all posts that are published and have a platform post ID
      const activePosts = dbHelper.posts.findPublishedWithPlatformIds();

      for (const post of activePosts) {
        if (!post.platformPostId) continue;

        try {
          const metrics = await getPostMetrics(post.platform, post.platformPostId);

          // Write a new analytics snapshot
          dbHelper.analytics.createSnapshot({
            postId: post.id,
            views: metrics.views,
            likes: metrics.likes,
            shares: metrics.shares
          });

          // Log periodically
          // console.log(`[Scheduler] Updated metrics for post ${post.id} (${post.platform}): Views = ${metrics.views}`);
        } catch (metricError) {
          console.error(`[Scheduler] Failed to get metrics for post ${post.id}:`, metricError);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error in analytics cron:', err);
    }
  });
}
