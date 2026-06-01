import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Mic, Volume2, Video, MessageSquare, Users, ArrowUpRight, CheckCircle2, VideoOff } from 'lucide-react';
import { motion } from 'motion/react';

interface ZootyUser {
  name: string;
  subject: string;
  online: boolean;
  avatar: string;
}

export default function ZootyView() {
  const [trialClaimed, setTrialClaimed] = useState(false);
  const [activeCam, setActiveCam] = useState(true);

  // People profiles for Zooty list
  const zootyUsers: ZootyUser[] = [
    {
      name: 'Natasha Charly',
      subject: 'Mathematics',
      online: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'john Do',
      subject: 'Physics',
      online: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'Shan',
      subject: 'Japanese',
      online: true,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      name: 'M.Samran',
      subject: 'Arabic',
      online: true,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200',
    }
  ];

  // Calendar numbers structure
  const calendarDays = [
    28, 29, 30, 31, 1, 2, 3,
    4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23, 24,
    25, 26, 27, 28, 29, 30, 1
  ];

  return (
    <div id="zooty-theme-container" className="bg-white min-h-screen text-slate-800 font-sans p-4 sm:p-8 md:p-12 lg:p-16 flex items-center justify-center selection:bg-indigo-200">
      
      {/* Absolute floating backdrop circles */}
      <div className="absolute top-[5%] left-[5%] w-72 h-72 bg-indigo-100 opacity-45 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] bg-sky-100 opacity-45 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main White Board Body Card */}
      <div id="zooty-whiteboard" className="bg-[#F8FAFC] rounded-[3rem] w-full max-w-7xl p-6 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden z-10 border border-slate-100">
        
        {/* Interior Navigation Header */}
        <div className="flex items-center justify-between pb-8 border-b border-gray-100 w-full mb-10 overflow-x-auto gap-4">
          
          {/* Menu Drawer Bars */}
          <button className="flex flex-col gap-1.5 p-1 shrink-0 group">
            <span className="w-6 h-0.5 bg-slate-900 rounded-full group-hover:w-4 transition-all"></span>
            <span className="w-4 h-0.5 bg-slate-900 rounded-full group-hover:w-6 transition-all"></span>
            <span className="w-5 h-0.5 bg-slate-900 rounded-full"></span>
          </button>

          {/* Logo badge */}
          <div className="bg-[#594BF5] text-white py-1.5 px-6 rounded-full font-display font-extrabold text-[12px] uppercase tracking-widest text-center shrink-0">
            Guidement
          </div>

        </div>

        {/* Content columns split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Area Content Column */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div>
              <h3 className="font-display font-black text-slate-900 text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] mb-4">
                Find your Best Guide <br />
                with Guidement.
              </h3>
              <p className="text-gray-500 font-sans text-sm md:text-base leading-relaxed max-w-md">
                Empower Yourself Through Knowledge. Anytime. Anywhere
              </p>

              {/* Dynamic Call-to-action */}
              <button 
                onClick={() => setTrialClaimed(true)}
                className="bg-[#121316] text-white font-bold text-sm rounded-full py-4 px-8 inline-flex items-center gap-3 hover:bg-neutral-800 transition duration-200 mt-6 active:scale-98"
              >
                {trialClaimed ? 'Joined Consultation List' : 'Try For Free'}
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* Social Proof Group representation */}
            <div className="flex items-center gap-3 flex-wrap mt-2">
              <div className="flex -space-x-2.5">
                <img className="w-7 h-7 rounded-full border border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" alt="Avatar A" referrerPolicy="no-referrer" />
                <img className="w-7 h-7 rounded-full border border-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" alt="Avatar B" referrerPolicy="no-referrer" />
                <img className="w-7 h-7 rounded-full border border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" alt="Avatar C" referrerPolicy="no-referrer" />
                <img className="w-7 h-7 rounded-full border border-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" alt="Avatar D" referrerPolicy="no-referrer" />
              </div>
              <span className="text-gray-500 text-xs font-semibold tracking-wide">
                About <span className="text-slate-900 font-extrabold">80,000+ Peoples</span> are using this Guidement App.
              </span>
            </div>

            {/* Bottom Row containing Online list and calendar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch mt-3">
              
              {/* Online Users Card */}
              <div className="bg-[#594BF5] text-white p-6 rounded-[2rem] flex flex-col justify-between shadow-xl shadow-indigo-600/10 min-h-[290px]">
                <div className="h-full flex flex-col justify-between gap-4">
                  {zootyUsers.map((user, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-white/10 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border-1 border-white/20 object-cover"
                        />
                        <div>
                          <span className="block font-semibold text-white text-xs leading-none">{user.name}</span>
                          <span className="block text-[10px] text-indigo-200 mt-0.5">{user.subject}</span>
                        </div>
                      </div>

                      {/* Status indicator pill text */}
                      <span className="flex items-center gap-1 text-[8px] font-black tracking-widest uppercase">
                        <span className={`w-1.5 h-1.5 rounded-full ${user.online ? 'bg-green-400 animate-pulse' : 'bg-rose-500'}`}></span>
                        {user.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom September Calendar Card */}
              <div className="bg-[#121316] text-white p-5 rounded-[2rem] flex flex-col justify-between min-h-[290px] shadow-lg">
                <div>
                  {/* Calendar Title header */}
                  <div className="flex items-center justify-between mb-4">
                    <button className="text-gray-400 hover:text-white p-1"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="font-display font-extrabold text-[12px] uppercase text-gray-200 tracking-wider">September 2023</span>
                    <button className="text-gray-400 hover:text-white p-1"><ChevronRight className="w-4 h-4" /></button>
                  </div>

                  {/* Calendar Letters Grid */}
                  <div className="grid grid-cols-7 text-center text-[10px] text-gray-500 font-extrabold uppercase mb-2">
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                    <span>Su</span>
                  </div>

                  {/* Calendar Dates numbers grid */}
                  <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-xs font-semibold relative">
                    
                    {calendarDays.map((value, index) => {
                      // We need to draw a horizontal violet banner connecting date 18 to date 22
                      // Dates matching 18 to 22. In September 23 calendar:
                      // Mo=18 (index 21), Tu=19 (index 22), We=20 (23), Th=21 (24), Fr=22 (25)
                      const isHighlighted = value >= 18 && value <= 22 && index >= 21 && index <= 25;

                      return (
                        <div 
                          key={index} 
                          className={`
                            py-1.5 relative flex items-center justify-center z-10 cursor-pointer text-[11px]
                            ${index < 4 || index > 33 ? 'text-gray-600' : 'text-gray-300'}
                            ${isHighlighted ? 'text-white font-extrabold' : ''}
                          `}
                        >
                          {/* Span banner element backdrop behind highlighted block */}
                          {isHighlighted && (
                            <div className={`
                              absolute inset-y-0.5 bg-[#4F46E5] z-[-1]
                              ${value === 18 ? 'left-0.5 rounded-l-full' : 'left-0'}
                              ${value === 22 ? 'right-0.5 rounded-r-full' : 'right-0'}
                            `}></div>
                          )}
                          <span>{value}</span>
                        </div>
                      );
                    })}

                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Video Feed/Camera Cards Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Top Video Camera Box */}
            <div className="rounded-3xl overflow-hidden bg-[#F1F3F9] shadow-lg relative aspect-[4/3] flex items-center justify-center border border-gray-100">
              <img 
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=300"
                alt="Zainab Akhtar Feed"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-3xl"
              />
              <span className="bg-white/80 backdrop-blur-md text-stone-800 text-[10px] font-black tracking-wider uppercase py-1.5 px-4 rounded-full absolute top-4 right-4 shadow-sm z-20">
                Zainab Akhtar
              </span>
            </div>

            {/* Bottom Video Camera Box */}
            <div className="rounded-3xl overflow-hidden bg-neutral-200 shadow-lg relative aspect-[4/3] flex items-center justify-center border border-gray-100">
              {activeCam ? (
                <img 
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400&h=300"
                  alt="Zaryab Ahmed Feed"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                  <VideoOff className="w-8 h-8" />
                  <span className="text-xs font-bold font-display">Your camera is off</span>
                </div>
              )}

              {/* Floating micro webcam controller block at bottom center */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 border border-white/20 p-2 rounded-full flex items-center justify-center gap-2.5 shadow-xl z-20">
                <button 
                  onClick={() => alert("Microphone toggled")}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-[#594BF5] hover:text-white text-slate-800 flex items-center justify-center transition p-2 shrink-0 cursor-pointer shadow-sm"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 shrink-0"></div>
                <button 
                  onClick={() => alert("Speaker toggled")}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-[#594BF5] hover:text-white text-slate-800 flex items-center justify-center transition p-2 shrink-0 cursor-pointer shadow-sm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 shrink-0"></div>
                <button 
                  onClick={() => setActiveCam(!activeCam)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition p-2 shrink-0 cursor-pointer shadow-sm ${activeCam ? 'bg-neutral-100 text-slate-800 hover:bg-neutral-200' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                  <Video className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 shrink-0"></div>
                <button 
                  onClick={() => alert("Chat sidebar toggled")}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-[#594BF5] hover:text-white text-slate-800 flex items-center justify-center transition p-2 shrink-0 cursor-pointer shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 shrink-0"></div>
                <button 
                  onClick={() => alert("Participants list toggled")}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-[#594BF5] hover:text-white text-slate-800 flex items-center justify-center transition p-2 shrink-0 cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Trial modal alert */}
      {trialClaimed && (
        <div className="fixed bottom-6 right-6 bg-[#121316] text-white border border-white/10 p-5 rounded-2xl shadow-2xl z-50 flex items-center gap-4 max-w-sm animate-bounce">
          <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
          <div>
            <span className="block font-bold text-sm">Welcome aboard Guidement!</span>
            <span className="block text-xs text-gray-400 mt-0.5">Your complimentary consult schedule request has been submitted successfully.</span>
          </div>
        </div>
      )}

    </div>
  );
}
