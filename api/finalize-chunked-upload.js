// api/finalize-chunked-upload.js
import { list, head, del } from '@vercel/blob';
import { kv } from '@vercel/kv'; // Import KV
import axios from 'axios';

export default async function handler(req, res) {
  console.log('[API /finalize] Received request');
  if (req.method !== 'POST') {
    console.log('[API /finalize] Method not allowed');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { sessionId, name, description, externalUrl, attributes } = req.body;

  if (!sessionId || !name || !description) {
    console.error('[API /finalize] Missing required fields.');
    return res.status(400).json({ success: false, error: 'Missing fields (sessionId, name, description)' });
  }

  const sessionBlobStaticPath = `${sessionId}/session_static.json`;
  const kvChunksReceivedKey = `${sessionId}_chunksReceived`;
  let sessionStaticInfo;
  let allChunkBlobsRaw = [];

  try {
    // 1. Fetch Static Session Info from Blob
    console.log(`[API /finalize] Fetching static session info from: ${sessionBlobStaticPath}`);
    const sessionBlobHead = await head(sessionBlobStaticPath);
    if (!sessionBlobHead) {
      console.warn(`[API /finalize] Static session file not found in Blob: ${sessionBlobStaticPath}`);
      return res.status(404).json({ success: false, error: 'Session not found (static info missing from Blob)' });
    }
    const sessionResponse = await fetch(sessionBlobHead.url);
    if (!sessionResponse.ok) throw new Error(`Failed to fetch session_static.json: ${sessionResponse.statusText}`);
    sessionStaticInfo = await sessionResponse.json();
    console.log('[API /finalize] Static session info fetched:', sessionStaticInfo);

    // 2. Fetch chunksReceived count from KV
    const chunksReceivedFromKV = await kv.get(kvChunksReceivedKey);
    console.log(`[API /finalize] Chunks received from KV for ${sessionId}: ${chunksReceivedFromKV}`);
    if (chunksReceivedFromKV === null || chunksReceivedFromKV === undefined) { // Check for null explicitly as 0 is valid
        console.error(`[API /finalize] chunksReceived count not found in KV for key: ${kvChunksReceivedKey}`);
        return res.status(400).json({ success: false, error: 'Session chunk count missing or expired. Please try again.' });
    }

    // 3. Verify All Chunks Received
    if (chunksReceivedFromKV !== sessionStaticInfo.totalChunks) {
      console.error(`[API /finalize] Not all chunks received. Expected ${sessionStaticInfo.totalChunks}, KV says ${chunksReceivedFromKV}`);
      return res.status(400).json({ success: false, error: `Data corruption or incomplete upload. Expected ${sessionStaticInfo.totalChunks} chunks, received ${chunksReceivedFromKV}. Please try again.` });
    }

    // 4. List and Fetch All Chunks from Blob (same as before)
    console.log(`[API /finalize] Listing chunks with prefix: ${sessionId}/chunk_`);
    const { blobs } = await list({ prefix: `${sessionId}/chunk_`, mode: 'folded' });
    allChunkBlobsRaw = blobs;
    if (blobs.length !== sessionStaticInfo.totalChunks) {
      console.error(`[API /finalize] Mismatch in chunk count in Blob storage. Expected ${sessionStaticInfo.totalChunks}, found ${blobs.length}.`);
      return res.status(400).json({ success: false, error: 'Chunk count mismatch in storage. Please try upload again.' });
    }
    const sortedBlobs = blobs.sort((a, b) => {
      const indexA = parseInt(a.pathname.split('_').pop(), 10);
      const indexB = parseInt(b.pathname.split('_').pop(), 10);
      return indexA - indexB;
    });
    console.log(`[API /finalize] Found and sorted ${sortedBlobs.length} chunks from Blob.`);

    // 5. Reassemble the file (same as before)
    console.log('[API /finalize] Reassembling file from chunks...');
    const chunkBuffers = [];
    for (const blob of sortedBlobs) {
      console.log(`[API /finalize] Downloading chunk: ${blob.pathname} from ${blob.url}`);
      const chunkResponse = await fetch(blob.url);
      if (!chunkResponse.ok) throw new Error(`Failed to download chunk ${blob.pathname}: ${chunkResponse.statusText}`);
      const chunkArrayBuffer = await chunkResponse.arrayBuffer();
      chunkBuffers.push(Buffer.from(chunkArrayBuffer));
    }
    const reassembledBuffer = Buffer.concat(chunkBuffers);
    console.log(`[API /finalize] File reassembled. Total size: ${reassembledBuffer.length} bytes. Expected: ${sessionStaticInfo.fileSize}`);
    if (reassembledBuffer.length !== sessionStaticInfo.fileSize) {
        console.warn(`[API /finalize] Reassembled file size mismatch. Got ${reassembledBuffer.length}, expected ${sessionStaticInfo.fileSize}.`);
    }

    // 6. Pin Reassembled File to Pinata (same as before)
    console.log('[API /finalize] Pinning reassembled image to Pinata...');
    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) throw new Error("Pinata JWT is not configured.");
    const pinataFormData = new FormData();
    const imageBlobForPinata = new Blob([reassembledBuffer], { type: sessionStaticInfo.fileType });
    pinataFormData.append('file', imageBlobForPinata, sessionStaticInfo.fileName);
    pinataFormData.append('pinataMetadata', JSON.stringify({ name: `${name}-image` || sessionStaticInfo.fileName }));
    const imagePinResponse = await axios.post( /* ... Pinata URL ... */ 'https://api.pinata.cloud/pinning/pinFileToIPFS', pinataFormData, { headers: { 'Authorization': `Bearer ${PINATA_JWT}` }, maxBodyLength: Infinity, maxContentLength: Infinity, timeout: 120000 });
    if (!imagePinResponse.data?.IpfsHash) throw new Error("Pinata image response missing IpfsHash.");
    const imageCID = imagePinResponse.data.IpfsHash;
    const imageURI = `ipfs://${imageCID}`;
    console.log('[API /finalize] Image pinned to Pinata:', imageURI);

    // 7. Create and Pin Metadata JSON (same as before)
    console.log('[API /finalize] Creating and pinning metadata JSON to Pinata...');
    const metadata = { name, description, image: imageURI, external_url: externalUrl || '', attributes: attributes || [] };
    const jsonPinResponse = await axios.post( /* ... Pinata URL ... */ 'https://api.pinata.cloud/pinning/pinJSONToIPFS', { pinataOptions: { cidVersion: 1 }, pinataMetadata: { name: `${name}-metadata` || `metadata-${sessionId}` }, pinataContent: metadata }, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PINATA_JWT}` }, timeout: 30000 });
    if (!jsonPinResponse.data?.IpfsHash) throw new Error("Pinata JSON response missing IpfsHash.");
    const jsonCID = jsonPinResponse.data.IpfsHash;
    const tokenURI = `ipfs://${jsonCID}`;
    console.log('[API /finalize] Metadata JSON pinned to Pinata:', tokenURI);

    // 8. Cleanup Vercel Blobs and KV entry
    console.log('[API /finalize] Cleaning up Vercel Blobs and KV entry...');
    const blobUrlsToDelete = sortedBlobs.map(b => b.url);
    blobUrlsToDelete.push(sessionBlobHead.url); // Add session_static.json url
    await del(blobUrlsToDelete);
    await kv.del(kvChunksReceivedKey); // Delete the KV counter
    console.log('[API /finalize] Vercel Blobs and KV entry cleaned up.');

    // 9. Success
    return res.status(200).json({
      success: true, message: 'File processed and metadata pinned successfully!',
      tokenURI, imageURI, jsonCID, imageCID
    });

  } catch (error) {
    console.error('[API /finalize] Error finalizing chunked upload:', error);
    if (allChunkBlobsRaw.length > 0 || sessionBlobStaticPath) {
      try { /* ... error cleanup logic (same as before, consider deleting KV entry too) ... */
        console.log('[API /finalize] Attempting cleanup after error...');
        const urlsToDeleteOnError = allChunkBlobsRaw.map(b => b.url);
        if (sessionBlobStaticPath) {
            try {
                const sessionHeadOnError = await head(sessionBlobStaticPath);
                if (sessionHeadOnError) urlsToDeleteOnError.push(sessionHeadOnError.url);
            } catch (headErr) { /* ignore */ }
        }
        if (urlsToDeleteOnError.length > 0) await del(urlsToDeleteOnError);
        await kv.del(kvChunksReceivedKey); // Attempt to delete KV entry on error too
        console.log('[API /finalize] Partial/Full cleanup after error completed.');
      } catch (cleanupError) { console.error('[API /finalize] Error during cleanup after main error:', cleanupError); }
    }
    let errorMessage = `Failed to finalize upload for session ${sessionId}.`;
    if (error.message) errorMessage += ` Details: ${error.message}`;
    return res.status(500).json({ success: false, error: errorMessage });
  }
}