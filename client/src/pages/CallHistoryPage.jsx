// client/src/pages/CallHistoryPage.jsx (COMPACT UI - FULL CODE)

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { getCallHistory, deleteCallRecord, clearCallHistory } from "../utils/api";
import { format } from "date-fns";
import { PhoneMissed, ArrowUpRight, ArrowDownLeft, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import "./Dashboard.css";

const CallHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);
  const { user: currentUser } = useSelector((state) => state.auth);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getCallHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch call history", error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchHistory().finally(() => setLoading(false));
  }, [fetchHistory]);

  const handleDelete = async (callId) => {
    try {
      await deleteCallRecord(callId);
      await fetchHistory();
    } catch (error) {
      console.error("Failed to delete call record", error);
      alert("Could not delete call record.");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearCallHistory();
      await fetchHistory();
      setClearConfirmOpen(false);
    } catch (error) {
      console.error("Failed to clear call history", error);
      alert("Could not clear call history.");
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Call Log</h1>
          <p className="text-gray-400 text-sm mt-1">Your recent call history.</p>
        </div>
        {history.length > 0 && (
          <Dialog open={isClearConfirmOpen} onOpenChange={setClearConfirmOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">Clear All</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader><DialogTitle>Clear Call History</DialogTitle><DialogDescription>Are you sure you want to delete all your call records? This action cannot be undone.</DialogDescription></DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setClearConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleClearAll}>Clear All</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PhoneMissed className="h-16 w-16 text-slate-600" />
            <h2 className="mt-4 text-lg font-semibold text-white">No Call History</h2>
            <p className="text-slate-400 text-sm">You haven't made or received any calls yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map(call => {
              if (call.callType === 'group' && call.group) {
                const callerName = call.caller?._id === currentUser.id ? 'You' : call.caller?.name || 'Someone';
                return (
                  <div key={call._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarImage src={call.group.avatar} /><AvatarFallback>{call.group.name.charAt(0)}</AvatarFallback></Avatar>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{call.group.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Users className="h-3 w-3 text-green-400" />
                          <span>Group Call by {callerName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{format(new Date(call.createdAt), 'p, MMM d')}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => handleDelete(call._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              }

              if (call.callType === 'one-on-one' && call.caller && call.receiver) {
                const otherUser = call.caller._id === currentUser.id ? call.receiver : call.caller;
                const isOutgoing = call.caller._id === currentUser.id;
                
                return (
                  <div key={call._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarImage src={otherUser.profilePhotoUrl} /><AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback></Avatar>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{otherUser.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          {isOutgoing ? <ArrowUpRight className="h-3 w-3 text-green-400" /> : <ArrowDownLeft className={`h-3 w-3 ${call.status === 'missed' ? 'text-red-400' : 'text-blue-400'}`} />}
                          <span>{call.status === 'missed' ? 'Missed' : (isOutgoing ? 'Outgoing' : 'Incoming')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{format(new Date(call.createdAt), 'p, MMM d')}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => handleDelete(call._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              }
              
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistoryPage;