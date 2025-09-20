// client/src/pages/GroupsPage.jsx (UPDATED WITH DATA REFRESH LOGIC)

import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Search, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Select from 'react-select';

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import api, { getMyConnections, uploadProfilePhoto } from "../utils/api";
import "./Dashboard.css";

const CreateGroupDialog = ({ onGroupCreated, onClose }) => {
    const { user: currentUser } = useSelector((state) => state.auth);
    const [newGroup, setNewGroup] = useState({ name: "", description: "", isPrivate: false, members: [] });
    const [connections, setConnections] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);
    
    useEffect(() => {
        const fetchConnections = async () => {
            if (!currentUser?.id) return;
            try {
                const myConns = await getMyConnections();
                const acceptedConns = myConns.filter(c => c.status === 'accepted');
                const userOptions = acceptedConns.map(conn => {
                    const friend = conn.users.find(u => u._id !== currentUser.id);
                    if (!friend) return null;
                    return { value: friend._id, label: friend.name, avatar: friend.profilePhotoUrl };
                }).filter(Boolean);
                setConnections(userOptions);
            } catch (error) {
                console.error("Failed to fetch connections for group creation", error);
            }
        };
        fetchConnections();
    }, [currentUser.id]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleCreateGroup = async (e) => {
      e.preventDefault();
      if (!newGroup.name) {
        alert("Group name is required.");
        return;
      }
      setIsCreating(true);
      
      try {
        let avatarUrl = "";
        if (avatarFile) {
            const uploadedFile = await uploadProfilePhoto(avatarFile);
            avatarUrl = uploadedFile.url;
        }

        const memberIds = newGroup.members.map(member => member.value);
        await api.post("/groups/create", {
            name: newGroup.name,
            description: newGroup.description,
            isPrivate: newGroup.isPrivate,
            members: memberIds,
            avatar: avatarUrl
        });

        alert("Group created successfully!");
        onGroupCreated();
      } catch (error) {
        console.error("Failed to create group:", error);
        alert(error.response?.data?.message || "Failed to create group.");
      } finally {
        setIsCreating(false);
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
        <>
            <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription className="text-slate-400">Give your group a name and invite members.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                        <Avatar className="w-24 h-24 text-3xl">
                            <AvatarImage src={avatarPreview} />
                            <AvatarFallback>{newGroup.name ? newGroup.name.charAt(0).toUpperCase() : <Users className="h-10 w-10"/>}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Camera className="h-8 w-8 text-white" />
                        </div>
                    </div>
                </div>
                <div className="space-y-2"><Label htmlFor="group-name">Group Name</Label><Input id="group-name" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} className="bg-slate-800 border-slate-600" required /></div>
                <div className="space-y-2"><Label htmlFor="group-description">Description</Label><Textarea id="group-description" value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} className="bg-slate-800 border-slate-600" /></div>
                <div className="space-y-2"><Label htmlFor="group-members">Invite Members</Label>
                    <Select
                        id="group-members" isMulti options={connections}
                        value={newGroup.members}
                        onChange={(selected) => setNewGroup({ ...newGroup, members: selected })}
                        styles={customSelectStyles}
                        placeholder="Search for friends to add..."
                        noOptionsMessage={() => 'No connections found'}
                    />
                </div>
                <div className="flex items-center space-x-2"><input type="checkbox" id="is-private" checked={newGroup.isPrivate} onChange={(e) => setNewGroup({ ...newGroup, isPrivate: e.target.checked })} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" /><Label htmlFor="is-private">Make this a Private Group</Label></div>
                <div className="flex justify-end pt-2"><Button type="submit" className="bg-indigo-600 hover:bg-indigo-500" disabled={isCreating}>{isCreating ? "Creating..." : "Create Group"}</Button></div>
            </form>
        </>
    );
};

export default function GroupsPage() {
  const navigate = useNavigate();
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchMyGroups = useCallback(async () => {
    // Ab hum loading ko har baar true nahi karenge taaki background refresh smooth ho
    try {
      const res = await api.get("/groups/my-groups");
      setMyGroups(res.data.groups);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoading(false); // Loading ko bas aakhir mein false karenge
    }
  }, []);

  // <<< --- YEH HAI SABSE ZAROORI BADLAAV --- >>>
  // Yeh useEffect har baar chalega jab GroupsPage component screen par aayega
  useEffect(() => { 
    setLoading(true); // Component load hone par loading dikhao
    fetchMyGroups(); 
  }, [fetchMyGroups]);
  // <<< --- BADLAAV YAHAN KHATAM HOTA HAI --- >>>

  const filteredGroups = myGroups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  if (loading) {
    return (<div className="flex justify-center items-center h-full w-full"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>);
  }
  
  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-gray-400 text-sm mt-1">Your spaces for collaboration.</p>
        </div>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Create Group
        </Button>
      </header>

      {myGroups.length > 0 ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search your groups..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-slate-900/50 border-slate-700 focus:ring-indigo-500 rounded-full h-11"/>
          </div>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
            <div className="space-y-1">
              <AnimatePresence>
                {filteredGroups.map(group => {
                  const { unreadCount } = group;
                  return (
                    <motion.div 
                        key={group._id} 
                        layout 
                        variants={itemVariants} 
                        initial="hidden" 
                        animate="visible" 
                        exit={{ opacity: 0, y: -10 }} 
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 cursor-pointer" 
                        onClick={() => navigate(`/dashboard/group-chat/${group._id}`)}
                    >
                      <Avatar className="h-11 w-11"><AvatarImage src={group.avatar} /><AvatarFallback>{group.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                           <h3 className={`font-semibold truncate text-sm ${unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>{group.name}</h3>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                           <p className={`text-xs ${unreadCount > 0 ? 'text-indigo-300' : 'text-gray-400'} truncate`}>
                             {group.members.length} members
                           </p>
                           {unreadCount > 0 && (
                             <span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                               {unreadCount}
                             </span>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Users className="mx-auto h-16 w-16 text-slate-600" />
            <h2 className="mt-6 text-xl font-semibold text-white">Your Group Hub is Empty</h2>
            <p className="mt-2 text-slate-400">Create a new group to start chatting with your friends.</p>
            <Button className="mt-6 bg-indigo-600 hover:bg-indigo-500" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create Your First Group
            </Button>
          </motion.div>
        </div>
      )}
      
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-[#161b22] border-slate-700 text-white sm:max-w-[425px]">
          <CreateGroupDialog 
            onGroupCreated={() => { 
                setCreateDialogOpen(false); 
                fetchMyGroups(); 
            }} 
            onClose={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}