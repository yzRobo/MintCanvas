// api/upload-chunk.js
import { put, head } from '@vercel/blob';
import { kv } from '@vercel/kv'; // Import KV

export default async function handler(req, res) {
  console.log('[API /upload-chunk] Received request');

  if (req.method !== 'POST') {
    console.log('[API /upload-chunk] Method not allowed');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { chunkData, chunkIndex, totalChunks, sessionId } = req.body; // totalChunks from body is still useful for initial log

  try {
    console.log(`[API /upload-chunk] Processing chunk ${chunkIndex + 1}/${totalChunks} for session ${sessionId}`);

    if (chunkData === undefined || chunkIndex === undefined || !sessionId) { // totalChunks not strictly needed from body if sessionInfo is fetched
      console.error('[API /upload-chunk] Missing required fields.');
      return res.status(400).json({ success: false, error: 'Missing fields (chunkData, chunkIndex, sessionId)' });
    }

    // Fetch static session info to get fileType etc.
    const sessionBlobPath = `${sessionId}/session_static.json`;
    let sessionStaticInfo;
    try {
      const sessionBlob = await head(sessionBlobPath);
      if (!sessionBlob) {
        console.warn(`[API /upload-chunk] Static session file not found: ${sessionBlobPath}`);
        return res.status(404).json({ success: false, error: 'Session not found (static info missing)' });
      }
      const response = await fetch(sessionBlob.url);
      if (!response.ok) throw new Error(`Failed to fetch session_static.json: ${response.statusText}`);
      sessionStaticInfo = await response.json();
    } catch (fetchError) {
      console.error(`[API /upload-chunk] Error fetching static session info for ${sessionBlobPath}:`, fetchError);
      return res.status(500).json({ success: false, error: 'Failed to retrieve static session info.' });
    }

    const base64PrefixMatch = /^data:[^;]+;base64,/;
    const base64ActualData = chunkData.replace(base64PrefixMatch, '');
    const buffer = Buffer.from(base64ActualData, 'base64');

    const chunkBlobPath = `${sessionId}/chunk_${chunkIndex}`;
    await put(chunkBlobPath, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: sessionStaticInfo.fileType || 'application/octet-stream',
    });
    console.log(`[API /upload-chunk] Saved chunk ${chunkIndex} to Vercel Blob at ${chunkBlobPath}`);

    // Atomically increment chunksReceived in KV
    const kvChunksReceivedKey = `${sessionId}_chunksReceived`;
    const newChunksReceived = await kv.incr(kvChunksReceivedKey); // incr is atomic
    console.log(`[API /upload-chunk] Updated chunksReceived in KV for ${sessionId} to: ${newChunksReceived}/${sessionStaticInfo.totalChunks}`);

    return res.status(200).json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${sessionStaticInfo.totalChunks} received and stored.`,
      chunksReceived: newChunksReceived, // Return the new count from KV
      totalChunks: sessionStaticInfo.totalChunks,
    });

  } catch (error) {
    console.error('[API /upload-chunk] Error processing chunk:', error);
    const SId = sessionId || 'unknown_session';
    let errorMessage = `Failed to upload chunk for session ${SId} (KV).`;
    if (error.message) errorMessage += ` Details: ${error.message}`;
    console.error('[API /upload-chunk] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.status(500).json({ success: false, error: errorMessage });
  }
}