// client/src/components/UserListItem.jsx (COMPACT UI)

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, UserX, Trash2, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const UserListItem = ({ user, status, connectionId, onAction }) => {
  if (!user || !user._id) return null;

  const { connectionStatus, _id } = user;
  const isOnline = user.isOnline;

  const ClickableWrapper = ({ children }) => {
    if (status === "connected") {
      return <div className="flex items-center gap-3 cursor-pointer flex-grow" onClick={() => onAction('message', _id)}>{children}</div>;
    }
    return <div className="flex items-center gap-3 flex-grow">{children}</div>;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50"
    >
      <ClickableWrapper>
        <div className="relative">
          {/* <<< --- UI CHANGE: Smaller Avatar --- >>> */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profilePhotoUrl || "/placeholder.svg"} />
            <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</AvatarFallback>
          </Avatar>
          {isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-slate-900"></span>}
        </div>
        <div>
          {/* <<< --- UI CHANGE: Smaller Font --- >>> */}
          <h3 className="font-semibold text-sm text-white">{user.name || 'Unknown User'}</h3>
          <p className="text-xs text-slate-400">{user.department}</p>
        </div>
      </ClickableWrapper>

      <div className="flex items-center gap-1 flex-shrink-0">
        {status === "search_result" && (
          <>
            {/* <<< --- UI CHANGE: Smaller Button --- >>> */}
            {connectionStatus === "none" && <Button size="sm" variant="outline" onClick={() => onAction('connect', _id)}><UserPlus className="h-4 w-4 mr-1"/>Connect</Button>}
            {connectionStatus === "pending" && <Button size="sm" variant="outline" disabled>Sent</Button>}
          </>
        )}
        
        {status === "pending_received" && (
          <>
            {/* <<< --- UI CHANGE: Smaller Buttons --- >>> */}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => onAction('accept', connectionId)}><UserCheck className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => onAction('reject', connectionId)}><UserX className="h-4 w-4" /></Button>
          </>
        )}

        {status === "connected" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
              <DropdownMenuItem className="text-red-500" onClick={() => onAction('unfriend', connectionId)}><Trash2 className="h-4 w-4 mr-2"/>Unfriend</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
};

export default UserListItem;