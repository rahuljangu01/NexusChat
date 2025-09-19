// client/src/pages/GroupChatPage.jsx (FINAL - NULL USER & WARNING FIX)

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Send, Paperclip, MoreVertical, UserPlus, LogOut, X, Smile, Phone, Video, PhoneCall } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import Peer from 'simple-peer';
import Select from 'react-select';

import { socketService } from "../services/socketService";
import api, { uploadProfilePhoto, logCall, getMyConnections, addMembersToGroup } from "../utils/api";
import "./Dashboard.css";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import GroupCallingUI from "../components/GroupCallingUI";

const AddMembersDialog = ({ group, currentUser, onMembersAdded }) => {
    const [connections, setConnections] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchConnections = async () => {
            if (!currentUser?.id || !group?.members) return;
            const myConns = await getMyConnections();
            const acceptedConns = myConns.filter(c => c.status === 'accepted');
            
            // <<< --- THIS IS THE FIX --- >>>
            // First, filter out any members where the user is null
            const validMembers = group.members.filter(member => member && member.user);
            const currentMemberIds = validMembers.map(m => m.user._id);
            
            const friendOptions = acceptedConns
                .map(conn => conn.users.find(u => u._id !== currentUser.id))
                .filter(friend => friend && !currentMemberIds.includes(friend._id))
                .map(friend => ({ value: friend._id, label: friend.name }));
            
            setConnections(friendOptions);
        };
        fetchConnections();
    }, [group, currentUser]);

    const handleAdd = async () => {
        if (selectedMembers.length === 0) return;
        setIsLoading(true);
        try {
            const memberIds = selectedMembers.map(m => m.value);
            await addMembersToGroup(group._id, memberIds);
            alert("Members added successfully!");
            onMembersAdded();
        } catch (error) {
            alert("Failed to add members.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const customSelectStyles = {
        control: (styles) => ({ ...styles, backgroundColor: '#1e293b', borderColor: '#475569', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' } }),
        option: (styles, { isFocused, isSelected }) => ({ ...styles, backgroundColor: isSelected ? '#4f46e5' : isFocused ? '#312e81' : undefined, color: 'white' }),
        multiValue: (styles) => ({ ...styles, backgroundColor: '#4338ca' }),
        multiValueLabel: (styles) => ({ ...styles, color: 'white' }),
        multiValueRemove: (styles) => ({ ...styles, color: '#e0e0e0', ':hover': { backgroundColor: '#4f46e5', color: 'white' } }),
        menu: (styles) => ({ ...styles, backgroundColor: '#1e293b', border: '1px solid #475569' }),
        input: (styles) => ({ ...styles, color: 'white' }),
    };

    return (
        <DialogContent className="bg-[#161b22] border-slate-700 text-white">
            <DialogHeader>
                <DialogTitle>Add Members to {group.name}</DialogTitle>
                <DialogDescription>Select friends to add to this group.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Select
                    isMulti
                    options={connections}
                    value={selectedMembers}
                    onChange={setSelectedMembers}
                    styles={customSelectStyles}
                    placeholder="Search for friends to add..."
                    noOptionsMessage={() => 'No more friends to add'}
                />
                <div className="flex justify-end">
                    <Button onClick={handleAdd} disabled={isLoading || selectedMembers.length === 0}>
                        {isLoading ? "Adding..." : "Add Members"}
                    </Button>
                </div>
            </div>
        </DialogContent>
    );
};


const GroupChatPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useSelector((state) => state.auth);

    const [group, setGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [isInfoPanelOpen, setInfoPanelOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAddMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
    
    const [groupCallState, setGroupCallState] = useState('idle');
    const [callType, setCallType] = useState('video');
    const [stream, setStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(true);
    const [incomingCallData, setIncomingCallData] = useState(null);

    const myVideoRef = useRef(null);
    const peersRef = useRef({});
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const { id: currentUserId, name: currentUserName, profilePhotoUrl: currentUserPhoto } = currentUser;

    const fetchGroupData = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        try {
            const [groupRes, messagesRes] = await Promise.all([
                api.get(`/groups/${groupId}`),
                api.get(`/groups/${groupId}/messages`)
            ]);
            setGroup(groupRes.data.group);
            setMessages(messagesRes.data.messages);
        } catch (error) {
            console.error("Failed to load group chat", error);
            navigate("/dashboard/groups");
        } finally {
            setLoading(false);
        }
    }, [groupId, navigate]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const handleRemoveMember = async (memberUserId) => {
        if (window.confirm("Are you sure you want to remove this member from the group?")) {
            try {
                await api.delete(`/groups/${groupId}/members/${memberUserId}`);
                alert("Member removed successfully.");
                fetchGroupData();
            } catch (error) {
                alert(error.response?.data?.message || "Failed to remove member.");
            }
        }
    };

    const startGroupCall = useCallback((type) => {
        setCallType(type);
        setGroupCallState('calling');
        const constraints = { audio: true, video: type === 'video' };
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            setStream(stream);
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            setIsVideoOff(type === 'audio');
            socketService.emit('start-group-call', { groupId, from: { id: currentUserId, name: currentUserName, profilePhotoUrl: currentUserPhoto }, callType: type });
        }).catch(err => {
            console.error("getUserMedia error:", err);
            setGroupCallState('idle');
        });
    }, [groupId, currentUserId, currentUserName, currentUserPhoto]);

    const answerGroupCall = useCallback(() => {
        const constraints = { audio: true, video: incomingCallData.callType === 'video' };
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            setStream(stream);
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            setCallType(incomingCallData.callType);
            setIsVideoOff(incomingCallData.callType === 'audio');
            setGroupCallState('active');
            socketService.emit('join-group-call', { groupId, from: { id: currentUserId, name: currentUserName, profilePhotoUrl: currentUserPhoto } });
        });
    }, [groupId, currentUserId, currentUserName, currentUserPhoto, incomingCallData]);
    
    const leaveGroupCall = useCallback(async (isRejecting = false) => {
        if (!isRejecting && groupCallState !== 'idle') {
            await logCall({ groupId: group?._id, status: 'answered', duration: 0 });
            await fetchGroupData();
        }
        setGroupCallState('idle');
        setIncomingCallData(null);
        if(stream) stream.getTracks().forEach(track => track.stop());
        Object.values(peersRef.current).forEach(peerData => peerData.peer.destroy());
        setPeers({});
        peersRef.current = {};
        setStream(null);
        socketService.emit('leave-group-call', { groupId, userId: currentUserId });
    }, [stream, group, groupId, groupCallState, fetchGroupData, currentUserId]);


    useEffect(() => {
        if (!groupId) return;
        socketService.emit("join-group-room", groupId);
        socketService.emit('mark-group-messages-read', { groupId });
        const handleNewMessage = (message) => { if (message.group === groupId || message.group?._id === groupId) { setMessages(prev => [...prev, message]); } };
        socketService.on("receive-group-message", handleNewMessage);
        const handleIncomingCall = (data) => { if (data.groupId === groupId && groupCallState === 'idle') { setIncomingCallData(data); setCallType(data.callType); setGroupCallState('incoming'); } };
        const handleNewUserJoining = ({ from }) => {
            if (!stream || from.id === currentUserId) return;
            const peer = new Peer({ initiator: true, trickle: false, stream });
            peer.on('signal', signal => { socketService.emit('send-signal-group', { signal, to: from.id, from: { id: currentUserId, name: currentUserName, profilePhotoUrl: currentUserPhoto } }); });
            peersRef.current[from.id] = { peer, peerID: from.id, name: from.name, profilePhotoUrl: from.profilePhotoUrl };
            setPeers({...peersRef.current});
        };
        const handleReceivingSignal = ({ signal, from }) => {
            if (groupCallState === 'calling') { setGroupCallState('active'); }
            const peer = new Peer({ initiator: false, trickle: false, stream });
            peer.on('signal', returnSignal => { socketService.emit('return-signal-group', { signal: returnSignal, to: from.id }); });
            peer.signal(signal);
            peersRef.current[from.id] = { peer, peerID: from.id, name: from.name, profilePhotoUrl: from.profilePhotoUrl };
            setPeers({...peersRef.current});
        };
        const handleReceivingReturnSignal = ({signal, from}) => { const item = peersRef.current[from.id]; if (item) { item.peer.signal(signal); } }
        const handleUserLeft = ({ userId }) => { if (peersRef.current[userId]) { peersRef.current[userId].peer.destroy(); delete peersRef.current[userId]; setPeers({...peersRef.current}); } };
        socketService.on('incoming-group-call', handleIncomingCall);
        socketService.on('new-user-joined-group-call', handleNewUserJoining);
        socketService.on('receiving-signal-group', handleReceivingSignal);
        socketService.on('receiving-returned-signal-group', handleReceivingReturnSignal);
        socketService.on('user-left-group-call', handleUserLeft);
        return () => {
            socketService.off('incoming-group-call', handleIncomingCall);
            socketService.off('new-user-joined-group-call', handleNewUserJoining);
            socketService.off('receiving-signal-group', handleReceivingSignal);
            socketService.off('receiving-returned-signal-group', handleReceivingReturnSignal);
            socketService.off('user-left-group-call', handleUserLeft);
            socketService.emit("leave-group-room", groupId);
            socketService.off("receive-group-message", handleNewMessage);
        };
    }, [groupId, groupCallState, stream, currentUserId, currentUserName, currentUserPhoto]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleEmojiClick = (emojiObject) => {
      setNewMessage(prev => prev + emojiObject.emoji);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !groupId) return;
        try {
            setNewMessage("");
            setShowEmojiPicker(false);
            await api.post(`/groups/${groupId}/send`, { content: newMessage.trim() });
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Message could not be sent.");
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const uploadedFile = await uploadProfilePhoto(file);
            await api.post(`/groups/${groupId}/send`, { content: uploadedFile.url, messageType: file.type.startsWith("image") ? 'image' : 'file', fileName: file.name, fileSize: file.size });
        } catch (error) { 
            alert("Failed to upload file."); 
        } finally { 
            setIsUploading(false); 
        }
    };
    
    const handleLeaveGroup = async () => {
        if (window.confirm(`Are you sure you want to leave "${group.name}"?`)) {
            try {
                await api.post(`/groups/${groupId}/leave`);
                alert("You have left the group.");
                navigate('/dashboard/groups');
            } catch (error) {
                alert(error.response?.data?.message || "Failed to leave group.");
            }
        }
    };

    if (loading || !group) {
        return <div className="h-full w-full flex items-center justify-center bg-[#0d1117]"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>;
    }

    const isAdmin = group.members.find(m => m.user?._id === currentUserId)?.role === 'admin';

    return (
        <div className="h-full w-full flex bg-[#0d1117] text-gray-300 overflow-hidden relative min-h-0">
            <AnimatePresence>
                {groupCallState !== 'idle' && ( <GroupCallingUI group={group} currentUser={currentUser} callState={groupCallState} callType={callType} leaveCall={() => leaveGroupCall(groupCallState === 'incoming')} answerCall={answerGroupCall} isMuted={isMuted} toggleMute={() => { if(stream) { stream.getAudioTracks()[0].enabled = !isMuted; setIsMuted(!isMuted); } }} isVideoOff={isVideoOff} toggleVideo={() => { if(stream && callType === 'video'){ stream.getVideoTracks()[0].enabled = isVideoOff; setIsVideoOff(!isVideoOff); } }} myVideoRef={myVideoRef} peers={peers} callerName={incomingCallData?.from.name}/> )}
            </AnimatePresence>
            <main className={`flex-1 flex flex-col relative ${groupCallState !== 'idle' ? 'blur-sm pointer-events-none' : ''}`}>
                <header className="flex items-center p-2 h-16 border-b border-slate-800 flex-shrink-0 bg-slate-900/70 backdrop-blur-lg z-20">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 mr-1 md:hidden" onClick={() => navigate("/dashboard/groups")}><ArrowLeft className="h-5 w-5" /></Button>
                    <div className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden" onClick={() => setInfoPanelOpen(true)}>
                        <Avatar className="h-10 w-10"><AvatarImage src={group?.avatar} /><AvatarFallback>{group?.name?.charAt(0)}</AvatarFallback></Avatar>
                        <div className="overflow-hidden">
                            <h2 className="font-bold text-base text-white truncate">{group?.name}</h2>
                            <p className="text-xs text-slate-400">{group?.members.length} members</p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => startGroupCall('video')} className="h-10 w-10 text-gray-400"><Video className="h-5 w-5"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => startGroupCall('audio')} className="h-10 w-10 text-gray-400"><Phone className="h-5 w-5"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setInfoPanelOpen(true)} className="h-10 w-10 text-gray-400"><MoreVertical className="h-5 w-5"/></Button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <div className="p-4 flex flex-col">
                        {messages.map((item, index) => {
                            const showDateHeader = index === 0 || !isSameDay(new Date(messages[index - 1].createdAt), new Date(item.createdAt));
                            if (item._type === 'call') {
                                const callTime = format(new Date(item.createdAt), 'p');
                                const callerName = item.caller?._id === currentUserId ? 'You' : item.caller?.name || 'Someone';
                                return ( <div key={item._id || index}> {showDateHeader && (<div className="text-center text-xs text-slate-500 my-4 bg-slate-800/50 self-center px-3 py-1 rounded-full">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</div>)} <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center my-3"> <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg"> <PhoneCall className="h-4 w-4 text-slate-500" /> <span>Call started by {callerName}</span> <span>•</span> <span>{callTime}</span> </div> </motion.div> </div> );
                            }
                            const isSender = item.sender?._id === currentUserId;
                            return (
                                <div key={item._id || index} className="w-full">
                                    {showDateHeader && (<div className="text-center text-xs text-slate-500 my-4 bg-slate-800/50 self-center px-3 py-1 rounded-full">{format(new Date(item.createdAt), 'MMMM d, yyyy')}</div>)}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 my-1 ${isSender ? "justify-end" : "justify-start"}`}>
                                        {!isSender && item.sender && <Avatar className="h-8 w-8 self-end"><AvatarImage src={item.sender.profilePhotoUrl}/><AvatarFallback>{item.sender.name.charAt(0)}</AvatarFallback></Avatar>}
                                        <div className={`message-bubble max-w-xs md:max-w-md rounded-2xl ${isSender ? "bg-indigo-600 text-white sent" : "bg-[#2a2a36] text-gray-200 received"}`}>
                                            {!isSender && item.sender && <p className="text-xs font-bold text-indigo-300 mb-1 px-3 pt-2">{item.sender.name}</p>}
                                            <p className="px-3 py-2 text-sm break-words">{item.content}</p>
                                            <span className="text-xs opacity-70 float-right mr-2 mb-1 self-end">{format(new Date(item.createdAt), 'p')}</span>
                                        </div>
                                    </motion.div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                <footer className="p-2 border-t border-slate-800 bg-slate-900/70 backdrop-blur-lg z-20 relative">
                    <AnimatePresence>{showEmojiPicker && ( <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-[60px] left-2 z-30"> <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" lazyLoadEmojis={true} /> </motion.div> )}</AnimatePresence>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-white flex-shrink-0" onClick={() => fileInputRef.current.click()} disabled={isUploading}><Paperclip className="h-5 w-5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-white flex-shrink-0" onClick={() => setShowEmojiPicker(!showEmojiPicker)}> <Smile className="h-5 w-5" /> </Button>
                        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={`Message in ${group.name}`} className="flex-1 h-10 bg-slate-800 border-slate-700 rounded-full px-4" autoComplete="off" onFocus={() => setShowEmojiPicker(false)} />
                        <Button type="submit" size="icon" className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex-shrink-0" disabled={!newMessage.trim() || isUploading}> {isUploading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Send className="h-5 w-5" />} </Button>
                    </form>
                </footer>
            </main>
            
            <AnimatePresence>
                {isInfoPanelOpen && (
                    <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full md:w-[350px] bg-[#161b22] flex flex-col border-l border-slate-800 z-30 absolute top-0 right-0 h-full">
                        <header className="flex items-center p-4 h-20 border-b border-slate-800">
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400" onClick={() => setInfoPanelOpen(false)}><X className="h-5 w-5"/></Button>
                            <h3 className="font-semibold text-white ml-4">Group Info</h3>
                        </header>
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col items-center text-center"><Avatar className="h-24 w-24 mb-4"><AvatarImage src={group.avatar}/><AvatarFallback className="text-4xl">{group.name.charAt(0)}</AvatarFallback></Avatar><h2 className="text-xl font-bold text-white">{group.name}</h2><p className="text-sm text-slate-400">{group.description}</p></div>
                            <div className="border-t border-slate-800 my-6"></div>
                            
                            <Dialog open={isAddMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm uppercase font-semibold text-slate-500">{group.members.length} Members</h4>
                                    {isAdmin && (
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400">
                                                <UserPlus className="h-5 w-5"/>
                                            </Button>
                                        </DialogTrigger>
                                    )}
                                </div>
                                <AddMembersDialog group={group} currentUser={currentUser} onMembersAdded={() => { setAddMemberDialogOpen(false); fetchGroupData(); }}/>
                            </Dialog>
                            
                            <TooltipProvider>
                                <div className="space-y-2">
                                    {group.members.filter(member => member && member.user).map(member => (
                                        <div key={member.user._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer" onClick={() => { if (member.user._id !== currentUserId) { navigate(`/dashboard/chat/${member.user._id}`) } }}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9"><AvatarImage src={member.user.profilePhotoUrl}/><AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback></Avatar>
                                                <div>
                                                    <h3 className="font-semibold text-sm text-white">{member.user.name}</h3>
                                                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                                                </div>
                                            </div>
                                            {isAdmin && member.user._id !== currentUserId && 
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.user._id); }}>
                                                            <X className="h-5 w-5"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Remove Member</p></TooltipContent>
                                                </Tooltip>
                                            }
                                        </div>
                                    ))}
                                </div>
                            </TooltipProvider>
                            <div className="border-t border-slate-800 my-6"></div>
                            <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={handleLeaveGroup}><LogOut className="h-4 w-4 mr-2"/>Leave Group</Button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupChatPage;