// client/src/components/CallingUI.jsx (FULLY DYNAMIC & REUSABLE)
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, Mic, MicOff, Video, VideoOff, PhoneMissed } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import './CallingUI.css'; // Shared CSS file

const CallingUI = ({
  callState,      // 'calling', 'incoming', 'active'
  callType,       // 'video', 'audio'
  user,           // Jisko call kiya/jisne call kiya (name, profilePhotoUrl)
  leaveCall,
  answerCall,
  isMuted,
  toggleMute,
  isVideoOff,
  toggleVideo,
  myVideo,          // ref for my video
  userVideo,        // ref for other user's video
  callDuration,
}) => {
  const ringtoneRef = useRef(null);

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
  
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // --- RINGING / INCOMING UI ---
  if (callState === 'calling' || callState === 'incoming') {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="call-container"
      >
        <audio ref={ringtoneRef} src="/ringtone.mp3" loop />
        
        <div className="text-center mt-12">
          <h1 className="text-4xl font-bold">{user?.name || 'Connecting...'}</h1>
          <p className="text-slate-300 mt-2 text-lg">
            {callState === 'calling' ? `Calling...` : `Incoming ${callType} call...`}
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute h-64 w-64 rounded-full bg-indigo-500/20 avatar-pulsate"></div>
          <Avatar className="h-48 w-48 border-4 border-white/30">
            <AvatarImage src={user?.profilePhotoUrl} />
            <AvatarFallback className="text-6xl">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-8">
          <button onClick={() => leaveCall(true)} className="call-button bg-red-600">
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

  // --- ACTIVE CALL UI ---
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black z-50"
    >
      {/* Other user's video (fullscreen background) */}
      <video ref={userVideo} playsInline autoPlay className="w-full h-full object-cover" />
      
      {/* Overlay with controls */}
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-between p-8 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{user?.name}</h1>
          <p className="text-slate-300 mt-2">{formatDuration(callDuration)}</p>
        </div>

        {/* My video (picture-in-picture) */}
        <video ref={myVideo} playsInline muted autoPlay className="absolute bottom-28 right-6 w-32 h-48 md:w-40 md:h-64 object-cover rounded-lg border-2 border-white/20" />

        <div className="flex items-center gap-6">
          <button onClick={toggleMute} className="bg-white/10 p-4 rounded-full transition-transform hover:scale-110">
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          <button onClick={() => leaveCall(true)} className="bg-red-600 p-5 rounded-full transition-transform hover:scale-110">
            <PhoneMissed size={32} />
          </button>

          {callType === 'video' && (
            <button onClick={toggleVideo} className="bg-white/10 p-4 rounded-full transition-transform hover:scale-110">
              {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CallingUI;