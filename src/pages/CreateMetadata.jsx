// src/pages/CreateMetadata.jsx
// (Formerly CreateMetadataLarge.jsx - This is now the universal metadata creator)
import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Navigate, useNavigate } from 'react-router-dom';
import { useNetwork } from '@/contexts/NetworkContext';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, PlusCircle, XCircle, Copy, ArrowRight, AlertCircle, LinkIcon } from 'lucide-react';
import ErrorMessage from '@/components/ErrorMessage';
// SuccessMessage could be used if you want a distinct visual for API success vs. transaction success later
// import SuccessMessage from '@/components/SuccessMessage'; 

// Size of each chunk in bytes (1MB) for chunked uploads
const CHUNK_SIZE = 1 * 1024 * 1024;
// Threshold for switching to chunked upload
const CHUNK_UPLOAD_THRESHOLD = 3 * 1024 * 1024; // 3MB

const UploadStatus = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  CHUNKING: 'chunking', // Only for large files
  UPLOADING: 'uploading',
  PROCESSING: 'processing', // Covers finalization for chunked, or direct pinning
  SUCCESS: 'success',
  ERROR: 'error'
};

const CreateMetadata = () => { // Renamed from CreateMetadataLarge
  // --- Hooks ---
  const navigate = useNavigate();
  const { isOwner: layoutIsOwner, checkingOwner: layoutCheckingOwner, isWalletConnected } = useOutletContext();
  const { currentNetwork, isInitialized: networkInitialized } = useNetwork();

  // --- State ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [attributes, setAttributes] = useState([{ trait_type: '', value: '' }]);
  const [status, setStatus] = useState(UploadStatus.IDLE);
  const [progressMessage, setProgressMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const [copySuccess, setCopySuccess] = useState('');


  // --- Event Handlers ---
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setUploadProgress(0);
    setProgressMessage('');

    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.onerror = () => setError("Failed to read image file for preview.");
      reader.readAsDataURL(file);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setProgressMessage(`Selected file: ${file.name} (${fileSizeMB} MB)`);
    } else if (file) {
      setError("Please select a valid image file (e.g., JPG, PNG, GIF).");
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddAttribute = () => setAttributes([...attributes, { trait_type: '', value: '' }]);
  const handleAttributeChange = (index, field, value) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };
  const handleRemoveAttribute = (indexToRemove) => setAttributes(attributes.filter((_, index) => index !== indexToRemove));

  const copyToClipboard = (textToCopy, successMsg) => {
      navigator.clipboard.writeText(textToCopy).then(() => {
          setCopySuccess(successMsg);
          setTimeout(() => setCopySuccess(''), 2000);
      }).catch(err => {
          console.error('Failed to copy:', err);
          setError('Failed to copy to clipboard.');
      });
  };

  // --- File Processing Logic (for chunking) ---
  const createChunks = (file, chunkSize) => {
    const chunks = []; const totalChunks = Math.ceil(file.size / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize; const end = Math.min(file.size, start + chunkSize);
      chunks.push(file.slice(start, end));
    } return { chunks, totalChunks };
  };
  const encodeChunk = async (chunk) => new Promise((resolve, reject) => { // Added reject for robustness
    const reader = new FileReader(); 
    reader.onloadend = () => resolve(reader.result); 
    reader.onerror = (error) => reject(error); // Handle potential read errors
    reader.readAsDataURL(chunk);
  });

  // --- Main Form Submission Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(''); setCopySuccess(''); setProgressMessage(''); setResult(null); setStatus(UploadStatus.PREPARING); setUploadProgress(0);
    setProgressMessage('1/4: Validating data...');

    if (!imageFile || !name.trim() || !description.trim()) { setError("Name, Description, and Image are required."); setStatus(UploadStatus.ERROR); return; }
    const validAttributes = attributes.filter(attr => attr.trait_type.trim() && attr.value.trim());
    const hasPartiallyFilled = attributes.some(attr => (attr.trait_type.trim() && !attr.value.trim()) || (!attr.trait_type.trim() && attr.value.trim()));
    if (hasPartiallyFilled) { setError("Please fill or remove incomplete attribute rows."); setStatus(UploadStatus.ERROR); return; }

    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    try {
        const useChunkedUpload = imageFile.size > CHUNK_UPLOAD_THRESHOLD;

        if (useChunkedUpload) {
            // --- Chunked Upload Path ---
            setStatus(UploadStatus.CHUNKING);
            setProgressMessage('2/4: Preparing file chunks...');
            const { chunks, totalChunks } = createChunks(imageFile, CHUNK_SIZE);
            console.log(`Chunking complete: ${totalChunks} chunks`);

            const initResponse = await fetch('/api/init-chunked-upload', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: imageFile.name, fileType: imageFile.type, fileSize: imageFile.size, totalChunks, sessionId })
            });
            if (!initResponse.ok) {
                let errorMsg = `Failed to initialize chunked upload: HTTP ${initResponse.status}`;
                try { const errorData = await initResponse.json(); if (errorData && errorData.error) errorMsg = `Init failed: ${errorData.error}`; } catch (e) { errorMsg = `Init failed: ${initResponse.statusText || initResponse.status}`; }
                throw new Error(errorMsg);
            }
            console.log('Chunked upload initialized on backend.');

            setStatus(UploadStatus.UPLOADING);
            setProgressMessage(`2/4: Uploading file (${totalChunks} chunks)...`);
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i]; const base64Chunk = await encodeChunk(chunk);
                const chunkPayload = { chunkData: base64Chunk, chunkIndex: i, totalChunks, sessionId };
                console.log(`Uploading chunk ${i + 1}/${totalChunks}...`);
                const chunkResponse = await fetch('/api/upload-chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chunkPayload) });
                if (!chunkResponse.ok) { const errorData = await chunkResponse.json().catch(() => ({ error: 'Unknown chunk upload error' })); throw new Error(`Upload chunk ${i + 1} failed: ${errorData.error || chunkResponse.statusText}`); }
                const chunkResData = await chunkResponse.json(); console.log(`Chunk ${i + 1} resp:`, chunkResData.message); // Use data from response
                setUploadProgress(Math.round(((i + 1) / totalChunks) * 75));
            }

            setStatus(UploadStatus.PROCESSING);
            setProgressMessage('3/4: Processing file & pinning...');
            setUploadProgress(85);
            const finalizePayload = { sessionId, name: name.trim(), description: description.trim(), externalUrl: externalUrl.trim(), attributes: validAttributes };
            const finalizeResponse = await fetch('/api/finalize-chunked-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalizePayload) });
            if (!finalizeResponse.ok) { const errorData = await finalizeResponse.json().catch(() => ({ error: 'Unknown finalization error' })); throw new Error(`Finalization failed: ${errorData.error || finalizeResponse.statusText}`); }
            const data = await finalizeResponse.json();
            if (!data.success) throw new Error(data.error || 'Finalization API returned failure');
            setResult(data);
            console.log("Chunked metadata creation success:", data);

        } else {
            // --- Direct Upload Path (for smaller files, uses /api/createAndPinMetadata) ---
            setStatus(UploadStatus.UPLOADING); 
            setProgressMessage('2/4: Uploading & Pinning (Direct)...');
            const reader = new FileReader();
            const fileToBase64 = new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(imageFile); });
            const base64File = await fileToBase64;
            setUploadProgress(50);

            const payload = { name: name.trim(), description: description.trim(), externalUrl: externalUrl.trim(), attributes: validAttributes, imageBase64: base64File, fileName: imageFile.name, fileType: imageFile.type, fileSize: imageFile.size };
            console.log("Sending data to /api/createAndPinMetadata");
            const response = await fetch('/api/createAndPinMetadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setUploadProgress(85); 
            if (!response.ok) { const errorText = await response.text(); let errMsg; try { const errorData = JSON.parse(errorText); errMsg = errorData.error || `API Error ${response.status}`; } catch (e) { errMsg = `API Error ${response.status}: ${errorText.substring(0, 100)}`; } throw new Error(errMsg); }
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Direct API call returned failure');
            setResult(data);
            console.log("Direct metadata creation success:", data);
        }

        setUploadProgress(100);
        setProgressMessage('4/4: Success! Metadata ready.');
        setStatus(UploadStatus.SUCCESS);

    } catch (err) {
      console.error("Error submitting metadata form:", err);
      setError(`Failed to create metadata: ${err.message}`);
      setStatus(UploadStatus.ERROR);
      setUploadProgress(0);
    }
  };

  // --- Render Logic ---
  if (layoutCheckingOwner || !networkInitialized) { return <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-2 text-muted-foreground">Initializing...</p></div>; }
  if (!isWalletConnected) { return <div className="text-center p-6 border rounded bg-muted"><p className="text-lg font-semibold">Wallet Not Connected</p><p className="text-muted-foreground">Connect wallet to create metadata.</p></div>; }
  if (!layoutIsOwner) { return <Navigate to="/" replace />; }

  const isLoading = [UploadStatus.PREPARING, UploadStatus.CHUNKING, UploadStatus.UPLOADING, UploadStatus.PROCESSING].includes(status);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <h2 className="text-3xl font-bold">Create NFT Metadata</h2>
      <p className="text-muted-foreground">
        Fill in the details for your NFT. This tool handles images of all sizes,
        {` automatically using chunked uploads for larger files (> ${CHUNK_UPLOAD_THRESHOLD / (1024*1024)}MB). `}
        Use the generated **Minter Link** to mint on the <span className='font-medium'>{currentNetwork?.name || 'current'}</span> network.
      </p>

      {status === UploadStatus.ERROR && error && !result && (
        <ErrorMessage message={error} onClose={() => { setError(''); setStatus(UploadStatus.IDLE); }}/>
      )}
      {copySuccess && (
           <div className="fixed bottom-16 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-3 py-2 rounded-md text-sm z-50 shadow">
               {copySuccess}
           </div>
       )}

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader><CardTitle>Enter NFT Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
          <div className="space-y-1.5">
              <Label htmlFor="externalUrl-universal">External URL (Optional)</Label>
              <Input id="externalUrl-universal" type="url" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://your-site.com/artwork/{id}" disabled={isLoading}/>
              <p className="text-xs text-muted-foreground">A link to view details about this specific artwork.</p>
            </div>
            <div className="space-y-1.5"> <Label htmlFor="description-universal">Description *</Label> <Textarea id="description-universal" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details about the artwork..." required disabled={isLoading} rows={4}/> </div>
            <div className="space-y-1.5"> <Label htmlFor="externalUrl-universal">External URL (Optional)</Label> <Input id="externalUrl-universal" type="url" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://briancpierce.art/your-artwork" disabled={isLoading}/> <p className="text-xs text-muted-foreground">A link to view details about this specific artwork.</p> </div>
            <div className="space-y-1.5"> <Label htmlFor="imageFile-universal">Image File *</Label> <Input id="imageFile-universal" type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} required disabled={isLoading} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"/> <p className="text-xs text-muted-foreground">Upload the primary visual asset (JPG, PNG, GIF etc.). Large files are automatically chunked.</p> {progressMessage && !isLoading && (<p className="text-sm text-muted-foreground mt-1">{progressMessage}</p>)} {imagePreview && (<div className="mt-2 border rounded p-2 max-w-[200px] relative group bg-muted/20"> <img src={imagePreview} alt="Preview" className="max-w-full h-auto rounded block"/> <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-red-500 bg-background/60 hover:bg-background/80 rounded-full h-6 w-6 opacity-50 group-hover:opacity-100" onClick={() => {setImageFile(null); setImagePreview(null); setProgressMessage(''); if (fileInputRef.current) fileInputRef.current.value = '';}} disabled={isLoading} title="Remove Image"> <XCircle className="h-4 w-4"/> </Button> </div>)} </div>
            <div className="space-y-3 pt-3 border-t"> <Label className="font-medium text-base">Attributes</Label> <p className="text-xs text-muted-foreground">Add specific traits (e.g., Year, Medium, Style).</p> {attributes.map((attr, index) => (<div key={index} className="flex items-center gap-2 p-2 border rounded bg-muted/30"> <Input placeholder="Trait Type" value={attr.trait_type} onChange={e => handleAttributeChange(index, 'trait_type', e.target.value)} disabled={isLoading} className="flex-1"/> <Input placeholder="Value" value={attr.value} onChange={e => handleAttributeChange(index, 'value', e.target.value)} disabled={isLoading} className="flex-1"/> <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAttribute(index)} disabled={isLoading || attributes.length <= 1} title="Remove Attribute" className={attributes.length <= 1 ? 'text-muted-foreground cursor-not-allowed' : 'text-red-500 hover:text-red-700'}> <XCircle className="h-4 w-4"/> </Button> </div>))} <Button type="button" variant="outline" size="sm" onClick={handleAddAttribute} disabled={isLoading}> <PlusCircle className="h-4 w-4 mr-1"/> Add Attribute </Button> </div>

            {isLoading && (
              <div className="space-y-2 pt-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progressMessage}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col items-start gap-4 pt-5 border-t">
            <Button type="submit" disabled={isLoading || !imageFile || !name || !description}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {status === UploadStatus.UPLOADING ? `Uploading ${uploadProgress}%...` : progressMessage}</>)
                         : (<><Upload className="mr-2 h-4 w-4" /> Generate & Pin Metadata</>)}
            </Button>

            {status === UploadStatus.ERROR && error && (
              <div className="w-full p-3 border rounded bg-destructive/10 border-destructive/30 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0"/><span>{error}</span>
              </div>
            )}

            {result && status === UploadStatus.SUCCESS && (
                <div className="w-full p-4 border rounded bg-green-50 border-green-300 space-y-4">
                    <p className="font-semibold text-lg text-green-800">Metadata Ready!</p>
                    <div className="space-y-1.5 text-sm"> <Label className="text-xs text-green-700/80">Image URI (IPFS)</Label> <div className="flex items-center gap-2"> <Input readOnly value={result.imageURI} className="flex-grow text-xs bg-green-100/50 border-green-200 text-green-900"/> <Button type="button" size="icon" variant="ghost" onClick={() => copyToClipboard(result.imageURI, 'Image URI Copied!')} title="Copy Image URI" className="h-8 w-8 text-green-700 hover:bg-green-100"> <Copy className="h-4 w-4"/> </Button> </div> </div>
                    <div className="space-y-1.5 text-sm"> <Label className="text-xs text-green-700/80">Metadata URI (Token URI)</Label> <div className="flex items-center gap-2"> <Input readOnly value={result.tokenURI} className="flex-grow text-xs bg-green-100/50 border-green-200 text-green-900"/> <Button type="button" size="icon" variant="ghost" onClick={() => copyToClipboard(result.tokenURI, 'Token URI Copied!')} title="Copy Token URI" className="h-8 w-8 text-green-700 hover:bg-green-100"> <Copy className="h-4 w-4"/> </Button> </div> </div>
                    <div className="space-y-1.5 text-sm pt-3 border-t border-green-200"> <Label className="text-xs font-medium text-green-800">Minter Link (Share this URL)</Label> <p className="text-xs text-green-700/90">Send this specific link to the designated minter. It pre-fills the required Token URI.</p> <div className="flex items-center gap-2"> {(() => { const mintingUrl = `${window.location.origin}/mint?tokenURI=${encodeURIComponent(result.tokenURI)}`; return (<> <Input readOnly value={mintingUrl} className="flex-grow text-xs bg-green-100/50 border-green-200 text-green-900 font-mono"/> <Button type="button" size="icon" variant="ghost" onClick={() => copyToClipboard(mintingUrl, 'Minter Link Copied!')} title="Copy Minting Link" className="h-8 w-8 text-green-700 hover:bg-green-100"> <LinkIcon className="h-4 w-4"/> </Button> </>); })()} </div> </div>
                    <div className='flex pt-2'> <Button type="button" size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-100" onClick={() => navigate('/mint')}> Go to Mint Page (Owner) <ArrowRight className="h-4 w-4 ml-1.5"/> </Button> </div>
                </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateMetadata;