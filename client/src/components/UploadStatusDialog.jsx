// client/src/components/UploadStatusDialog.jsx (IMPROVED CROPPING)

import { useState, useRef } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Camera, Send, Crop, Maximize } from "lucide-react"; // Maximize icon add kiya
import { uploadProfilePhoto, createStatus } from "../utils/api";

// Helper function (ismein koi change nahi)
function getCroppedImg(image, crop, fileName) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      blob.name = fileName;
      resolve(blob);
    }, 'image/jpeg');
  });
}

const UploadStatusDialog = ({ onStatusUploaded }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);

    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [aspect, setAspect] = useState(undefined); // <<< BADLAAV YAHAN HAI

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setCrop(undefined);
            setAspect(undefined); // Aspect ratio ko reset karo
            const reader = new FileReader();
            reader.addEventListener('load', () => setPreview(reader.result.toString() || ''));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    function onImageLoad(e) {
        imgRef.current = e.currentTarget;
        const { width, height } = e.currentTarget;
        // Default crop poori image ko select karega
        const fullCrop = { unit: '%', width: 100, height: 100, x: 0, y: 0 };
        setCrop(fullCrop);
        setCompletedCrop(makeAspectCrop(fullCrop, width/height, width, height));
    }
    
    // Naya function jo aspect ratio ko toggle karega
    const toggleAspectRatio = () => {
        if (aspect) {
            setAspect(undefined); // Free crop
            onImageLoad({ currentTarget: imgRef.current }); // Reset to full image crop
        } else {
            setAspect(9 / 16); // Fixed 9:16 crop
            const { width, height } = imgRef.current;
            const newCrop = centerCrop(
                makeAspectCrop({ unit: '%', width: 90 }, 9 / 16, width, height),
                width, height
            );
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
            const uploadedFile = await uploadProfilePhoto(croppedImageBlob);
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
        <DialogContent className="bg-[#161b22] border-slate-700 text-white max-w-md">
            <DialogHeader><DialogTitle>Create a new Status</DialogTitle></DialogHeader>
            <div className="py-4">
                {preview ? (
                    <div className="flex flex-col items-center">
                        <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            onComplete={c => setCompletedCrop(c)}
                            aspect={aspect} // <<< BADLAAV YAHAN HAI
                            minHeight={100}
                        >
                            <img ref={imgRef} src={preview} alt="Status preview" onLoad={onImageLoad} style={{ maxHeight: '60vh' }}/>
                        </ReactCrop>
                    </div>
                ) : (
                    <div onClick={() => fileInputRef.current.click()} className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-800/50">
                        <Camera className="h-12 w-12 text-slate-500" />
                        <p className="mt-2 text-sm text-slate-500">Click to select an image</p>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            {preview && 
                <div className="flex items-center gap-2">
                    {/* <<< YEH NAYA BUTTON ADD KIYA GAYA HAI >>> */}
                    <Button variant="outline" size="icon" onClick={toggleAspectRatio} className="bg-slate-800 border-slate-700">
                        {aspect ? <Maximize className="h-4 w-4" /> : <Crop className="h-4 w-4" />}
                    </Button>
                    <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." className="bg-slate-800 border-slate-600" maxLength={100} />
                    <Button onClick={handleUpload} disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-500">
                        {isUploading ? "Uploading..." : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            }
        </DialogContent>
    );
};

export default UploadStatusDialog;