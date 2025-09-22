// client/src/App.jsx (FINAL - WITH REAL-TIME PROFILE UPDATE DEBUGGING)

import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom"; 
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from 'framer-motion';

// Page Imports
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import GroupsPage from "./pages/GroupsPage";
import StatusPage from "./pages/StatusPage";
import DeveloperPage from "./pages/DeveloperPage";
import GroupChatPage from "./pages/GroupChatPage";
import CallHistoryPage from "./pages/CallHistoryPage";

// Component Imports
import ProtectedRoute from "./components/ProtectedRoute";
import { MessageSquare } from "lucide-react";

// Service & Redux Imports
import { socketService } from "./services/socketService";
import { addMessage, updateSentMessagesStatus, updateSingleMessageInChat  } from "./store/slices/chatSlice";
import { setUserOnline, setUserOffline, updateConnectionLastMessage, incrementUnreadCount, updateConnectionProfile } from "./store/slices/connectionsSlice";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const DashboardWelcome = () => (
    <motion.main 
      key="welcome"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="flex-1 hidden md:flex items-center justify-center relative bg-black/10"
    >
        <div className="text-center text-slate-400 z-10">
            <div className="mx-auto h-28 w-28 text-slate-500 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-slate-700">
              <MessageSquare className="h-14 w-14"/>
            </div>
            <h2 className="mt-6 text-3xl font-light text-white">Nexus</h2>
            <p className="mt-2">Select a chat to start messaging.</p>
        </div>
    </motion.main>
);

function App() {
  const dispatch = useDispatch();
  const { token, isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && token && user) {
      socketService.connect(token);
      
      const handleReceiveMessage = (message) => {
        if (message.sender && message.receiver) {
          const chatId = message.sender._id === user.id ? message.receiver._id : message.sender._id;
    
          if(chatId) {
              dispatch(addMessage({ chatId, message }));
              dispatch(updateConnectionLastMessage({ chatId, message }));
              if (message.sender._id !== user.id && !location.pathname.includes(chatId)) {
                  dispatch(incrementUnreadCount({ chatId }));
              }
          }
        } 
      };

      const handleMessageUpdated = (updatedMessage) => {
                dispatch(updateSingleMessageInChat(updatedMessage));
            };
            socketService.socket.on('message-updated', handleMessageUpdated);
      
      const handleMessagesDelivered = ({ chatPartnerId }) => {
        dispatch(updateSentMessagesStatus({ chatPartnerId, status: 'delivered' }));
      };
      const handleMessagesRead = ({ chatPartnerId }) => {
        dispatch(updateSentMessagesStatus({ chatPartnerId, status: 'read' }));
      };

      const handleProfileUpdate = (updatedUser) => {
        console.log("[Socket Receive] Received 'connection-profile-updated' event for user:", updatedUser);
        dispatch(updateConnectionProfile(updatedUser));
      };
      
      // Setup Listeners
      socketService.onReceiveMessage(handleReceiveMessage);
      socketService.onUserOnline((data) => dispatch(setUserOnline(data)));
      socketService.onUserOffline((data) => dispatch(setUserOffline(data)));
      socketService.socket.on('messages-delivered', handleMessagesDelivered);
      socketService.socket.on('messages-read', handleMessagesRead);
      socketService.socket.on('connection-profile-updated', handleProfileUpdate);

      // Cleanup function
      return () => {
        socketService.off("receive-message", handleReceiveMessage);
        socketService.off("user-online");
        socketService.off("user-offline");
        socketService.socket.off('messages-delivered', handleMessagesDelivered);
        socketService.socket.off('messages-read', handleMessagesRead);
        socketService.socket.off('connection-profile-updated', handleProfileUpdate);
        socketService.socket.off('message-updated', handleMessageUpdated);
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, token, user, dispatch, location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AuthPage />} />
        
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<DashboardWelcome />} />
          <Route path="chat/:userId" element={<ChatPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="group-chat/:groupId" element={<GroupChatPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="about-developer" element={<DeveloperPage />} />
          <Route path="calls" element={<CallHistoryPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;