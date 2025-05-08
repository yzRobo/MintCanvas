// api/init-chunked-upload.js
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv'; // Import KV

export default async function handler(req, res) {
  console.log('[API /init] Received request');
  if (req.method !== 'POST') {
    console.log('[API /init] Method not allowed');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { fileName, fileType, fileSize, totalChunks, sessionId } = req.body;
    console.log('[API /init] Body parsed:', { fileName, fileType, fileSize, totalChunks, sessionId });

    if (!fileName || !fileType || !fileSize || !totalChunks || !sessionId) {
      console.error('[API /init] Missing required fields in request body.');
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Session info (excluding chunksReceived, which will be in KV)
    const sessionStaticInfo = {
      fileName,
      fileType,
      fileSize,
      totalChunks, // Still useful to store here for finalize step
      createdAt: new Date().toISOString(),
      sessionId: sessionId
    };

    const sessionBlobPath = `${sessionId}/session_static.json`; // Rename to avoid confusion
    console.log(`[API /init] Storing static session info to Vercel Blob at: ${sessionBlobPath}`);
    await put(sessionBlobPath, JSON.stringify(sessionStaticInfo), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    console.log('[API /init] Static session info stored in Vercel Blob.');

    // Initialize chunksReceived counter in KV
    const kvChunksReceivedKey = `${sessionId}_chunksReceived`;
    await kv.set(kvChunksReceivedKey, 0); // Initialize to 0
    console.log(`[API /init] Initialized chunksReceived for ${sessionId} in KV to 0.`);

    return res.status(200).json({
      success: true,
      message: 'Chunked upload session initialized (Blob+KV)',
      sessionId
    });

  } catch (error) {
    console.error('[API /init] Error initializing chunked upload:', error);
    let errorMessage = 'Failed to initialize chunked upload (Blob+KV).';
    if (error.message) {
        errorMessage += ` Details: ${error.message}`;
    }
    console.error('[API /init] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.status(500).json({ success: false, error: errorMessage });
  }
}