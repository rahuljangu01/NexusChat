// client/src/components/InfoPanel.jsx (CLEANED)

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
// ImageIcon ko neeche waali line se hata do
import { X, UserX, Mail, Briefcase, GraduationCap, FileText, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getSharedMedia } from "../utils/api";

const InfoPanel = ({ user, isOpen, onClose, onRemoveConnection }) => {
  const [sharedMedia, setSharedMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  useEffect(() => {
    if (isOpen && user?._id) {
      const fetchMedia = async () => {
        try {
          setLoadingMedia(true);
          const media = await getSharedMedia(user._id);
          setSharedMedia(media);
        } catch (error) {
          console.error("Failed to fetch shared media", error);
        } finally {
          setLoadingMedia(false);
        }
      };
      fetchMedia();
    }
  }, [isOpen, user?._id]);

  if (!isOpen) return null;

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full md:w-[350px] bg-[#161b22] flex flex-col border-l border-slate-800 z-30 absolute top-0 right-0 h-full"
    >
      <header className="flex items-center p-4 h-20 border-b border-slate-800">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold text-white ml-4">Contact Info</h3>
      </header>
      
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-4 border-indigo-500/50">
            <AvatarImage src={user.profilePhotoUrl} />
            <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <p className="text-sm text-indigo-400">{user.isOnline ? 'Online' : 'Offline'}</p>
        </div>

        <div className="border-t border-slate-800 my-6"></div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-4">
            <Mail className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <span className="text-slate-300 break-all">{user.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <GraduationCap className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <span className="text-slate-300">College ID: {user.collegeId}</span>
          </div>
          <div className="flex items-center gap-4">
            <Briefcase className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <span className="text-slate-300">{user.department}</span>
          </div>
        </div>
        
        <div className="border-t border-slate-800 my-6"></div>
        <h4 className="text-sm uppercase font-semibold text-slate-500 mb-3">Shared Media</h4>
        {loadingMedia ? (
            <div className="flex justify-center items-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            </div>
        ) : sharedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
                {sharedMedia.slice(0, 6).map((media, index) => (
                    <a key={index} href={media.content} target="_blank" rel="noopener noreferrer" className="relative aspect-square bg-slate-800 rounded-md overflow-hidden group">
                        {media.messageType === 'image' ? (
                            <img src={media.content} alt="Shared" className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                                <FileText className="h-8 w-8 text-slate-400"/>
                                <p className="text-xs text-slate-500 mt-1 truncate">{media.fileName}</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Download className="h-6 w-6 text-white"/>
                        </div>
                    </a>
                ))}
            </div>
        ) : (
            <p className="text-sm text-slate-500 text-center">No media shared yet.</p>
        )}
        
        <div className="border-t border-slate-800 my-6"></div>
        
        <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={onRemoveConnection}>
          <UserX className="h-4 w-4 mr-2" />
          Remove Connection
        </Button>
      </div>
    </motion.aside>
  );
};

export default InfoPanel;