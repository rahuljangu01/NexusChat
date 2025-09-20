// client/src/pages/StatusPage.jsx (CLEANED)

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Heart, Eye, Trash2, X, Plus, MoreVertical } from "lucide-react"; // Camera hata diya gaya hai
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNowStrict } from 'date-fns';

import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { getFriendsStatuses, viewStatus, likeStatus, deleteStatus } from "../utils/api";
import "./Dashboard.css";
import UploadStatusDialog from "../components/UploadStatusDialog";

const StatusPage = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [statusGroups, setStatusGroups] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setUploadOpen] = useState(false);

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const statuses = await getFriendsStatuses();
      setStatusGroups(statuses);
    } catch (error) {
      console.error("Failed to fetch statuses", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);
  
  useEffect(() => {
    if (activeGroupIndex === null) return;
    const group = statusGroups[activeGroupIndex];
    if (!group) return;
    const status = group.statuses[activeStatusIndex];
    if (!status) return;

    const hasViewed = status.viewers.some(v => v.user?._id === currentUser.id);
    if (!hasViewed && status.user._id !== currentUser.id) {
        viewStatus(status._id);
    }

    const timer = setTimeout(() => {
      if (activeStatusIndex < group.statuses.length - 1) {
        setActiveStatusIndex(prev => prev + 1);
      } else if (activeGroupIndex < statusGroups.length - 1) {
        setActiveGroupIndex(prev => prev + 1);
        setActiveStatusIndex(0);
      } else {
        setActiveGroupIndex(null);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [activeGroupIndex, activeStatusIndex, statusGroups, currentUser.id]);

  const handleLike = async (statusId) => {
    await likeStatus(statusId);
    fetchStatuses();
  };
  
  const handleDelete = async (statusId) => {
    if(window.confirm("Are you sure you want to delete this status?")) {
        await deleteStatus(statusId);
        const group = statusGroups.find(g => g.statuses.some(s => s._id === statusId));
        if (group && group.statuses.length === 1) {
            setActiveGroupIndex(null);
        }
        fetchStatuses();
    }
  };

  const myStatusGroup = statusGroups.find(g => g.user?._id === currentUser.id);
  const friendStatusGroups = statusGroups.filter(g => g.user?._id !== currentUser.id);

  if (activeGroupIndex !== null) {
    const activeGroup = statusGroups[activeGroupIndex];
    if (!activeGroup?.user) return null;
    const activeStatus = activeGroup.statuses[activeStatusIndex];
    if (!activeStatus) return null;
    const isMyStatus = activeGroup.user._id === currentUser.id;

    return (
      <AnimatePresence>
        <motion.div key={activeStatus._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-between p-4">
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">{activeGroup.statuses.map((_, index) => (<div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">{index < activeStatusIndex && <div className="h-full w-full bg-white"/>}{index === activeStatusIndex && <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 7, ease: "linear" }} className="h-full bg-white"/>}</div>))}</div>
            <header className="absolute top-8 left-4 right-4 flex items-center justify-between z-10"><div className="flex items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src={activeGroup.user.profilePhotoUrl}/><AvatarFallback>{activeGroup.user.name.charAt(0)}</AvatarFallback></Avatar><div><p className="font-semibold text-white">{activeGroup.user.name}</p><p className="text-xs text-gray-400">{formatDistanceToNowStrict(new Date(activeStatus.createdAt))} ago</p></div></div><Button variant="ghost" size="icon" onClick={() => setActiveGroupIndex(null)} className="text-white hover:bg-white/10 rounded-full"><X/></Button></header>
            <div className="max-w-md w-full aspect-[9/16] rounded-lg overflow-hidden my-auto"><img src={activeStatus.mediaUrl} alt={activeStatus.caption} className="w-full h-full object-contain"/></div>
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col items-center gap-4">
              {activeStatus.caption && <p className="text-center text-white bg-black/40 p-2 rounded-lg max-w-md">{activeStatus.caption}</p>}
              <div className="flex justify-between items-center w-full max-w-md">
                {isMyStatus ? (
                    <Dialog><DialogTrigger asChild><div className="flex items-center gap-2 bg-black/50 p-2 rounded-full cursor-pointer hover:bg-black/70"><Eye className="h-5 w-5 text-white"/><span className="text-sm font-semibold text-white">{activeStatus.viewers.length}</span></div></DialogTrigger>
                        <DialogContent className="bg-[#161b22] border-slate-700 text-white max-h-[70vh]"><DialogHeader><DialogTitle>Viewed By ({activeStatus.viewers.length})</DialogTitle></DialogHeader>
                            <div className="overflow-y-auto custom-scrollbar -mr-4 pr-4">
                                {activeStatus.viewers.length === 0 ? <p className="text-slate-400 text-center py-8">No one has seen your status yet.</p> :
                                [...activeStatus.viewers].reverse().map(view => view.user && (
                                    <div key={view.user._id} className="flex items-center justify-between p-2 rounded-lg">
                                        <div className="flex items-center gap-3"><Avatar><AvatarImage src={view.user.profilePhotoUrl} /><AvatarFallback>{view.user.name.charAt(0)}</AvatarFallback></Avatar><p className="font-semibold">{view.user.name}</p></div>
                                        <p className="text-xs text-slate-400">{formatDistanceToNowStrict(new Date(view.viewedAt))} ago</p>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                ) : ( <div className="flex items-center gap-2 bg-black/50 p-2 rounded-full"><Heart className="h-5 w-5 text-white" /><span className="text-sm font-semibold text-white">{activeStatus.likes.length}</span></div> )}
                {isMyStatus ? <Button variant="ghost" size="icon" onClick={() => handleDelete(activeStatus._id)} className="bg-black/50 rounded-full h-12 w-12"><Trash2 className="h-6 w-6 text-red-500" /></Button> : <Button variant="ghost" size="icon" onClick={() => handleLike(activeStatus._id)} className="bg-black/50 rounded-full h-12 w-12"><Heart className={`h-6 w-6 ${activeStatus.likes.includes(currentUser.id) ? "text-red-500 fill-current" : ""}`} /></Button>}
              </div>
            </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Status</h1>
      </header>
        {isLoading ? <div className="flex justify-center items-center h-full pt-20"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div> :
            <div className="space-y-6">
                <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50">
                        <div className="relative cursor-pointer" onClick={() => { if(myStatusGroup) { setActiveStatusIndex(0); setActiveGroupIndex(statusGroups.findIndex(g => g.user._id === myStatusGroup.user._id)) } else { setUploadOpen(true) }}}>
                            <Avatar className="h-12 w-12"><AvatarImage src={currentUser.profilePhotoUrl}/><AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback></Avatar>
                            {!myStatusGroup && <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-0.5 border-2 border-[#161b22]"><Plus className="h-3 w-3 text-white"/></div>}
                        </div>
                        <div className="flex-1" onClick={() => { if(myStatusGroup) { setActiveStatusIndex(0); setActiveGroupIndex(statusGroups.findIndex(g => g.user._id === myStatusGroup.user._id)) } else { setUploadOpen(true) }}}>
                            <p className="font-semibold text-white">My Status</p>
                            <p className="text-xs text-slate-400">{myStatusGroup ? `${myStatusGroup.statuses.length} updates` : "Add to your story"}</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-700"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                                <DialogTrigger asChild><DropdownMenuItem><Plus className="h-4 w-4 mr-2"/>Add to my story</DropdownMenuItem></DialogTrigger>
                                {myStatusGroup && myStatusGroup.statuses.length > 0 && (
                                    <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(myStatusGroup.statuses[0]._id)}>
                                        <Trash2 className="h-4 w-4 mr-2"/>Delete latest status
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    {isUploadOpen && <UploadStatusDialog onStatusUploaded={() => { setUploadOpen(false); fetchStatuses(); }} />}
                </Dialog>

                <div>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent Updates</h2>
                    <div className="space-y-2">
                        {friendStatusGroups.map((group, groupIndex) => group.user && (
                            <motion.div key={group.user._id} className="cursor-pointer p-2 rounded-lg hover:bg-slate-800/50" onClick={() => { setActiveStatusIndex(0); setActiveGroupIndex(statusGroups.findIndex(g => g.user._id === group.user._id)); }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIndex * 0.05 }}>
                                <div className="flex items-center gap-3">
                                    <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500">
                                      <Avatar className="h-12 w-12 border-2 border-[#161b22]"><AvatarImage src={group.user.profilePhotoUrl}/><AvatarFallback>{group.user.name.charAt(0)}</AvatarFallback></Avatar>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white">{group.user.name}</p>
                                      <p className="text-xs text-slate-400">{group.statuses.length} new updates</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {friendStatusGroups.length === 0 && <div className="text-center py-16"><p className="text-slate-500">No recent updates from your friends.</p></div>}
                    </div>
                </div>
            </div>}
    </div>
  );
};

export default StatusPage;