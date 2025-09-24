// client/src/pages/ChatPage.jsx (FINAL & GUARANTEED CALLING FIX - NO CODE REMOVED)

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, Send, Paperclip, MoreVertical, Video, Phone, UserX, Smile, PhoneIncoming, PhoneOutgoing, PhoneMissed, Check, CheckCheck, Pin, Trash2, Forward, X as CloseIcon, Search, Wallpaper, ImagePlus } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { format, isSameDay } from 'date-fns';
import Peer from 'simple-peer';
import EmojiPicker from 'emoji-picker-react';
import CallingUI from "../components/CallingUI";
import InfoPanel from "../components/InfoPanel";
import { socketService } from "../services/socketService";
import "./ChatPage.css";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { getMessages, addMessage, updateMessage, updateSingleMessageInChat } from "../store/slices/chatSlice";
import { setChatWallpaper, fetchConnections, clearUnreadCount } from "../store/slices/connectionsSlice";
import { uploadFileToCloudinary, removeConnection, logCall, togglePinMessage, deleteMultipleMessages, forwardMessage, updateWallpaper, toggleMessageReaction } from "../utils/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

const peerOptions = { 
    trickle: false, 
    config: { 
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }, 
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ]
    }
};
const wallpapers = [{ name: 'Default', url: '' }, { name: 'Doodle', url: '/wallpapers/doodle.png' }, { name: 'Nature', url: '/wallpapers/nature.jpg' }, { name: 'Dark Space', url: '/wallpapers/dark-space.jpg' }, { name: 'Abstract', url: '/wallpapers/abstract.jpg' }];

const WallpaperDialog = ({ open, onOpenChange, connectionId, currentWallpaper, onWallpaperChange }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSelectWallpaper = async (url) => {
        try {
            await updateWallpaper(connectionId, url);
            onWallpaperChange(url);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to set wallpaper", error);
            alert("Could not change wallpaper.");
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const uploadedFile = await uploadFileToCloudinary(file);
            await handleSelectWallpaper(uploadedFile.url);
        } catch (error) {
            alert("Failed to upload wallpaper.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle>Change Chat Wallpaper</DialogTitle>
                    <DialogDescription>Select a new background for this chat.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="relative group aspect-[9/16] flex flex-col items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 cursor-pointer transition-colors" onClick={() => fileInputRef.current.click()}>
                        {isUploading ? (<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>) : (<><ImagePlus className="h-8 w-8 text-slate-400 group-hover:text-indigo-400" /><p className="text-xs text-center mt-2 text-slate-400">From Gallery</p></>)}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                    {wallpapers.map((wallpaper) => (
                        <div key={wallpaper.name} className="relative group aspect-[9/16] cursor-pointer" onClick={() => handleSelectWallpaper(wallpaper.url)}>
                            {wallpaper.url === '' ? (<div className="w-full h-full rounded-lg bg-[#0d1117] flex items-center justify-center p-2 border border-slate-700"><p className="text-xs text-center text-slate-400">Default Pattern</p></div>) : (<img src={wallpaper.url} alt={wallpaper.name} className="object-cover w-full h-full rounded-lg" />)}
                            <div className={`absolute inset-0 rounded-lg transition-all ${currentWallpaper === wallpaper.url ? 'border-4 border-indigo-500 ring-2 ring-indigo-500/50' : 'group-hover:ring-4 group-hover:ring-white/50'}`}/>
                            <p className="absolute bottom-0 left-0 right-0 py-1 text-center text-xs bg-black/50 text-white">{wallpaper.name}</p>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const MessageStatus = ({ status }) => {
  if (status === 'read') return <CheckCheck className="ml-1 h-3 w-3 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="ml-1 h-3 w-3 text-slate-400" />;
  return <Check className="ml-1 h-3 w-3 text-slate-400" />;
};

const ForwardDialog = ({ connections, onForward, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const filteredConnections = connections.filter(conn => {
        const otherUser = conn.users.find(u => u._id !== currentUser.id);
        return otherUser && otherUser.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
                <DialogTitle>Forward To...</DialogTitle>
                <DialogDescription>Select a contact to forward the message(s).</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Search connections..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-slate-800 border-slate-600" /></div>
                <div className="max-h-[50vh] overflow-y-auto space-y-2 custom-scrollbar -mr-4 pr-4">
                    {filteredConnections.length > 0 ? filteredConnections.map(conn => {
                        const otherUser = conn.users.find(u => u._id !== currentUser.id);
                        if (!otherUser) return null;
                        return (<div key={otherUser._id} onClick={() => onForward(otherUser._id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer"><Avatar className="h-10 w-10"><AvatarImage src={otherUser.profilePhotoUrl} /><AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback></Avatar><span>{otherUser.name}</span></div>)
                    }) : <p className="text-center text-slate-500 py-4">No connections found.</p>}
                </div>
            </div>
        </DialogContent>
    );
};

const ReactionPicker = ({ onSelect }) => {
    const popularEmojis = ['👍', '❤️', '😂', '😯', '😢', '🙏'];
    return (
        <motion.div 
            initial={{ scale: 0.5, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute -top-10 z-20 bg-slate-800 border border-slate-700 rounded-full flex items-center p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
        >
            {popularEmojis.map(emoji => (
                <button key={emoji} onClick={() => onSelect(emoji)} className="text-xl p-1 rounded-full hover:bg-slate-700 transition-colors">
                    {emoji}
                </button>
            ))}
        </motion.div>
    );
};

const ChatPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const { connections } = useSelector((state) => state.connections);
    const { user: currentUser } = useSelector((state) => state.auth);
    const { messages: allMessages, loading: messagesLoading } = useSelector((state) => state.chat);
    
    const activeChatMessages = useMemo(() => allMessages[userId] || [], [allMessages, userId]);
    
    const chatUserConnection = connections.find(c => c.users.some(u => u._id === userId));
    const chatUser = chatUserConnection?.users.find(u => u._id === userId);

    const [isTyping, setIsTyping] = useState(false);
    const [message, setMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isInfoPanelOpen, setInfoPanelOpen] = useState(false);
    const [isWallpaperDialogOpen, setIsWallpaperDialogOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [pinnedMessage, setPinnedMessage] = useState(null);
    const [isForwarding, setIsForwarding] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [reactingToMessageId, setReactingToMessageId] = useState(null);
    
    const [callState, setCallState] = useState('idle');
    const [callType, setCallType] = useState('video');
    const [stream, setStream] = useState(null);
    const [caller, setCaller] = useState({});
    const [callerSignal, setCallerSignal] = useState();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const fileInputRef = useRef(null);
    const myVideo = useRef(null);
    const userVideo = useRef(null);
    const connectionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const currentWallpaper = chatUserConnection?.chatWallpaper || '';

    useEffect(() => {
        if (currentUser && userId) {
            dispatch(getMessages(userId));
            socketService.emit('mark-messages-read', { chatUserId: userId });
            dispatch(clearUnreadCount({ chatId: userId }));
        }
    }, [userId, currentUser, dispatch]);

    const leaveCall = useCallback(async (logIt = true) => {
        setCallState(currentCallState => {
            if (logIt && currentCallState !== 'idle') {
                let status = 'rejected';
                if (currentCallState === 'active') status = 'answered';
                else if (currentCallState === 'calling') status = 'missed';
                
                const receiverForLog = currentCallState === 'calling' ? userId : (caller.id || null);
                if (receiverForLog) { 
                    logCall({ receiverId: receiverForLog, status, duration: callDuration });
                    dispatch(getMessages(userId));
                }
            }
    
            const otherUserId = currentCallState === 'calling' ? userId : caller.id;
            if (otherUserId) { socketService.emit('hang-up', { to: otherUserId }); }
    
            if (stream) { stream.getTracks().forEach(track => track.stop()); }
            if (connectionRef.current) { connectionRef.current.destroy(); connectionRef.current = null; }
            
            clearInterval(durationIntervalRef.current);
            setCaller({}); setCallerSignal(null); setCallDuration(0); setStream(null);
            
            return 'idle';
        });
    }, [userId, caller.id, stream, callDuration, dispatch]);
    
    useEffect(() => {
        const handleCallMade = ({ signal, from, type }) => {
            setCallState(cs => (cs !== 'idle' ? cs : (setCaller(from), setCallerSignal(signal), setCallType(type), 'incoming')));
        };
        const handleCallAccepted = (signal) => {
            if (connectionRef.current) {
                setCallState('active');
                durationIntervalRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
                connectionRef.current.signal(signal);
            }
        };
        const handleCallEnded = () => leaveCall(false);
        if (socketService.socket) {
            socketService.on("call-made", handleCallMade);
            socketService.on("call-accepted", handleCallAccepted);
            socketService.on("call-ended", handleCallEnded);
        }
        return () => {
            if (socketService.socket) {
                socketService.off("call-made", handleCallMade);
                socketService.off("call-accepted", handleCallAccepted);
                socketService.off("call-ended", handleCallEnded);
            }
        };
    }, [leaveCall]);

    const callUser = (type) => {
        navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true })
            .then(stream => {
                setStream(stream); if (myVideo.current) myVideo.current.srcObject = stream;
                const peer = new Peer({ initiator: true, stream, ...peerOptions });
                connectionRef.current = peer;
                setCallState('calling'); setCallType(type);
                peer.on('signal', data => { socketService.emit('call-user', { userToCall: userId, signalData: data, from: { id: currentUser.id, name: currentUser.name, profilePhotoUrl: currentUser.profilePhotoUrl }, type }); });
                peer.on('stream', remoteStream => { if (userVideo.current) userVideo.current.srcObject = remoteStream; });
                peer.on('error', (err) => { console.error(err); leaveCall(false); });
            })
            .catch(err => console.error("getUserMedia FAILED!", err));
    };

    const answerCall = () => {
        navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true })
            .then(stream => {
                setStream(stream); if (myVideo.current) myVideo.current.srcObject = stream;
                const peer = new Peer({ initiator: false, stream, ...peerOptions });
                connectionRef.current = peer;
                peer.on('signal', data => { socketService.emit('answer-call', { signal: data, to: caller.id }); });
                peer.on('stream', remoteStream => { if(userVideo.current) userVideo.current.srcObject = remoteStream; });
                peer.on('error', (err) => { console.error(err); leaveCall(false); });
                peer.signal(callerSignal);
                setCallState('active');
                durationIntervalRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
            })
            .catch(err => console.error("getUserMedia error:", err));
    };
    
    const toggleMute = () => { if (stream?.getAudioTracks().length > 0) { stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled; setIsMuted(p => !p); } };
    const toggleVideo = () => { if (stream?.getVideoTracks().length > 0) { stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled; setIsVideoOff(p => !p); } };
    useEffect(() => { setPinnedMessage(activeChatMessages.find(msg => msg.isPinned) || null); }, [activeChatMessages]);
    const handleMessageLongPress = (id) => { setSelectionMode(true); setSelectedMessages(new Set([id])); };
    const handleMessageClick = (id) => {
        if (!selectionMode) return;
        const newSelected = new Set(selectedMessages);
        newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
        if (newSelected.size === 0) setSelectionMode(false);
        setSelectedMessages(newSelected);
    };
    const clearSelection = () => { setSelectionMode(false); setSelectedMessages(new Set()); };
    const handleDeleteSelected = async () => { if (window.confirm(`Delete ${selectedMessages.size} message(s)?`)) { try { await deleteMultipleMessages(Array.from(selectedMessages)); dispatch(getMessages(userId)); clearSelection(); } catch (e) { alert("Failed to delete."); } } };
    const handlePinSelected = async () => { try { await togglePinMessage(selectedMessages.values().next().value); dispatch(getMessages(userId)); clearSelection(); } catch (e) { alert("Failed to pin."); } };
    const handleForwardSelected = async (toId) => { try { for (const id of selectedMessages) { await forwardMessage(id, toId); } alert(`Forwarded!`); clearSelection(); setIsForwarding(false); } catch (e) { alert("Failed to forward."); } };
    const handleTyping = () => { socketService.emit("typing", { receiverId: userId }); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => { socketService.emit("stop-typing", { receiverId: userId }); }, 2000); };
    useEffect(() => {
        if (currentUser && userId) {
            const onTyping = ({ userId: u }) => { if (u === userId) setIsTyping(true); };
            const onStopTyping = ({ userId: u }) => { if (u === userId) setIsTyping(false); };
            socketService.joinChat(userId);
            socketService.onUserTyping(onTyping);
            socketService.onUserStopTyping(onStopTyping);
            return () => { socketService.leaveChat(userId); socketService.off("user-typing", onTyping); socketService.off("user-stop-typing", onStopTyping); };
        }
    }, [userId, currentUser]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeChatMessages]);
    const handleEmojiClick = (emoji) => setMessage(p => p + emoji.emoji);
    
    const handleReaction = async (messageId, emoji) => {
        try {
            const currentMessages = allMessages[userId] || [];
            const msgIndex = currentMessages.findIndex(m => m._id === messageId);
            if (msgIndex === -1) return;
            const updatedMsg = { ...currentMessages[msgIndex], reactions: [...(currentMessages[msgIndex].reactions || [])] };
            const reactionIndex = updatedMsg.reactions.findIndex(r => r.user?._id === currentUser.id || r.user === currentUser.id);
            if (reactionIndex > -1) {
                if (updatedMsg.reactions[reactionIndex].emoji === emoji) { updatedMsg.reactions.splice(reactionIndex, 1); } 
                else { updatedMsg.reactions[reactionIndex].emoji = emoji; }
            } else { updatedMsg.reactions.push({ emoji, user: { _id: currentUser.id, name: currentUser.name } }); }
            dispatch(updateSingleMessageInChat({ chatId: userId, updatedMessage: updatedMsg }));
            await toggleMessageReaction(messageId, emoji);
        } catch (e) { console.error("Reaction failed", e); dispatch(getMessages(userId)); } 
        finally { setReactingToMessageId(null); }
    };
    
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !currentUser) return;
        const tempId = Date.now().toString();
        const optimisticMsg = {
            _id: tempId, sender: { _id: currentUser.id, name: currentUser.name, profilePhotoUrl: currentUser.profilePhotoUrl },
            receiver: { _id: userId }, content: message.trim(), messageType: 'text', createdAt: new Date().toISOString(),
            status: 'sent', _type: 'message', reactions: [], replyTo: replyingTo ? { ...replyingTo, sender: { name: replyingTo.sender.name } } : null
        };
        dispatch(addMessage({ chatId: userId, message: optimisticMsg }));
        const msgToSend = message.trim(); const replyId = replyingTo?._id;
        setMessage(""); setShowEmojiPicker(false); setReplyingTo(null);
        try {
            socketService.emit('send-message', { receiverId: userId, content: msgToSend, tempId, replyToMessageId: replyId }, (ack) => {
                if (ack.message) { dispatch(updateMessage({ chatId: userId, tempId, finalMessage: ack.message })); dispatch(fetchConnections()); }
            });
        } catch (e) { console.error("Send message failed:", e); }
    };
    
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const uploadedFile = await uploadFileToCloudinary(file);
            const tempId = Date.now().toString();
            const messageType = file.type.startsWith("image") ? 'image' : 'file';
            dispatch(addMessage({ chatId: userId, message: {
                _id: tempId, sender: { _id: currentUser.id }, receiver: { _id: userId }, content: uploadedFile.url,
                messageType, fileName: file.name, fileSize: file.size, createdAt: new Date().toISOString(), status: 'sent', _type: 'message',
            }}));
            socketService.emit('send-message', { receiverId: userId, content: uploadedFile.url, messageType, fileName: file.name, fileSize: file.size, tempId }, (ack) => {
                if (ack.message) { dispatch(updateMessage({ chatId: userId, tempId, finalMessage: ack.message })); dispatch(fetchConnections()); }
            });
        } catch (e) { alert("File upload failed."); } 
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    
    const handleRemoveConnection = async () => { if(chatUserConnection && window.confirm(`Remove ${chatUser.name}?`)){ try { await removeConnection(chatUserConnection._id); navigate('/dashboard'); } catch(e) { alert("Failed to remove."); } } };
    const formatTime = (dateString) => format(new Date(dateString), 'p');

    const MessageBubble = ({ item, isSender, isFirstInGroup, isLastInGroup }) => {
        const controls = useAnimation();
        const handleDragEnd = (_, info) => {
            if ((info.offset.x > 70 && !isSender) || (info.offset.x < -70 && isSender)) setReplyingTo(item);
            controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
        };

        const getBubbleClasses = () => {
            let classes = 'message-bubble relative max-w-[80%] md:max-w-[70%] shadow-md ';
            if (isSender) {
                classes += 'bg-indigo-600 ';
                if (isFirstInGroup && isLastInGroup) classes += 'rounded-xl sent';
                else if (isFirstInGroup) classes += 'rounded-t-xl rounded-bl-xl';
                else if (isLastInGroup) classes += 'rounded-b-xl rounded-tl-xl sent';
                else classes += 'rounded-l-xl rounded-r-md';
            } else {
                classes += 'bg-slate-700 ';
                if (isFirstInGroup && isLastInGroup) classes += 'rounded-xl received';
                else if (isFirstInGroup) classes += 'rounded-t-xl rounded-br-xl';
                else if (isLastInGroup) classes += 'rounded-b-xl rounded-tr-xl received';
                else classes += 'rounded-r-xl rounded-l-md';
            }
            return classes;
        };
        
        return (
             <motion.div
                layout animate={controls} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd} dragElastic={0.2}
                onContextMenu={(e) => { e.preventDefault(); handleMessageLongPress(item._id); }} onClick={() => handleMessageClick(item._id)}
                className={`relative group flex items-end gap-2 ${isFirstInGroup ? 'mt-2' : 'mt-0.5'} ${isSender ? "justify-end" : "justify-start"} ${selectedMessages.has(item._id) ? 'bg-indigo-500/20 rounded-lg' : ''}`}
            >
                {!isSender && <div className="w-8 flex-shrink-0">{isLastInGroup && <Avatar className="h-8 w-8"><AvatarImage src={chatUser?.profilePhotoUrl}/><AvatarFallback className="text-xs">{chatUser?.name?.charAt(0)}</AvatarFallback></Avatar>}</div>}
                <div className={`absolute z-20 ${isSender ? 'left-0' : 'right-0'}`}>{reactingToMessageId === item._id && <ReactionPicker onSelect={(e) => handleReaction(item._id, e)} />}</div>
                <div className="flex flex-col min-w-0">
                    <div className={getBubbleClasses()}>
                        {item.replyTo && (<div className="p-2 mx-1.5 mt-1.5 border-l-2 border-indigo-300 bg-black/20 rounded-md cursor-pointer"><p className="font-bold text-xs text-indigo-300">{item.replyTo.sender.name}</p><p className="text-xs text-slate-300/80 truncate">{item.replyTo.messageType === 'image' ? '📷 Photo' : item.replyTo.content}</p></div>)}
                        {item.messageType === 'image' ? (
                            <a href={item.content} target="_blank" rel="noopener noreferrer" className="block relative m-1.5">
                                <img src={item.content} alt="Sent" className="max-w-[250px] md:max-w-[300px] h-auto rounded-lg" />
                                <span className="absolute bottom-1.5 right-1.5 text-[11px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded-full flex items-center">{formatTime(item.createdAt)}{isSender && <MessageStatus status={item.status} />}</span>
                            </a>
                        ) : item.messageType === 'file' ? (
                            <div className="p-1">
                                <a href={item.content} target="_blank" rel="noopener noreferrer" download={item.fileName || 'file'} className="flex items-center gap-2 p-2 text-white hover:underline">
                                    <Paperclip className="h-8 w-8 flex-shrink-0 text-slate-300" /><div className="overflow-hidden"><p className="font-semibold truncate text-sm">{item.fileName || 'File'}</p><p className="text-xs text-slate-300">{item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : ''}</p></div>
                                </a>
                                <div className="flex justify-end pb-1 pr-2"><span className="text-[11px] text-white/70 flex items-center">{formatTime(item.createdAt)}{isSender && <MessageStatus status={item.status} />}</span></div>
                            </div>
                        ) : (
                            <div className="px-3 py-2"><p className="text-sm text-white whitespace-pre-wrap break-words">{item.content}</p><div className="float-right clear-both h-4" /><div className="absolute bottom-1.5 right-2.5"><span className="text-[11px] text-white/70 flex items-center">{formatTime(item.createdAt)}{isSender && <MessageStatus status={item.status} />}</span></div></div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setReactingToMessageId(p => p === item._id ? null : item._id); }} className={`absolute -top-3 ${isSender ? 'left-1' : 'right-1'} p-1 rounded-full bg-slate-800 border opacity-0 group-hover:opacity-100`}><Smile className="h-4 w-4 text-slate-300"/></button>
                    </div>
                    {item.reactions?.length > 0 && (
                        <div className={`flex gap-1 mt-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(item.reactions.reduce((acc, r) => ({...acc, [r.emoji]: { count: (acc[r.emoji]?.count || 0) + 1, users: [...(acc[r.emoji]?.users || []), r.user] } }), {})).map(([emoji, data]) => (
                               <TooltipProvider key={emoji}><Tooltip><TooltipTrigger><div className="bg-slate-700/50 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 cursor-pointer" onClick={() => handleReaction(item._id, emoji)}><span>{emoji}</span>{data.count > 1 && <span className="font-semibold">{data.count}</span>}</div></TooltipTrigger><TooltipContent className="bg-slate-800 text-white"><p>{data.users.map(u => u?.name).filter(Boolean).join(', ')}</p></TooltipContent></Tooltip></TooltipProvider>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    if (!currentUser || !chatUser) { return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>; }

    return (
        <div className="h-full w-full flex flex-col bg-[#0d1117]">
            <AnimatePresence>{callState !== 'idle' && ( <CallingUI {...{callState, callType, user: callState === 'incoming' ? caller : chatUser, myVideo, userVideo, isMuted, isVideoOff, callDuration, leaveCall, answerCall, toggleMute, toggleVideo}}/> )}</AnimatePresence>
            <Dialog open={isForwarding} onOpenChange={setIsForwarding}><ForwardDialog connections={connections} currentUser={currentUser} onForward={handleForwardSelected} /></Dialog>
            <WallpaperDialog open={isWallpaperDialogOpen} onOpenChange={setIsWallpaperDialogOpen} connectionId={chatUserConnection?._id} currentWallpaper={currentWallpaper} onWallpaperChange={(url) => dispatch(setChatWallpaper({ connectionId: chatUserConnection._id, wallpaperUrl: url }))}/>
            
            <header className="flex-shrink-0 flex items-center px-2 py-1 h-14 border-b border-slate-800 bg-slate-900/70 backdrop-blur-lg z-20">
                {selectionMode ? (
                    <div className="flex items-center justify-between w-full">
                        <Button variant="ghost" size="icon" onClick={clearSelection}><CloseIcon className="h-5 w-5" /></Button>
                        <span className="font-semibold text-lg">{selectedMessages.size} selected</span>
                        <div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={handleDeleteSelected}><Trash2 className="h-5 w-5" /></Button>{selectedMessages.size === 1 && <Button variant="ghost" size="icon" onClick={handlePinSelected}><Pin className="h-5 w-5" /></Button>}<Button variant="ghost" size="icon" onClick={() => setIsForwarding(true)}><Forward className="h-5 w-5" /></Button></div>
                    </div>
                ) : (
                    <>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 md:hidden" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5"/></Button>
                        <div className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden" onClick={() => setInfoPanelOpen(true)}>
                            <Avatar className="h-9 w-9"><AvatarImage src={chatUser.profilePhotoUrl}/><AvatarFallback className="text-sm">{chatUser.name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="flex-1 overflow-hidden"><h2 className="font-bold text-sm text-white truncate">{chatUser.name}</h2><p className="text-xs text-indigo-400 h-4">{isTyping ? 'typing...' : (chatUser.isOnline ? 'Online' : 'Offline')}</p></div>
                        </div>
                        <div className="ml-auto flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => callUser('video')} className="h-9 w-9 text-gray-400"><Video className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => callUser('audio')} className="h-9 w-9 text-gray-400"><Phone className="h-4 w-4"/></Button>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                                    <DropdownMenuItem onClick={() => setInfoPanelOpen(true)}>View Info</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsWallpaperDialogOpen(true)}><Wallpaper className="mr-2 h-4 w-4" />Change Wallpaper</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700"/>
                                    <DropdownMenuItem className="text-red-500" onClick={handleRemoveConnection}><UserX className="mr-2 h-4 w-4"/>Remove Connection</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                )}
            </header>
            
            <div className="flex-1 relative overflow-hidden min-h-0">
                {pinnedMessage && !selectionMode && (<motion.div initial={{y: -50}} animate={{y: 0}} className="absolute top-0 left-0 right-0 p-2 bg-slate-800/80 backdrop-blur-sm flex items-center gap-2 text-sm z-20"><Pin className="h-4 w-4 text-indigo-400 flex-shrink-0" /><p className="truncate flex-1">{pinnedMessage.content}</p><Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await togglePinMessage(pinnedMessage._id); dispatch(getMessages(userId)); }}><CloseIcon className="h-4 w-4" /></Button></motion.div>)}
                <div className="absolute inset-0 z-0">{currentWallpaper ? (<div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${currentWallpaper})` }}><div className="w-full h-full bg-black/50"></div></div>) : (<div className="static-pattern-background"></div>)}</div>
                <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
                    <div className="p-2 flex flex-col">
                        {messagesLoading && activeChatMessages.length === 0 ? (
                            <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div></div>
                        ) : activeChatMessages.map((item, index) => {
                            if (!item || !item._type) return null;
                            const showDateHeader = index === 0 || !isSameDay(new Date(activeChatMessages[index - 1].createdAt), new Date(item.createdAt));
                            if (item._type === 'call') {
                                const isOutgoing = item.caller._id === currentUser.id; const callTime = format(new Date(item.createdAt), 'p');
                                let Icon = PhoneIncoming; let text = 'Incoming';
                                if (isOutgoing) { Icon = PhoneOutgoing; text = 'Outgoing'; }
                                if (item.status === 'missed' || item.status === 'rejected') { Icon = PhoneMissed; text = 'Missed'; }
                                return (<div key={item._id || index}>{showDateHeader && (<div className="text-center text-xs text-slate-500 my-4 bg-slate-800/50 self-center px-3 py-1 rounded-full">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</div>)}<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center my-3"><div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg"><Icon className={`h-4 w-4 ${item.status === 'missed' || item.status === 'rejected' ? 'text-red-400' : ''}`} /><span>{text} call</span><span>•</span><span>{callTime}</span></div></motion.div></div>);
                            }
                            const isSender = item.sender?._id === currentUser.id;
                            
                            const prevMessage = activeChatMessages[index - 1];
                            const nextMessage = activeChatMessages[index + 1];
                            const isFirstInGroup = !prevMessage || prevMessage.sender?._id !== item.sender?._id || !isSameDay(new Date(prevMessage.createdAt), new Date(item.createdAt));
                            const isLastInGroup = !nextMessage || nextMessage.sender?._id !== item.sender?._id || !isSameDay(new Date(nextMessage.createdAt), new Date(item.createdAt));

                            return (
                                <div key={item._id || index}>
                                    {showDateHeader && (<div className="text-center text-xs text-slate-500 my-4 bg-slate-800/50 self-center px-3 py-1 rounded-full">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</div>)}
                                    <MessageBubble item={item} isSender={isSender} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} />
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>
            
            <footer className="flex-shrink-0 p-2 border-t border-slate-800 bg-slate-900/70 backdrop-blur-lg z-20 relative">
                <AnimatePresence>{replyingTo && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-800 p-2 mx-1 rounded-t-lg border-b"><div className="flex justify-between items-center"><div className="border-l-2 border-indigo-400 pl-2 text-xs"><p className="font-bold text-indigo-400">Replying to {replyingTo.sender.name}</p><p className="text-slate-400 truncate max-w-xs">{replyingTo.messageType === 'image' ? '📷 Photo' : replyingTo.content}</p></div><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}><CloseIcon className="h-4 w-4" /></Button></div></motion.div>)}</AnimatePresence>
                <AnimatePresence>{showEmojiPicker && ( <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-[60px] left-2 z-30"><EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" lazyLoadEmojis={true} /></motion.div>)}</AnimatePresence>
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-white flex-shrink-0" onClick={() => fileInputRef.current.click()} disabled={isUploading}><Paperclip className="h-5 w-5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-white flex-shrink-0" onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile className="h-5 w-5" /></Button>
                    <Input value={message} onChange={(e) => { setMessage(e.target.value); handleTyping(); }} placeholder="Message..." className="flex-1 h-10 bg-slate-800 border-slate-700 rounded-full px-4" onFocus={() => {setShowEmojiPicker(false); setReactingToMessageId(null);}} />
                    <Button type="submit" size="icon" className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex-shrink-0" disabled={!message.trim() || isUploading}>{isUploading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Send className="h-5 w-5" />}</Button>
                </form>
            </footer>
            <AnimatePresence>{isInfoPanelOpen && ( <InfoPanel user={chatUser} isOpen={isInfoPanelOpen} onClose={() => setInfoPanelOpen(false)} onRemoveConnection={handleRemoveConnection} /> )}</AnimatePresence>
        </div>
    );
};

export default ChatPage;