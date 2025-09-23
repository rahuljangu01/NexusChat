// client/src/pages/Dashboard.jsx (FINAL - With All Imports and "More" Menu)

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link, useLocation, Outlet } from "react-router-dom";
import { format } from "date-fns";
// <<< --- ICONS ARE IMPORTED HERE --- >>>
import { Search, UserPlus, LogOut, LayoutDashboard, Phone, CircleDashed, Users, Code, AlertTriangle, UserCheck, MoreVertical, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { logout } from "../store/slices/authSlice";
import { fetchConnections } from "../store/slices/connectionsSlice";
import "./Dashboard.css";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
// <<< --- DROPDOWNMENU IS IMPORTED HERE --- >>>
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import UserListItem from "../components/UserListItem";
import { searchUsers, sendConnectionRequest, acceptConnectionRequest, rejectConnectionRequest, removeConnection } from "../utils/api";

const FindPeersDialog = ({ user, connections, onAction }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
  
    const handleSearch = async (e) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setLoadingSearch(true);
      try {
        const results = await searchUsers(searchQuery);
        const connectedAndPendingUserIds = [
            ...connections.map(c => c.users.find(u => u._id !== user.id)?._id),
            ...onAction.pendingRequests.map(req => req.requestedBy._id)
        ];
        setSearchResults(results.filter(student => student._id !== user.id && !connectedAndPendingUserIds.includes(student._id)));
      } catch (error) { 
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally { setLoadingSearch(false); }
    };
  
    return (
      <DialogContent className="bg-slate-900/80 backdrop-blur-md border-slate-700 text-white sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Find New Peers</DialogTitle><DialogDescription>Search for students to start a new conversation.</DialogDescription></DialogHeader>
        <form onSubmit={handleSearch} className="flex gap-2 py-4">
          <div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><Input placeholder="Search by name, department, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-slate-800 border-slate-600 focus:ring-indigo-500"/></div>
          <Button type="submit" disabled={loadingSearch} className="bg-indigo-600 hover:bg-indigo-500 text-white">{loadingSearch ? "..." : "Search"}</Button>
        </form>
        <div className="mt-2 space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence>{searchResults.map((student) => (<UserListItem key={student._id} user={student} status="search_result" onAction={onAction.handleAction} />))}</AnimatePresence>
           {!loadingSearch && searchResults.length === 0 && searchQuery && (<p className="text-sm text-slate-500 text-center py-4">No results found.</p>)}
        </div>
      </DialogContent>
    );
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { connections, pendingRequests } = useSelector((state) => state.connections);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [chatSearch, setChatSearch] = useState("");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isRequestsDialogOpen, setRequestsDialogOpen] = useState(false);

  const isDashboardHome = location.pathname === '/dashboard';

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchConnections(user.id));
    }
  }, [user, dispatch]);

  const handleAction = async (action, id) => {
    try {
      let message = "";
      switch (action) {
        case 'connect': await sendConnectionRequest(id); message = "Request Sent!"; break;
        case 'accept': await acceptConnectionRequest(id); message = "Request Accepted!"; break;
        case 'reject': await rejectConnectionRequest(id); message = "Request Rejected."; break;
        case 'unfriend': if(window.confirm("Are you sure?")) { await removeConnection(id); message = "Connection removed."; } break;
        default: return;
      }
      if (message) alert(message);
      setRequestsDialogOpen(false);
      dispatch(fetchConnections(user.id));
    } catch (error) {
      alert(error.response?.data?.message || `Failed to perform action.`);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };
  
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div></div>;
  }
  
  const sortedAndFilteredConnections = [...connections]
    .filter(conn => {
        const otherUser = conn.users.find(u => u && u._id !== user.id);
        return otherUser && otherUser.name.toLowerCase().includes(chatSearch.toLowerCase());
    })
    .sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt || 0);
        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt || 0);
        return timeB - timeA;
    });

  const navItems = [
    { path: '/dashboard', label: 'Chats', icon: LayoutDashboard },
    { path: '/dashboard/calls', label: 'Calls', icon: Phone },
    { path: '/dashboard/status', label: 'Status', icon: CircleDashed },
    { path: '/dashboard/groups', label: 'Groups', icon: Users },
  ];
  
  const isLinkActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/chat');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen w-screen flex text-gray-200 bg-[#0d1117] overflow-hidden">
      <aside className="hidden md:flex w-20 bg-[#0d1117] p-4 flex-col items-center justify-between z-20 flex-shrink-0">
        <div>
          <Link to="/dashboard" className="block mb-10"><img src="/logo.png" alt="Nexus Logo" className="h-10 w-10 transition-transform hover:scale-110"/></Link>
          <TooltipProvider>
            <nav className="space-y-4">
              {navItems.map(item => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link to={item.path} className={`block p-3 rounded-xl transition-colors duration-200 ${isLinkActive(item.path) ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}>
                      <item.icon className="h-6 w-6"/>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </TooltipProvider>
        </div>
        <div className="flex flex-col items-center gap-4">
            <Dialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
              <TooltipProvider><Tooltip>
                <TooltipTrigger asChild><DialogTrigger asChild><Button variant="ghost" size="icon" className="text-gray-400 hover:bg-slate-800 hover:text-white h-10 w-10"><LogOut className="h-5 w-5"/></Button></DialogTrigger></TooltipTrigger>
                <TooltipContent side="right"><p>Logout</p></TooltipContent>
              </Tooltip></TooltipProvider>
              <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-yellow-400" />Confirm Logout</DialogTitle><DialogDescription className="pt-2">Are you sure you want to log out?</DialogDescription></DialogHeader>
                <DialogFooter className="mt-4"><Button variant="ghost" onClick={() => setIsLogoutConfirmOpen(false)}>Cancel</Button><Button className="bg-red-600 hover:bg-red-500 text-white" onClick={handleLogout}>Logout</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Avatar className="cursor-pointer h-10 w-10" onClick={() => navigate('/dashboard/profile')}><AvatarImage src={user.profilePhotoUrl} /><AvatarFallback>{user.name?.charAt(0)}</AvatarFallback></Avatar>
        </div>
      </aside>

      <div className={`
          bg-[#161b22] w-full md:w-[320px] md:flex-shrink-0 border-r border-slate-800 flex-col
          ${isDashboardHome ? 'flex' : 'hidden md:flex'}
      `}>
          <header className="p-4 h-20 flex-shrink-0 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Nexus Logo" className="h-8 w-8" />
                  <h1 className="font-bold text-2xl text-white">Nexus</h1>
              </div>
              <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-700 hover:text-white"><UserPlus className="h-5 w-5"/></Button></DialogTrigger><FindPeersDialog user={user} connections={connections} onAction={{handleAction, pendingRequests}} /></Dialog>
          </header>
          
          <div className="p-4 border-b border-slate-800">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/><Input placeholder="Search chats..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} className="pl-10 bg-slate-800 border-slate-700 focus:ring-indigo-500 rounded-full" /></div>
          </div>

          <AnimatePresence>
              {pendingRequests.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 border-b border-slate-800">
                      <Dialog open={isRequestsDialogOpen} onOpenChange={setRequestsDialogOpen}>
                          <DialogTrigger asChild>
                              <div className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-800/50">
                                  <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center"><UserCheck className="h-6 w-6 text-white"/></div><div><h3 className="font-semibold text-white">Connection Requests</h3><p className="text-sm text-slate-400">{pendingRequests.length} new request(s)</p></div></div>
                              </div>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-slate-700 text-white"><DialogHeader><DialogTitle>Connection Requests</DialogTitle></DialogHeader><div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar -mr-4 pr-4">{pendingRequests.map(req => (<UserListItem key={req._id} user={req.requestedBy} status="pending_received" connectionId={req._id} onAction={handleAction} />))}</div></DialogContent>
                      </Dialog>
                  </motion.div>
              )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-2">
              <h3 className="text-xs font-semibold text-indigo-400 mb-2 px-2 uppercase tracking-wider">Messages</h3>
              <AnimatePresence>
                  {sortedAndFilteredConnections.map(conn => {
                    const otherUser = conn.users.find(u => u && u._id !== user.id);
                    if (!otherUser) return null;
                    const { lastMessage, unreadCount } = conn;
                    return (
                      <motion.div layout key={conn._id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => navigate(`/dashboard/chat/${otherUser._id}`)} className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 ${location.pathname.includes(otherUser._id) ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'}`}>
                        <div className="relative"><Avatar className="h-12 w-12"><AvatarImage src={otherUser.profilePhotoUrl}/><AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback></Avatar><span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${otherUser.isOnline ? 'bg-green-400' : 'bg-slate-500'} ring-2 ring-[#161b22]`}></span></div>
                        <div className="flex-1 ml-3 overflow-hidden">
                          <div className="flex justify-between items-center"><h3 className={`font-semibold truncate ${unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>{otherUser.name}</h3>{lastMessage && <p className="text-xs text-slate-400 flex-shrink-0">{format(new Date(lastMessage.createdAt), 'p')}</p>}</div>
                          <div className="flex justify-between items-center mt-1"><p className={`text-sm ${unreadCount > 0 ? 'text-indigo-300 font-semibold' : 'text-gray-400'} truncate`}>{lastMessage?.content || (conn.status === 'pending' ? 'Request pending...' : 'No messages yet...')}</p>{unreadCount > 0 && (<span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">{unreadCount}</span>)}</div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </div>
      </div>
      
      <main className={`
          flex-1 flex-col relative bg-[#0d1117]
          pb-16 md:pb-0
          ${isDashboardHome ? 'hidden md:flex' : 'flex'}
      `}>
          <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#161b22] border-t border-slate-800 flex justify-around items-center h-16 z-30">
        {navItems.map(item => (
            <Link key={item.label} to={item.path} className={`flex flex-col items-center justify-center gap-1 p-1 w-full h-full ${isLinkActive(item.path) ? 'text-indigo-400' : 'text-slate-400'}`}>
                <item.icon className="h-6 w-6"/>
                <span className="text-xs">{item.label}</span>
            </Link>
        ))}
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className={`flex flex-col items-center justify-center gap-1 p-1 w-full h-full cursor-pointer ${isLinkActive('/dashboard/profile') || location.pathname.startsWith('/dashboard/about-developer') ? 'text-indigo-400' : 'text-slate-400'}`}>
                    <MoreVertical className="h-6 w-6" />
                    <span className="text-xs">More</span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mb-2 w-48 bg-slate-800 border-slate-700 text-white" side="top" align="end">
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/about-developer')}>
                    <Code className="mr-2 h-4 w-4" />
                    <span>About Developer</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem className="text-red-400" onClick={() => setIsLogoutConfirmOpen(true)}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
};
      
export default Dashboard;