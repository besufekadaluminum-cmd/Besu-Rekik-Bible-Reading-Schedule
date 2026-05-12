// api/sync.js - Multi-user support for Bible Reading App
import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { user } = req.query;
      // Support for all three users: user1 (Belidet), user2 (Ephi), user3 (Sari)
      let userId = 'user1';
      if (user === 'user2') userId = 'user2';
      else if (user === 'user3') userId = 'user3';
      else if (user === 'user1') userId = 'user1';
      
      const fileName = `bible-reading-${userId}.json`;
      
      const { blobs } = await list();
      const progressBlob = blobs.find(blob => blob.pathname === fileName);
      
      if (!progressBlob) {
        return res.status(200).json({ completedDays: [] });
      }
      
      const response = await fetch(progressBlob.url);
      const data = await response.json();
      
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { completedDays, userId } = req.body;
      // Support for all three users
      let targetUser = 'user1';
      if (userId === 'user2') targetUser = 'user2';
      else if (userId === 'user3') targetUser = 'user3';
      else targetUser = 'user1';
      
      const fileName = `bible-reading-${targetUser}.json`;
      
      const blob = await put(fileName, JSON.stringify({ 
        completedDays: completedDays || [],
        lastUpdated: new Date().toISOString(),
        userId: targetUser
      }), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });

      return res.status(200).json({ success: true, url: blob.url });
    }

    if (req.method === 'DELETE') {
      const { user } = req.query;
      const { blobs } = await list();
      
      if (user === 'all') {
        // Delete all user progress files
        for (const blob of blobs) {
          if (blob.pathname.startsWith('bible-reading-')) {
            await del(blob.url);
          }
        }
      } else {
        // Delete specific user's progress
        let userId = 'user1';
        if (user === 'user2') userId = 'user2';
        else if (user === 'user3') userId = 'user3';
        else if (user === 'user1') userId = 'user1';
        
        const fileName = `bible-reading-${userId}.json`;
        const targetBlob = blobs.find(blob => blob.pathname === fileName);
        
        if (targetBlob) {
          await del(targetBlob.url);
        }
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
