import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginUser, clearError } from "../store/slices/authSlice";
import { sendVerificationCode, verifyAndRegisterUser, requestPasswordReset } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import "./AuthPage.css";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";

const AuthPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("login");
  const [step, setStep] = useState(1);
  const [apiError, setApiError] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "", email: "", collegeId: "", password: "", department: "", year: "", code: ""
  });

  // States for Forgot Password Dialog
  const [isForgotDialogOpen, setIsForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);

  useEffect(() => { 
    if (isAuthenticated) {
      navigate("/dashboard"); 
    }
  }, [isAuthenticated, navigate]);

  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });

  const handleLoginSubmit = (e) => { 
    e.preventDefault(); 
    setApiError("");
    dispatch(clearError());
    dispatch(loginUser(loginData)); 
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setApiError("");
    dispatch(clearError());
    if (!registerData.email.endsWith('@lpu.in')) {
      setApiError("Please use your official @lpu.in email address.");
      return;
    }
    setIsSendingCode(true);
    try {
      await sendVerificationCode(registerData.email);
      setStep(2);
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to send code. Please check the email.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    dispatch(clearError());
    try {
      dispatch({ type: 'auth/register/pending' });
      const { token, user } = await verifyAndRegisterUser(registerData);
      localStorage.setItem("token", token);
      dispatch({ type: 'auth/register/fulfilled', payload: { token, user } });
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Registration failed.";
      setApiError(errorMessage);
      dispatch({ type: 'auth/register/rejected', payload: errorMessage });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMessage("");
    setIsSendingLink(true);
    try {
        const res = await requestPasswordReset(forgotEmail);
        setForgotMessage(res.message);
    } catch (err) {
        setForgotMessage(err.response?.data?.message || "An error occurred.");
    } finally {
        setIsSendingLink(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setStep(1);
    setApiError("");
    dispatch(clearError());
  };
  
  const itemVariants = { 
    hidden: { opacity: 0, y: 20 }, 
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } 
  };
  
  const errorVariants = {
      initial: { opacity: 0, y: -10 },
      animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } },
      exit: { opacity: 0 },
      shake: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } }
  };
  
  const inputStyles = "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      <div className="aurora-background">
        <div className="aurora-shape aurora-shape-1"></div>
        <div className="aurora-shape aurora-shape-2"></div>
      </div>
      <motion.div 
        layout 
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }} 
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-10"
      >
        <div className="p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }} 
            className="text-center mb-8"
          >
            <img src="/logo.png" alt="Nexus Logo" className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Welcome to Nexus</h1>
            <p className="text-slate-400">Connect with your college peers.</p>
          </motion.div>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700 h-12">
              <TabsTrigger value="login" className="text-base font-semibold">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-base font-semibold">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <motion.form 
                key="login" 
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }} 
                initial="hidden" 
                animate="visible" 
                onSubmit={handleLoginSubmit} 
                className="space-y-4 pt-6"
              >
                <motion.div variants={itemVariants}>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" value={loginData.email} onChange={handleLoginChange} required className={inputStyles} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" value={loginData.password} onChange={handleLoginChange} required className={inputStyles} />
                </motion.div>
                <motion.div variants={itemVariants} className="flex justify-end">
                  <Button variant="link" type="button" onClick={() => { setIsForgotDialogOpen(true); setForgotMessage(''); setForgotEmail(''); }} className="px-0 text-sm text-indigo-400 h-auto py-0">
                    Forgot Password?
                  </Button>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </motion.div>
              </motion.form>
            </TabsContent>
            <TabsContent value="register">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.form 
                    key="step1" 
                    onSubmit={handleSendCode} 
                    className="space-y-3 pt-6" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                  >
                    <motion.div variants={itemVariants}><Label htmlFor="register-name">Full Name</Label><Input id="register-name" name="name" value={registerData.name} onChange={handleRegisterChange} required className={inputStyles} /></motion.div>
                    <motion.div variants={itemVariants}><Label htmlFor="register-email">College Email (@lpu.in)</Label><Input id="register-email" name="email" type="email" value={registerData.email} onChange={handleRegisterChange} required className={inputStyles} /></motion.div>
                    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                      <div><Label htmlFor="register-collegeId">College ID</Label><Input id="register-collegeId" name="collegeId" value={registerData.collegeId} onChange={handleRegisterChange} required className={inputStyles} /></div>
                      <div><Label htmlFor="register-year">Year</Label><Input id="register-year" name="year" type="number" min="1" max="5" value={registerData.year} onChange={handleRegisterChange} required className={inputStyles} /></div>
                    </motion.div>
                    <motion.div variants={itemVariants}><Label htmlFor="register-department">Department</Label><Input id="register-department" name="department" value={registerData.department} onChange={handleRegisterChange} required className={inputStyles} /></motion.div>
                    <motion.div variants={itemVariants}><Label htmlFor="register-password">Password</Label><Input id="register-password" name="password" type="password" value={registerData.password} onChange={handleRegisterChange} required className={inputStyles} /></motion.div>
                    <motion.div variants={itemVariants}>
                      <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSendingCode}>
                        {isSendingCode ? "Sending Code..." : "Send Verification Code"}
                      </Button>
                    </motion.div>
                  </motion.form>
                )}
                {step === 2 && (
                  <motion.form 
                    key="step2" 
                    onSubmit={handleRegisterSubmit} 
                    className="space-y-4 pt-6" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-center text-sm text-slate-300">A 6-digit code has been sent to <span className="font-bold">{registerData.email}</span>.</p>
                    <div>
                      <Label htmlFor="register-code">Verification Code</Label>
                      <Input id="register-code" name="code" value={registerData.code} onChange={handleRegisterChange} required maxLength={6} className={`${inputStyles} text-center text-lg tracking-[0.5em]`}/>
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
                      {loading ? "Verifying..." : "Verify & Create Account"}
                    </Button>
                    <Button variant="link" size="sm" onClick={() => setStep(1)} className="w-full">
                      Back to Details
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </TabsContent>
            <AnimatePresence>
                {(error || apiError) && (
                    <motion.p 
                        variants={errorVariants} 
                        initial="initial" 
                        animate={["animate", "shake"]} 
                        exit="exit" 
                        className="text-red-400 text-sm mt-4 text-center"
                    >
                        {error || apiError}
                    </motion.p>
                )}
            </AnimatePresence>
          </Tabs>
        </div>
      </motion.div>

      <Dialog open={isForgotDialogOpen} onOpenChange={setIsForgotDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                  <DialogTitle>Reset Your Password</DialogTitle>
                  <DialogDescription>Enter your @lpu.in email to receive a password reset link.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
                  <div>
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className={inputStyles} />
                  </div>
                  {forgotMessage && <p className={`text-sm text-center ${forgotMessage.includes('error') ? 'text-red-400' : 'text-green-400'}`}>{forgotMessage}</p>}
                  <Button type="submit" className="w-full" disabled={isSendingLink}>
                      {isSendingLink ? "Sending Link..." : "Send Reset Link"}
                  </Button>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;