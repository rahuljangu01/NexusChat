// client/src/components/InfoPanel.jsx (YEH NAYI FILE BANANI HAI)

import { motion } from "framer-motion";
import { X, UserX, Mail, Briefcase, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const InfoPanel = ({ user, isOpen, onClose, onRemoveConnection }) => {
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
        
        <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={onRemoveConnection}>
          <UserX className="h-4 w-4 mr-2" />
          Remove Connection
        </Button>
      </div>
    </motion.aside>
  );
};

export default InfoPanel;