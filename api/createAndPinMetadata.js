// api/createAndPinMetadata.js - Updated to handle base64 image uploads
import axios from 'axios';

// Set the maximum duration for the function
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase the size limit for JSON payloads
    },
    // Maximum duration to prevent timeouts
    maxDuration: 60 // 60 seconds (adjust based on your Vercel plan)
  },
};

// Helper: Convert base64 to Buffer
const base64ToBuffer = (base64String) => {
  // Remove the data:image/xyz;base64, prefix if exists
  const base64Data = base64String.includes('base64,') 
    ? base64String.split('base64,')[1] 
    : base64String;
  
  return Buffer.from(base64Data, 'base64');
};

// Helper: Pin File Buffer to IPFS
const pinBufferToIPFS = async (fileBuffer, fileName, fileType) => {
  console.log(`[pinBufferToIPFS] Starting pin for: ${fileName}`);
  
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) throw new Error("Pinata JWT is not configured.");

  try {
    // Create form data for Pinata
    const formData = new FormData();
    
    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: fileType });
    
    // Append the file to form data
    formData.append('file', blob, fileName);
    formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
    
    console.log(`[pinBufferToIPFS] Sending to Pinata...`);
    
    // Upload to Pinata with timeout
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: { 
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('[pinBufferToIPFS] Pinata Response:', response.status);
    
    if (!response.data || !response.data.IpfsHash) {
      throw new Error("Pinata file response missing IpfsHash.");
    }
    
    return response.data; // Returns { IpfsHash, PinSize, Timestamp }
  } catch (error) {
    console.error('[pinBufferToIPFS] Error pinning file:', error.message);
    let errorMessage = error.message;
    if (error.response?.data?.error) {
      errorMessage = typeof error.response.data.error === 'object' 
        ? JSON.stringify(error.response.data.error) 
        : error.response.data.error;
    }
    throw new Error(`Pinata file pinning failed: ${errorMessage}`);
  }
};

// Helper: Pin JSON to IPFS
const pinJsonToIPFS = async (jsonData, jsonFilename) => {
  console.log(`[pinJsonToIPFS] Starting pin for: ${jsonFilename}`);
  
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) throw new Error("Pinata JWT is not configured.");

  try {
    const dataToPin = {
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: jsonFilename },
      pinataContent: jsonData
    };
    
    console.log(`[pinJsonToIPFS] Sending JSON to Pinata...`);
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      dataToPin,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('[pinJsonToIPFS] Pinata Response:', response.status);
    
    if (!response.data || !response.data.IpfsHash) {
      throw new Error("Pinata JSON response missing IpfsHash.");
    }
    
    return response.data; // Returns { IpfsHash, PinSize, Timestamp }
  } catch (error) {
    console.error('[pinJsonToIPFS] Error pinning JSON:', error.message);
    let errorMessage = error.message;
    if (error.response?.data?.error) {
      errorMessage = typeof error.response.data.error === 'object' 
        ? JSON.stringify(error.response.data.error) 
        : error.response.data.error;
    }
    throw new Error(`Pinata JSON pinning failed: ${errorMessage}`);
  }
};

// --- API Route Handler ---
export default async function handler(req, res) {
  console.log(`API Request Start: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}, URL: ${req.url}`);

  // Check method
  if (req.method !== 'POST') {
    console.log("API Error: Method Not Allowed");
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Check API credentials
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) {
    console.error("API Error: PINATA_JWT not set");
    return res.status(500).json({ 
      success: false, 
      error: 'Server configuration error: Missing API credentials' 
    });
  }

  try {
    // Extract data from the JSON payload
    const { 
      name, 
      description, 
      externalUrl, 
      attributes, 
      imageBase64, 
      fileName, 
      fileType 
    } = req.body;

    // Log fields for debugging
    console.log("API: Parsed fields:", { 
      name, 
      description: description?.substring(0, 30) + '...',
      externalUrl,
      attributesCount: attributes?.length || 0,
      imageBase64: imageBase64 ? 'Present (not shown)' : 'Missing',
      fileName,
      fileType
    });

    // Validate inputs
    if (!imageBase64 || !name || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields (imageBase64, name, description)' 
      });
    }

    // Convert base64 to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    console.log(`API: Converted base64 to buffer, size: ${imageBuffer.length} bytes`);

    // Pin image buffer to IPFS
    console.log("API: Starting image pinning...");
    const imageResult = await pinBufferToIPFS(
      imageBuffer,
      fileName || 'nft-image.png',
      fileType || 'image/png'
    );
    
    const imageCID = imageResult.IpfsHash;
    const imageURI = `ipfs://${imageCID}`;
    console.log("API: Image pinned successfully. URI:", imageURI);

    // Create metadata JSON
    const metadata = {
      name: name,
      description: description,
      image: imageURI,
      external_url: externalUrl || '',
      attributes: attributes || []
    };

    // Pin metadata JSON
    const jsonFilename = `${name.replace(/[^a-zA-Z0-9_.-]/g, '_')}_${Date.now()}.json`;
    const jsonResult = await pinJsonToIPFS(metadata, jsonFilename);
    const jsonCID = jsonResult.IpfsHash;
    const tokenURI = `ipfs://${jsonCID}`;
    console.log("API: JSON pinned successfully. Token URI:", tokenURI);

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Metadata created and pinned successfully!",
      tokenURI,
      imageURI,
      jsonCID,
      imageCID
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error during pinning'
    });
  }
}