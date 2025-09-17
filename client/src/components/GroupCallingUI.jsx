// client/src/components/GroupCallingUI.jsx (FULL & COMPLETE CODE)

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneMissed, Phone, Users, Speaker } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import './CallingUI.css';

const ParticipantVideo = ({ peer, name, profilePhotoUrl }) => {
    const videoRef = useRef();
    useEffect(() => {
        if (peer) {
            peer.on('stream', stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            });
        }
    }, [peer]);
    return (
        <div className="video-participant-container">
            {peer ? (
                <video playsInline autoPlay ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    <Avatar className="h-20 w-20 mb-2"><AvatarImage src={profilePhotoUrl} /><AvatarFallback>{name.charAt(0)}</AvatarFallback></Avatar>
                </div>
            )}
            <div className="participant-name-overlay">{name}</div>
        </div>
    );
};

const ParticipantAvatar = ({ peer, name, profilePhotoUrl }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef();

    useEffect(() => {
        if (!peer) return;

        let audioContext, analyser, microphone, javascriptNode;

        const handleStream = (stream) => {
            if (audioRef.current) {
                audioRef.current.srcObject = stream;
                audioRef.current.play();
            }

            if (!stream.getAudioTracks().length) return;

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);

            javascriptNode.onaudioprocess = () => {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                let values = 0;
                const length = array.length;
                for (let i = 0; i < length; i++) {
                    values += (array[i]);
                }
                const average = values / length;
                if (average > 10) {
                    setIsSpeaking(true);
                    setTimeout(() => setIsSpeaking(false), 500);
                }
            };
        };

        peer.on('stream', handleStream);

        return () => {
            if (javascriptNode) javascriptNode.disconnect();
            if (analyser) analyser.disconnect();
            if (microphone) microphone.disconnect();
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
        };
    }, [peer]);
    
    return (
        <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative">
                <Avatar className="h-24 w-24 md:h-28 md:w-28 transition-transform duration-300">
                    <AvatarImage src={profilePhotoUrl} />
                    <AvatarFallback className="text-3xl">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className={`speaking-indicator ${isSpeaking ? 'speaking' : ''}`}></div>
            </div>
            <p className="font-semibold text-white mt-2">{name}</p>
            <audio ref={audioRef} autoPlay playsInline muted={false} />
        </div>
    );
};

const GroupCallingUI = ({
    group,
    currentUser,
    callState,
    callType,
    leaveCall,
    answerCall,
    isMuted,
    toggleMute,
    isVideoOff,
    toggleVideo,
    myVideoRef,
    peers,
    callerName = "Someone",
}) => {
    const ringtoneRef = useRef();
    const [duration, setDuration] = useState(0);
    const timerRef = useRef();

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    useEffect(() => {
        if (ringtoneRef.current) {
            if (callState === 'calling' || callState === 'incoming') {
                ringtoneRef.current.play().catch(e => console.log("Ringtone play failed:", e));
            } else {
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0;
            }
        }
    }, [callState]);
    
    useEffect(() => {
        if (callState === 'active') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            setDuration(0);
        }
        return () => clearInterval(timerRef.current);
    }, [callState]);

    if (callState === 'calling' || callState === 'incoming') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="call-container"
            >
                <audio ref={ringtoneRef} src="/ringtone.mp3" loop />
                <div className="text-center mt-12">
                    <h1 className="text-4xl font-bold">{group?.name || 'Group Call'}</h1>
                    <p className="text-slate-300 mt-2 text-lg">
                        {callState === 'calling' ? `Starting group ${callType} call...` : `Incoming group ${callType} call from ${callerName}...`}
                    </p>
                </div>
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-64 w-64 rounded-full bg-indigo-500/20 avatar-pulsate"></div>
                    <Avatar className="h-48 w-48 border-4 border-white/30">
                        <AvatarImage src={group?.avatar} />
                        <AvatarFallback className="text-6xl">{group?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex items-center gap-8">
                    <button onClick={leaveCall} className="call-button bg-red-600">
                        <PhoneMissed />
                    </button>
                    {callState === 'incoming' && (
                        <button onClick={answerCall} className="call-button bg-green-600">
                            <Phone />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }
    
    if (!group || !group.members) {
        return <div className="absolute inset-0 bg-slate-950 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div></div>;
    }

    if (callType === 'audio') {
        return (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900 flex flex-col z-50 text-white p-6 justify-between overflow-hidden"
            >
                <div className="audio-call-background" style={{ backgroundImage: `url(${group.avatar})` }}></div>
                <div className="relative z-10 flex flex-col h-full">
                    <header className="text-center">
                        <h1 className="text-4xl font-bold text-white shadow-lg">{group.name}</h1>
                        <p className="text-slate-200 mt-2 shadow-lg">{formatDuration(duration)}</p>
                    </header>
                    <main className="flex-1 grid grid-cols-2 gap-4 content-center">
                        <div className="flex flex-col items-center gap-2 text-center">
                             <div className="relative">
                                <Avatar className="h-24 w-24 md:h-28 md:w-28"><AvatarImage src={currentUser?.profilePhotoUrl} /><AvatarFallback className="text-3xl">{currentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                            </div>
                            <p className="font-semibold text-white mt-2">You</p>
                        </div>
                        {Object.values(peers).map(peerData => (
                           <ParticipantAvatar
                                key={peerData.peerID}
                                peer={peerData.peer}
                                name={peerData.name}
                                profilePhotoUrl={peerData.profilePhotoUrl}
                           />
                        ))}
                    </main>
                    <footer className="flex items-center justify-center gap-6">
                        <button className="bg-white/10 p-4 rounded-full transition-transform hover:scale-110"><Speaker size={28} /></button>
                        <button onClick={toggleMute} className="bg-white/10 p-4 rounded-full transition-transform hover:scale-110">
                            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                        </button>
                        <button onClick={leaveCall} className="bg-red-600 p-5 rounded-full transition-transform hover:scale-110">
                            <PhoneMissed size={32} />
                        </button>
                    </footer>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950 flex flex-col z-50 text-white"
        >
            <header className="p-4 flex justify-between items-center bg-black/20">
                 <div className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-400" /><h1 className="text-xl font-bold">{group.name}</h1></div>
                 <p>{peers ? Object.keys(peers).length + 1 : 1} participants</p>
            </header>
            <main className="flex-1 overflow-hidden relative">
                <div className="video-grid custom-scrollbar">
                     <div className="video-participant-container">
                        <video playsInline muted autoPlay ref={myVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="participant-name-overlay">You</div>
                    </div>
                    {Object.values(peers).map(peerData => (
                        <ParticipantVideo
                            key={peerData.peerID}
                            peer={peerData.peer}
                            name={peerData.name}
                            profilePhotoUrl={peerData.profilePhotoUrl}
                        />
                    ))}
                </div>
            </main>
            <footer className="flex items-center justify-center gap-6 p-4 bg-black/20">
                <button onClick={toggleMute} className="bg-white/10 p-4 rounded-full transition-transform hover:scale-110">{isMuted ? <MicOff size={28} /> : <Mic size={28} />}</button>
                <button onClick={leaveCall} className="bg-red-600 p-5 rounded-full transition-transform hover:scale-110"><PhoneMissed size={32} /></button>
                {callType === 'video' && (
                     <button onClick={toggleVideo} className="bg-white/10 p-4 rounded-full transition-transform hover:scale-110">{isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}</button>
                )}
            </footer>
        </motion.div>
    );
};

export default GroupCallingUI;