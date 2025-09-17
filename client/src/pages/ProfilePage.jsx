// client/src/pages/ProfilePage.jsx (FINAL - COMPACT UI)

import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Camera, ArrowLeft, Edit, KeyRound, LogOut } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { updateUserProfile, uploadAndUpdateProfilePhoto, logout } from "../store/slices/authSlice";
import { changePassword } from "../utils/api";
import { motion } from "framer-motion";
import "./ProfilePage.css";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../components/ui/dialog";

const ChangePasswordDialog = ({ onClose }) => {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (passwords.newPassword.length < 6) { return setError("New password must be at least 6 characters."); }
    if (passwords.newPassword !== passwords.confirmPassword) { return setError("New passwords do not match."); }
    setIsChanging(true);
    try {
      const res = await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setSuccess(res.message);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => onClose(), 2000); // Close dialog after 2 seconds on success
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DialogContent className="bg-[#161b22] border-slate-700 text-white">
      <DialogHeader>
        <DialogTitle>Change Your Password</DialogTitle>
        <DialogDescription>Enter your current password and a new password.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="space-y-1"><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" name="currentPassword" type="password" value={passwords.currentPassword} onChange={handleChange} required className="bg-slate-800 border-slate-600" /></div>
        <div className="space-y-1"><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" name="newPassword" type="password" value={passwords.newPassword} onChange={handleChange} required className="bg-slate-800 border-slate-600" /></div>
        <div className="space-y-1"><Label htmlFor="confirmPassword">Confirm New Password</Label><Input id="confirmPassword" name="confirmPassword" type="password" value={passwords.confirmPassword} onChange={handleChange} required className="bg-slate-800 border-slate-600" /></div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <div className="flex justify-end pt-2"><Button type="submit" disabled={isChanging} className="bg-indigo-600 hover:bg-indigo-500">{isChanging ? "Changing..." : "Change Password"}</Button></div>
      </form>
    </DialogContent>
  );
};

const ProfilePage = () => {
  const { user, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", department: "", year: "", interests: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);


  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        department: user.department || "",
        year: user.year || "",
        interests: user.interests?.join(", ") || "",
      });
    }
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current.click();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await dispatch(uploadAndUpdateProfilePhoto(file)).unwrap();
      alert("Profile photo updated successfully!");
    } catch (error) {
      alert(error || "Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      const interestsArray = formData.interests.split(',').map(item => item.trim()).filter(Boolean);
      await dispatch(updateUserProfile({ ...formData, interests: interestsArray })).unwrap();
      setEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert(error || "Failed to update profile.");
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({ name: user.name, department: user.department, year: user.year, interests: user.interests?.join(", ") || "" });
    }
    setEditing(false);
  };
  
  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0d1117]"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="h-full w-full profile-gradient-background text-gray-200 p-4 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:bg-slate-800 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <div className="flex flex-col gap-4">
            {/* <<< --- TOP PROFILE CARD --- >>> */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="relative group flex-shrink-0">
                    <Avatar className="w-24 h-24 text-4xl border-4 border-slate-700">
                        <AvatarImage src={user.profilePhotoUrl} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div onClick={handleAvatarClick} className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {isUploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <Camera className="h-8 w-8 text-white" />}
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <h1 className="text-2xl font-bold text-white mt-3">{user.name}</h1>
                <p className="text-sm text-indigo-400">{user.email}</p>
                <div className="w-full border-t border-slate-700 my-4"></div>
                <div className="text-left w-full space-y-1 text-sm">
                    <p><strong className="text-slate-400 font-medium">Department:</strong> {user.department}</p>
                    <p><strong className="text-slate-400 font-medium">Year:</strong> {user.year}</p>
                </div>
            </motion.div>

            {/* <<< --- PROFILE DETAILS CARD --- >>> */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Profile Details</h2>
                {!editing && (
                  <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700">
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <form onSubmit={handleSaveChanges} className="space-y-4 text-sm">
                <div><Label htmlFor="name" className="text-slate-400">Name</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={!editing} className="h-9 bg-slate-800 border-slate-600 focus:ring-indigo-500 input-disabled-style" /></div>
                <div><Label htmlFor="department" className="text-slate-400">Department</Label><Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} disabled={!editing} className="h-9 bg-slate-800 border-slate-600 focus:ring-indigo-500 input-disabled-style"/></div>
                <div><Label htmlFor="year" className="text-slate-400">Year of Study</Label><Input id="year" type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} disabled={!editing} className="h-9 bg-slate-800 border-slate-600 focus:ring-indigo-500 input-disabled-style"/></div>
                <div><Label htmlFor="interests" className="text-slate-400">Interests (comma separated)</Label><Input id="interests" value={formData.interests} onChange={(e) => setFormData({ ...formData, interests: e.target.value })} disabled={!editing} placeholder="e.g., Programming, Music..." className="h-9 bg-slate-800 border-slate-600 focus:ring-indigo-500 input-disabled-style"/></div>
                {editing && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" size="sm" variant="ghost" onClick={handleCancel} className="hover:bg-slate-700">Cancel</Button>
                    <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                )}
              </form>
            </motion.div>

            {/* <<< --- SECURITY & ACCOUNT CARD --- >>> */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Security & Account</h2>
              <div className="flex flex-wrap gap-3">
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="bg-transparent border-slate-600 hover:bg-slate-800 hover:border-indigo-500"><KeyRound className="h-4 w-4 mr-2" />Change Password</Button></DialogTrigger>
                    <ChangePasswordDialog onClose={() => setIsPasswordDialogOpen(false)} />
                </Dialog>
                <Dialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="destructive" className="bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-red-300"><LogOut className="h-4 w-4 mr-2" />Logout</Button></DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                        <DialogHeader><DialogTitle>Confirm Logout</DialogTitle><DialogDescription className="pt-2">Are you sure you want to log out?</DialogDescription></DialogHeader>
                        <DialogFooter className="mt-4"><Button variant="ghost" onClick={() => setIsLogoutConfirmOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleLogout}>Logout</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
              </div>
            </motion.div>
        </div>
        
        <div className="h-4"></div>
      </div>
    </div>
  );
};

export default ProfilePage;