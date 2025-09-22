import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, Send, Paperclip, MoreVertical, Video, Phone, UserX, Smile, PhoneIncoming, PhoneOutgoing, PhoneMissed, Check, CheckCheck, Pin, Trash2, Forward, X as CloseIcon, Search, Wallpaper, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { getMessages, addMessage, updateMessage } from "../store/slices/chatSlice";
import { setChatWallpaper, fetchConnections } from "../store/slices/connectionsSlice";
import { uploadFileToCloudinary, removeConnection, logCall, togglePinMessage, deleteMultipleMessages, forwardMessage, updateWallpaper } from "../utils/api";

const peerOptions = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]}};
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

const ChatPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const { connections } = useSelector((state) => state.connections);
    const { user: currentUser } = useSelector((state) => state.auth);
    const activeChatMessages = useSelector((state) => state.chat.messages[userId] || []);
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

    const leaveCall = useCallback(async (logIt = true) => {
        if (logIt && callState !== 'idle') {
            let status = 'rejected';
            if (callState === 'active') status = 'answered';
            if (callState === 'calling') status = 'missed';
            const receiverForLog = callState === 'calling' ? userId : (caller.id || null);
            if (receiverForLog) { 
                await logCall({ receiverId: receiverForLog, status, duration: callDuration });
                dispatch(getMessages(userId));
            }
        }
        setCallState('idle');
        setCaller({});
        setCallerSignal(null);
        setCallDuration(0);
        clearInterval(durationIntervalRef.current);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (connectionRef.current) {
            connectionRef.current.destroy();
            connectionRef.current = null;
        }
        const otherUserId = callState === 'calling' ? userId : caller.id;
        if (otherUserId) {
            socketService.emit('hang-up', { to: otherUserId });
        }
    }, [callState, userId, caller.id, stream, callDuration, dispatch]);

    useEffect(() => {
        if (!currentUser || !userId) return;

        socketService.emit('mark-messages-read', { chatUserId: userId });
        dispatch(getMessages(userId));
        
        const handleCallMade = ({ signal, from, type }) => {
            setCaller(from);
            setCallerSignal(signal);
            setCallType(type);
            setCallState('incoming');
        };
        const handleCallEnded = () => leaveCall(false);

        socketService.on("call-made", handleCallMade);
        socketService.on("call-ended", handleCallEnded);

        return () => {
            socketService.off("call-made", handleCallMade);
            socketService.off("call-ended", handleCallEnded);
        };
    }, [userId, currentUser, dispatch, leaveCall]);

    const callUser = (type) => {
        const constraints = { video: type === 'video', audio: true };
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            setStream(stream);
            if (myVideo.current) myVideo.current.srcObject = stream;

            setCallState('calling');
            setCallType(type);

            const peer = new Peer({ initiator: true, stream, ...peerOptions });
            connectionRef.current = peer;

            const handleCallAccepted = (signal) => {
                setCallState('active');
                durationIntervalRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
                if (connectionRef.current) {
                    connectionRef.current.signal(signal);
                }
                socketService.off('call-accepted', handleCallAccepted);
            };
            socketService.on('call-accepted', handleCallAccepted);

            peer.on('signal', data => {
                const payload = { 
                    userToCall: userId, 
                    signalData: data, 
                    from: { id: currentUser.id, name: currentUser.name, profilePhotoUrl: currentUser.profilePhotoUrl }, 
                    type 
                };
                socketService.emit('call-user', payload);
            });

            peer.on('stream', remoteStream => { 
                if (userVideo.current) userVideo.current.srcObject = remoteStream; 
            });

        }).catch(err => {
            console.error("[Call] getUserMedia FAILED! Error:", err.name, err.message);
            alert(`Could not start call. Error: ${err.name}. Please check camera/mic permissions in your browser.`);
        });
    };

    const answerCall = () => {
        const constraints = { video: callType === 'video', audio: true };
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            setStream(stream);
            if (myVideo.current) myVideo.current.srcObject = stream;
            setCallState('active');
            durationIntervalRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
            
            const peer = new Peer({ initiator: false, stream, ...peerOptions });
            connectionRef.current = peer;
            
            peer.on('signal', data => { socketService.emit('answer-call', { signal: data, to: caller.id }); });
            peer.on('stream', remoteStream => { if(userVideo.current) userVideo.current.srcObject = remoteStream; });
            
            peer.signal(callerSignal);
        }).catch(err => console.error("getUserMedia error:", err));
    };
    
    const toggleMute = () => {
        if (stream && stream.getAudioTracks().length > 0) {
            const audioTrack = stream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        }
    };

    const toggleVideo = () => {
        if (stream && callType === 'video' && stream.getVideoTracks().length > 0) {
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);
        }
    };
    
    useEffect(() => {
        const foundPinned = activeChatMessages.find(msg => msg.isPinned);
        setPinnedMessage(foundPinned || null);
    }, [activeChatMessages]);

    const handleMessageLongPress = (messageId) => {
        setSelectionMode(true);
        setSelectedMessages(new Set([messageId]));
    };
    
    const handleMessageClick = (messageId) => {
        if (!selectionMode) return;
        const newSelected = new Set(selectedMessages);
        if (newSelected.has(messageId)) {
            newSelected.delete(messageId);
        } else {
            newSelected.add(messageId);
        }
        if (newSelected.size === 0) {
            setSelectionMode(false);
        }
        setSelectedMessages(newSelected);
    };

    const clearSelection = () => {
        setSelectionMode(false);
        setSelectedMessages(new Set());
    };

    const handleDeleteSelected = async () => {
        if (window.confirm(`Delete ${selectedMessages.size} message(s)?`)) {
            try {
                await deleteMultipleMessages(Array.from(selectedMessages));
                dispatch(getMessages(userId));
                clearSelection();
            } catch (error) {
                alert("Failed to delete messages. You can only delete your own messages.");
            }
        }
    };
    
    const handlePinSelected = async () => {
        const messageId = selectedMessages.values().next().value;
        try {
            await togglePinMessage(messageId);
            dispatch(getMessages(userId));
            clearSelection();
        } catch (error) {
            alert("Failed to pin message.");
        }
    };

    const handleForwardSelected = async (forwardToUserId) => {
        try {
            for (const messageId of selectedMessages) {
                await forwardMessage(messageId, forwardToUserId);
            }
            alert(`Message(s) forwarded successfully!`);
            clearSelection();
            setIsForwarding(false);
        } catch (error) {
            alert("Failed to forward message(s).");
            console.error(error);
        }
    };
     const handleTyping = () => {
        socketService.emit("typing", { receiverId: userId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { socketService.emit("stop-typing", { receiverId: userId }); }, 2000);
    };

    useEffect(() => {
        if (currentUser && userId) {
            dispatch(fetchConnections(currentUser.id));
            
            const handleUserTyping = ({ userId: typingUserId }) => { if (typingUserId === userId) setIsTyping(true); };
            const handleUserStopTyping = ({ userId: stopTypingUserId }) => { if (stopTypingUserId === userId) setIsTyping(false); };
            
            socketService.joinChat(userId);
            
            socketService.onUserTyping(handleUserTyping);
            socketService.onUserStopTyping(handleUserStopTyping);
            
            return () => {
                socketService.leaveChat(userId);
                socketService.off("user-typing", handleUserTyping);
                socketService.off("user-stop-typing", handleUserStopTyping);
            };
        }
    }, [userId, dispatch, currentUser]);
    
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeChatMessages]);

    const handleEmojiClick = (emojiObject) => { setMessage(prev => prev + emojiObject.emoji); };
    
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !currentUser) return;

        const tempId = Date.now().toString();
        const optimisticMessage = {
            _id: tempId,
            sender: { _id: currentUser.id, name: currentUser.name, profilePhotoUrl: currentUser.profilePhotoUrl },
            receiver: { _id: userId },
            content: message.trim(),
            messageType: 'text',
            createdAt: new Date().toISOString(),
            status: 'sent',
            _type: 'message',
        };

        dispatch(addMessage({ chatId: userId, message: optimisticMessage }));
        
        const messageToSend = message.trim();
        setMessage("");
        setShowEmojiPicker(false);

        try {
            const response = await new Promise((resolve, reject) => {
                socketService.emit('send-message', {
                    receiverId: userId,
                    content: messageToSend,
                    tempId: tempId,
                }, (ack) => {
                    if (ack.error) {
                        reject(new Error(ack.error));
                    } else {
                        resolve(ack);
                    }
                });
            });

            if (response.message) {
                dispatch(updateMessage({ chatId: userId, tempId: tempId, finalMessage: response.message }));
                dispatch(fetchConnections(currentUser.id));
            }
        } catch (error) {
            console.error("Failed to send message:", error.message);
        }
    };
    
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const uploadedFile = await uploadFileToCloudinary(file);
            
            const tempId = Date.now().toString();
            socketService.emit('send-message', {
                receiverId: userId,
                content: uploadedFile.url,
                messageType: file.type.startsWith("image") ? 'image' : 'file',
                fileName: file.name,
                fileSize: file.size,
                tempId: tempId
            }, (ack) => {
                 if (ack.message) {
                    dispatch(fetchConnections(currentUser.id));
                }
            });
            
        } catch (error) { 
            alert("Failed to upload and send file.");
            console.error(error);
        } finally { 
            setIsUploading(false); 
        }
    };
    
    const handleRemoveConnection = async () => {
      if(chatUserConnection && window.confirm(`Are you sure you want to remove ${chatUser.name} from your connections?`)){
        try {
          await removeConnection(chatUserConnection._id);
          alert("Connection removed.");
          navigate('/dashboard');
        } catch(error) {
          alert("Failed to remove connection.");
        }
      }
    };

    const formatTime = (dateString) => format(new Date(dateString), 'p');

    if (!currentUser || !chatUser) {
        return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>;
    }

    return (
        <div className="h-full w-full grid grid-rows-[auto_1fr_auto]">
            <AnimatePresence>
                {callState !== 'idle' && ( 
                    <CallingUI 
                        callState={callState} 
                        callType={callType} 
                        user={callState === 'incoming' ? caller : chatUser} 
                        myVideo={myVideo} 
                        userVideo={userVideo} 
                        isMuted={isMuted} 
                        isVideoOff={isVideoOff} 
                        callDuration={callDuration} 
                        leaveCall={leaveCall} 
                        answerCall={answerCall} 
                        toggleMute={toggleMute}
                        toggleVideo={toggleVideo}
                    /> 
                )}
            </AnimatePresence>
            
            <Dialog open={isForwarding} onOpenChange={setIsForwarding}>
                <ForwardDialog connections={connections} currentUser={currentUser} onForward={handleForwardSelected} />
            </Dialog>

            <WallpaperDialog
                open={isWallpaperDialogOpen}
                onOpenChange={setIsWallpaperDialogOpen}
                connectionId={chatUserConnection?._id}
                currentWallpaper={currentWallpaper}
                onWallpaperChange={(url) => dispatch(setChatWallpaper({ connectionId: chatUserConnection._id, wallpaperUrl: url }))}
            />

            <header className="flex items-center px-2 py-1 h-14 border-b border-slate-800 bg-slate-900/70 backdrop-blur-lg z-20">
                {selectionMode ? (
                    <div className="flex items-center justify-between w-full">
                        <Button variant="ghost" size="icon" onClick={clearSelection}><CloseIcon className="h-5 w-5" /></Button>
                        <span className="font-semibold text-lg">{selectedMessages.size} selected</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={handleDeleteSelected}><Trash2 className="h-5 w-5" /></Button>
                            {selectedMessages.size === 1 && <Button variant="ghost" size="icon" onClick={handlePinSelected}><Pin className="h-5 w-5" /></Button>}
                            <Button variant="ghost" size="icon" onClick={() => setIsForwarding(true)}><Forward className="h-5 w-5" /></Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 md:hidden" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5"/></Button>
                        <div className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden" onClick={() => setInfoPanelOpen(true)}>
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={chatUser.profilePhotoUrl}/>
                                <AvatarFallback className="text-sm">{chatUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <h2 className="font-bold text-sm text-white truncate">{chatUser.name}</h2>
                                <p className="text-xs text-indigo-400 h-4">{isTyping ? 'typing...' : (chatUser.isOnline ? 'Online' : 'Offline')}</p>
                            </div>
                        </div>
                        <div className="ml-auto flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => callUser('video')} className="h-9 w-9 text-gray-400"><Video className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => callUser('audio')} className="h-9 w-9 text-gray-400"><Phone className="h-4 w-4"/></Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                                    <DropdownMenuItem onClick={() => setInfoPanelOpen(true)}>View Info</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsWallpaperDialogOpen(true)}><Wallpaper className="mr-2 h-4 w-4" /><span>Change Wallpaper</span></DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700"/>
                                    <DropdownMenuItem className="text-red-500" onClick={handleRemoveConnection}><UserX className="mr-2 h-4 w-4"/>Remove Connection</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                )}
            </header>
            
            <div className="overflow-y-auto custom-scrollbar relative">
                {pinnedMessage && !selectionMode && (<motion.div initial={{y: -50}} animate={{y: 0}} className="sticky top-0 p-2 bg-slate-800/80 backdrop-blur-sm flex items-center gap-2 text-sm text-slate-300 border-b border-slate-700 z-10"><Pin className="h-4 w-4 text-indigo-400 flex-shrink-0" /><p className="truncate flex-1">{pinnedMessage.content}</p><Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await togglePinMessage(pinnedMessage._id); dispatch(getMessages(userId)); }}><CloseIcon className="h-4 w-4" /></Button></motion.div>)}
                
                {currentWallpaper ? (<div className="absolute inset-0 w-full h-full bg-cover bg-center z-0" style={{ backgroundImage: `url(${currentWallpaper})` }}><div className="absolute inset-0 w-full h-full bg-black/50"></div></div>) : (<div className="static-pattern-background"></div>)}
                
                <div className="relative z-10 p-3 flex flex-col">
                    {activeChatMessages.map((item, index) => {
                        const showDateHeader = index === 0 || !isSameDay(new Date(activeChatMessages[index - 1].createdAt), new Date(item.createdAt));
                        if (item._type === 'call') {
                            const isOutgoing = item.caller._id === currentUser.id;
                            const callTime = format(new Date(item.createdAt), 'p');
                            let Icon = PhoneIncoming; let text = 'Incoming call';
                            if (isOutgoing) { Icon = PhoneOutgoing; text = 'Outgoing call'; }
                            if (item.status === 'missed' || item.status === 'rejected') { Icon = PhoneMissed; text = 'Missed call'; }
                            return (<div key={item._id || index}>{showDateHeader && (<div className="text-center text-xs text-slate-500 my-4 bg-slate-800/50 self-center px-3 py-1 rounded-full">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</div>)}<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center my-3"><div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg"><Icon className={`h-4 w-4 ${item.status === 'missed' || item.status === 'rejected' ? 'text-red-400' : 'text-slate-500'}`} /><span>{text}</span><span>•</span><span>{callTime}</span></div></motion.div></div>);
                        }
                        const isSender = item.sender?._id === currentUser.id;
                        const isSelected = selectedMessages.has(item._id);
                        return (
                            <div key={item._id || index} onContextMenu={(e) => { e.preventDefault(); handleMessageLongPress(item._id); }}>
                                {showDateHeader && (<div className="text-center text-xs text-slate-500 my-4 bg-slate-800/50 self-center px-3 py-1 rounded-full">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</div>)}
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => handleMessageClick(item._id)} className={`flex items-end gap-1.5 my-0.5 rounded-lg transition-colors duration-200 ${isSender ? "justify-end" : "justify-start"} ${isSelected ? 'bg-indigo-500/20' : ''}`}>
                                    {!isSender && <Avatar className="h-6 w-6 self-end"><AvatarImage src={chatUser?.profilePhotoUrl}/><AvatarFallback className="text-xs">{chatUser?.name?.charAt(0)}</AvatarFallback></Avatar>}
                                    <div className={`message-bubble max-w-[85%] rounded-xl ${isSender ? "bg-indigo-600 sent" : "bg-[#2a2a36] received"}`}>
                                        {item.messageType === 'image' ? (
                                            <a href={item.content} target="_blank" rel="noopener noreferrer" className="block p-1">
                                                <img src={item.content} alt="Sent" className="max-w-full h-auto rounded-lg" />
                                            </a>
                                        ) : item.messageType === 'file' ? (
                                            <a href={item.content} target="_blank" rel="noopener noreferrer" download={item.fileName || 'file'} className="flex items-center gap-3 p-3 text-white hover:underline bg-slate-700/50 rounded-lg">
                                                <Paperclip className="h-8 w-8 flex-shrink-0 text-slate-400" />
                                                <div className="overflow-hidden">
                                                    <p className="font-semibold truncate">{item.fileName || 'Attached File'}</p>
                                                    <p className="text-xs text-slate-300">{item.fileSize ? `${(item.fileSize / 1024).toFixed(2)} KB` : ''}</p>
                                                </div>
                                            </a>
                                        ) : (
                                            <p className="px-2.5 py-1.5 text-sm break-words text-white">{item.content}</p>
                                        )}
                                        <span className="text-[10px] opacity-70 float-right mr-2 mb-1 self-end text-white/70 flex items-center">{formatTime(item.createdAt)}{isSender && <MessageStatus status={item.status} />}</span>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            
            <footer className="p-1.5 border-t border-slate-800 bg-slate-900/70 backdrop-blur-lg z-20 relative">
                <AnimatePresence>{showEmojiPicker && ( <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-[52px] left-2 z-30"><EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" lazyLoadEmojis={true} /></motion.div>)}</AnimatePresence>
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white flex-shrink-0" onClick={() => fileInputRef.current.click()} disabled={isUploading}><Paperclip className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white flex-shrink-0" onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile className="h-4 w-4" /></Button>
                    <Input value={message} onChange={(e) => { setMessage(e.target.value); handleTyping(); }} placeholder="Message..." className="flex-1 h-9 bg-slate-800 border-slate-700 rounded-full px-4 text-sm" onFocus={() => setShowEmojiPicker(false)} />
                    <Button type="submit" size="icon" className="h-9 w-9 bg-indigo-600 hover:bg-indigo-500 rounded-full flex-shrink-0" disabled={!message.trim() || isUploading}>
                        {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </footer>
            <AnimatePresence>{isInfoPanelOpen && ( <InfoPanel user={chatUser} isOpen={isInfoPanelOpen} onClose={() => setInfoPanelOpen(false)} onRemoveConnection={handleRemoveConnection} /> )}</AnimatePresence>
        </div>
    );
};

export default ChatPage;