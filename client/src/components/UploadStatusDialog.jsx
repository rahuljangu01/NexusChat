// client/src/components/UploadStatusDialog.jsx (FINAL ROBUST CAMERA)

import { useState, useRef, useEffect } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog"; // Import Dialog and DialogClose
import { Camera, Send, Crop, Maximize, X } from "lucide-react"; // Import X icon
import { uploadFileToCloudinary, createStatus } from "../utils/api";

// Helper function to convert a data URL (from the camera) to a File object
function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
        
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, {type:mime});
}

function getCroppedImg(image, crop, fileName) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );

  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      blob.name = fileName;
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

// <<< --- NEW, SEPARATE COMPONENT FOR THE CAMERA VIEW --- >>>
const CameraView = ({ onPictureTaken, onExit }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const takePicture = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        const capturedFile = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`);
        onPictureTaken(capturedFile);
    };

    useEffect(() => {
        // This function runs when the component mounts
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Add an event listener to know when the video has started playing
                    videoRef.current.onplaying = () => {
                        setIsCameraReady(true);
                    };
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    alert("Camera access was denied. Please allow camera permissions in your browser settings.");
                } else {
                    alert("Could not access the camera. Please check if it is being used by another application.");
                }
                onExit(); // Close the camera view on error
            }
        };

        startCamera();

        // This is the cleanup function that runs when the component unmounts
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onExit]);

    return (
        <div className="relative w-full h-full bg-black">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"></video>
            
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70" onClick={onExit}>
                    <X />
                </Button>
            </DialogClose>
            
            {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            )}

            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <Button onClick={takePicture} size="icon" className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-200 border-4 border-black/30" disabled={!isCameraReady}>
                    <Camera className="h-8 w-8" />
                </Button>
            </div>
        </div>
    );
};


const UploadStatusDialog = ({ onStatusUploaded }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [aspect, setAspect] = useState(undefined);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const handlePictureTaken = (capturedFile) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => setPreview(reader.result.toString() || ''));
        reader.readAsDataURL(capturedFile);
        setFile(capturedFile);
        setIsCameraOpen(false); // Close camera and show crop view
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setCrop(undefined);
            setAspect(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setPreview(reader.result.toString() || ''));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    function onImageLoad(e) {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        const fullCrop = { unit: '%', width: 100, height: 100, x: 0, y: 0 };
        setCrop(fullCrop);
        setCompletedCrop(makeAspectCrop(fullCrop, width / height, width, height));
    }

    const toggleAspectRatio = () => {
        if (aspect) {
            setAspect(undefined);
            onImageLoad({ currentTarget: imgRef.current });
        } else {
            setAspect(9 / 16);
            const { width, height } = imgRef.current;
            const newCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 9 / 16, width, height), width, height);
            setCrop(newCrop);
            setCompletedCrop(newCrop);
        }
    };

    const handleUpload = async () => {
        if (!completedCrop || !imgRef.current || !file) {
            alert("Please select and crop the image first.");
            return;
        }
        setIsUploading(true);
        try {
            const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop, file.name);
            const uploadedFile = await uploadFileToCloudinary(croppedImageBlob);
            await createStatus({
                mediaUrl: uploadedFile.url,
                mediaType: "image",
                caption: caption
            });
            onStatusUploaded();
        } catch (error) {
            console.error("Status upload failed:", error);
            alert("Failed to upload status.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent 
                className={isCameraOpen 
                    ? "bg-black w-full h-full max-w-full max-h-screen sm:max-w-md sm:max-h-[90vh] p-0 border-0" 
                    : "bg-[#161b22] border-slate-700 text-white max-w-md"
                }
            >
                {isCameraOpen ? (
                    <CameraView onPictureTaken={handlePictureTaken} onExit={() => setIsCameraOpen(false)} />
                ) : (
                    <>
                        <DialogHeader><DialogTitle>Create a new Status</DialogTitle></DialogHeader>
                        <div className="py-4">
                            {preview ? (
                                <div className="flex flex-col items-center">
                                    <ReactCrop
                                        crop={crop}
                                        onChange={c => setCrop(c)}
                                        onComplete={c => setCompletedCrop(c)}
                                        aspect={aspect}
                                        minHeight={100}
                                    >
                                        <img ref={imgRef} src={preview} alt="Status preview" onLoad={onImageLoad} style={{ maxHeight: '60vh' }} />
                                    </ReactCrop>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-lg">
                                    <div onClick={() => fileInputRef.current.click()} className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-500"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                        <p className="mt-2 text-sm text-slate-500">Select from Gallery</p>
                                    </div>
                                    <div className="w-full border-t border-dashed border-slate-600"></div>
                                    <div onClick={() => setIsCameraOpen(true)} className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50">
                                        <Camera className="h-12 w-12 text-slate-500" />
                                        <p className="mt-2 text-sm text-slate-500">Take a Photo</p>
                                    </div>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        {preview &&
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={toggleAspectRatio} className="bg-slate-800 border-slate-700">
                                    {aspect ? <Maximize className="h-4 w-4" /> : <Crop className="h-4 w-4" />}
                                </Button>
                                <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." className="bg-slate-800 border-slate-600" maxLength={100} />
                                <Button onClick={handleUpload} disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-500">
                                    {isUploading ? "Uploading..." : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        }
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UploadStatusDialog;