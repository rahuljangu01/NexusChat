// client/src/pages/DeveloperPage.jsx (FINAL - Compact Layout & Reduced Size)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Github, Linkedin, Mail, Code, ExternalLink, Bot, MessageSquare, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import "./DeveloperPage.css"; // CSS file wahi rahegi

// Developer details object (unchanged)
const developer = {
  name: "Rahul Jangu",
  title: "Full-Stack Developer",
  education: "MCA Student at Lovely Professional University",
  avatarUrl: "/logo.png",
  bio: "Passionate and creative developer with a love for building intuitive and dynamic web applications. This Nexus chat app is a project to demonstrate skills in real-time communication technologies and modern UI design. I thrive on solving complex problems and creating seamless user experiences.",
  skills: {
    "Frontend": ["React", "Redux", "JavaScript", "HTML5 & CSS3", "Tailwind CSS", "Framer Motion"],
    "Backend": ["Node.js", "Express", "REST APIs"],
    "Database": ["MongoDB"],
    "Tools & Others": ["Socket.io", "Git", "C++", "Postman", "VS Code"]
  },
  projects: [
    { name: "Nexus Chat App", description: "The very app you're using! A real-time chat application.", link: "https://github.com/rahuljangu", icon: MessageSquare },
    { name: "Another Cool Project", description: "Describe your other amazing project here.", link: "https://github.com/rahuljangu", icon: Bot },
  ],
  links: {
    github: "https://github.com/rahuljangu",
    linkedin: "https://linkedin.com/in/rahul-jangu-a3224724b",
    email: "mailto:rahuljanghu82@gmail.com",
  }
};

// AnimatedText component (unchanged)
const AnimatedText = ({ text, el: Wrapper = 'p', className }) => {
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({ opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 * i }, }),
  };
  const child = {
    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 12, stiffness: 200 } },
    hidden: { opacity: 0, y: 20 },
  };
  return (
    <Wrapper className={className}>
      <motion.span variants={container} initial="hidden" animate="visible" aria-hidden>
        {text.split("").map((char, index) => (
          <motion.span variants={child} key={index}>{char === " " ? "\u00A0" : char}</motion.span>
        ))}
      </motion.span>
    </Wrapper>
  );
};

const DeveloperPage = () => {
  const navigate = useNavigate();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(5px)' },
    visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] } }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300 p-4 sm:p-6 lg:p-8 flex flex-col items-center custom-scrollbar overflow-y-auto">
      <div className="w-full max-w-6xl z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:bg-slate-800 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to App
          </Button>
        </motion.div>
        
        {/* <<< --- BADLAAV YAHAN HAI: Gap kam kiya gaya hai --- >>> */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            
            <motion.div variants={itemVariants} className="lg:col-span-1">
              {/* <<< --- BADLAAV YAHAN HAI: Padding kam ki gayi hai --- >>> */}
              <div className="card-glow bg-[#161b22]/70 backdrop-blur-lg rounded-2xl p-6 h-full">
                  <div className="flex flex-col items-center text-center">
                      {/* <<< --- BADLAAV YAHAN HAI: Avatar aur Font size chota kiya gaya hai --- >>> */}
                      <Avatar className="h-32 w-32 mb-4 border-4 border-indigo-500/50"><AvatarImage src={developer.avatarUrl} alt={developer.name} /><AvatarFallback className="text-5xl bg-slate-700">{developer.name.charAt(0)}</AvatarFallback></Avatar>
                      <AnimatedText text={developer.name} el="h1" className="text-3xl font-bold text-white tracking-wider" />
                      <AnimatedText text={developer.title} el="h2" className="text-md text-indigo-400 font-semibold tracking-wide mt-1" />
                      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 1}} className="flex items-center gap-2 text-slate-400 mt-2 text-sm"><GraduationCap size={16}/> <p>{developer.education}</p></motion.div>
                      <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 1.2}} className="flex justify-center gap-4 mt-6">
                          {[
                            { href: developer.links.github, icon: Github }, { href: developer.links.linkedin, icon: Linkedin }, { href: developer.links.email, icon: Mail }
                          ].map((link, i) => (
                            <motion.a key={i} href={link.href} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.15, y: -3 }} transition={{ type: 'spring', stiffness: 300 }}>
                              <Button variant="outline" size="icon" className="bg-transparent border-slate-700 hover:bg-slate-800 hover:border-indigo-500"><link.icon /></Button>
                            </motion.a>
                          ))}
                      </motion.div>
                  </div>
              </div>
            </motion.div>

            {/* <<< --- BADLAAV YAHAN HAI: Right side ka poora layout badal diya gaya hai --- >>> */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="card-glow bg-[#161b22]/70 backdrop-blur-lg rounded-2xl p-6 md:col-span-2">
                  <h3 className="text-xl font-semibold text-white mb-4">About Me</h3>
                  <p className="text-slate-400 leading-relaxed">{developer.bio}</p>
              </motion.div>

              <motion.div variants={itemVariants} className="card-glow bg-[#161b22]/70 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center"><Code className="h-5 w-5 mr-2 text-cyan-400"/>Skills & Technologies</h3>
                  <div className="space-y-4">
                    {Object.entries(developer.skills).map(([category, skills]) => (
                      <div key={category}>
                        <h4 className="font-semibold text-indigo-300 mb-2">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.map(skill => (
                            <motion.div key={skill} whileHover={{ scale: 1.1 }}>
                              <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600 px-3 py-1 text-sm cursor-pointer">{skill}</Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
              </motion.div>

              <motion.div variants={itemVariants} className="card-glow bg-[#161b22]/70 backdrop-blur-lg rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Other Projects</h3>
                  <div className="space-y-4">
                      {developer.projects.map(project => (
                          <a key={project.name} href={project.link} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                              <project.icon className="h-8 w-8 text-indigo-400 flex-shrink-0"/>
                              <div>
                                  <h4 className="font-semibold text-white">{project.name}</h4>
                                  <p className="text-sm text-slate-400">{project.description}</p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-slate-500 ml-auto group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200"/>
                          </a>
                      ))}
                  </div>
              </motion.div>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DeveloperPage;