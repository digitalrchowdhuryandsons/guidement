import React, { useState } from 'react';
import { User, Sparkles, Code, Volume2, HelpCircle, Palette, ArrowRight, ArrowUpRight, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

export default function KnowledgeInvestView() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Category cards data
  const categories = [
    {
      id: 'ui-ux',
      title: 'UI/UX Design',
      bg: 'bg-gradient-to-br from-[#FE5C8F] to-[#E01B5E]',
      shadow: 'shadow-[#FE5C8F]/10',
      icon: Palette,
    },
    {
      id: 'web-dev',
      title: 'Web Development',
      bg: 'bg-gradient-to-br from-[#F5A623] to-[#D64F00]',
      shadow: 'shadow-[#F5A623]/10',
      icon: Code,
    },
    {
      id: 'digital-marketing',
      title: 'Digital Marketing',
      bg: 'bg-gradient-to-br from-[#40C4FF] to-[#0070C0]',
      shadow: 'shadow-[#40C4FF]/10',
      icon: Volume2,
    },
    {
      id: 'practical-learning',
      title: 'Practical Learning',
      bg: 'bg-gradient-to-br from-[#9F80FE] to-[#5C3CC2]',
      shadow: 'shadow-[#9F80FE]/10',
      icon: GraduationCap,
    }
  ];

  return (
    <div id="knowledge-invest-root" className="relative bg-white min-h-screen text-slate-900 overflow-hidden font-sans py-16 px-6 sm:px-10 md:px-16 lg:px-28 selection:bg-amber-400 selection:text-black">
      {/* Decorative Orbs of light / Radial gradients */}
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-15%] w-[450px] h-[450px] bg-[#673AB7]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Main Split Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column (Hero Content) */}
        <div id="knowledge-left" className="lg:col-span-6 flex flex-col items-start gap-8">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs text-amber-800 font-semibold tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Empowering the Next Generation of Thinkers
          </div>

          <h2 className="font-display font-extrabold text-slate-900 text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.15]">
            Investing in <br />
            Knowledge and <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8E54FF] via-[#5C3CC2] to-[#A58FFF] drop-shadow-sm">
              Your Future
            </span>
          </h2>

          <p className="text-gray-600 max-w-md font-sans text-base leading-relaxed tracking-wide">
            Our e-learning programs has been developed to be a vehicle of delivering multimedia learning solutions for your business.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-8 w-full sm:w-auto">
            {/* Pulsating contact button */}
            <button className="bg-gradient-to-r from-[#F5A623] via-[#E27625] to-[#D85E1B] text-white font-semibold text-sm rounded-full py-4 px-10 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-98 transition duration-200 text-center">
              Contact
            </button>

            {/* Statistics */}
            <div className="flex gap-8 border-l border-slate-200 pl-8 items-center justify-around sm:justify-start">
              <div>
                <span className="block font-display font-black text-slate-900 text-3xl tracking-tight">50+</span>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Career Courses</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-200"></div>
              <div>
                <span className="block font-display font-black text-slate-900 text-3xl tracking-tight">1M+</span>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Our Students</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Floating dashboard illustration) */}
        <div id="knowledge-right" className="lg:col-span-6 flex items-center justify-center relative">
          
          {/* Main frame representing the camera visual cutout */}
          <div className="relative w-full max-w-[420px] aspect-square rounded-[3rem] bg-slate-50 border border-slate-200 p-5 shadow-2xl flex items-center justify-center overflow-hidden">
            
            {/* Background design elements inside the frame */}
            <div className="absolute inset-0 bg-radial-gradient from-zinc-300 to-transparent opacity-20 pointer-events-none"></div>
            
            {/* Yellow circle ornament */}
            <div className="w-[280px] h-[280px] rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 opacity-90 absolute z-0 transform translate-y-6"></div>
            
            {/* Fine outer circular target lines */}
            <div className="w-[340px] h-[340px] rounded-full border border-slate-200 absolute pointer-events-none"></div>
            <div className="w-[400px] h-[400px] rounded-full border border-slate-200 absolute pointer-events-none"></div>
            
            {/* Rounded small yellow orbs top right */}
            <div className="absolute top-8 right-8 flex flex-col gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 transform translate-x-2"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-600 opacity-75"></div>
            </div>

            {/* High quality human portrait cutout overlay */}
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500&h=600" 
              alt="E-Learning Student" 
              referrerPolicy="no-referrer"
              className="w-[340px] h-[340px] object-cover rounded-full z-10 border-4 border-slate-100 mix-blend-normal object-top shadow-xl relative"
            />
            
            {/* Floater 1: Assisted Students (Top Left) */}
            <div className="bg-white/95 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 absolute top-12 left-5 z-20 shadow-xl backdrop-blur-md">
              <div className="w-10 h-10 rounded-full bg-[#FFE6DD] flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600 fill-orange-600" />
              </div>
              <div>
                <span className="block font-display font-extrabold text-slate-900 text-sm tracking-tight">175K</span>
                <span className="block text-[10px] text-gray-500 font-medium">Assisted Students</span>
              </div>
            </div>

            {/* Floater 2: Learning Chart (Bottom Left over cutout) */}
            <div className="bg-white/95 border border-slate-200 rounded-2xl p-4 w-60 absolute bottom-6 right-4 lg:-left-4 z-20 shadow-xl backdrop-blur-md">
              <span className="block font-display font-bold text-slate-700 text-xs mb-3.5 tracking-wide">Learning Chart</span>
              
              <div className="flex items-end justify-between h-24 pt-2 relative">
                {/* Horizontal guide lines */}
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-slate-200"></div>
                <div className="absolute inset-x-0 bottom-[33%] h-[1px] bg-slate-200"></div>
                <div className="absolute inset-x-0 bottom-[66%] h-[1px] bg-slate-200"></div>

                {/* Y-Axis Label Indicators */}
                <div className="flex flex-col justify-between h-full text-[8px] text-gray-500 font-semibold absolute left-[-16px]">
                  <span>20K</span>
                  <span>10K</span>
                  <span>5K</span>
                </div>

                {/* Bars */}
                <div className="flex items-end justify-around w-full pl-3 h-full">
                  <div className="flex flex-col items-center gap-1.5 w-3.5">
                    <div className="w-full bg-[#FF4D80] rounded-full h-12"></div>
                    <span className="text-[7px] text-gray-500 font-bold">1k</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 w-3.5">
                    <div className="w-full bg-slate-800 rounded-full h-16"></div>
                    <span className="text-[7px] text-gray-500 font-bold">5k</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 w-3.5">
                    <div className="w-full bg-[#1AA3FF] rounded-full h-10"></div>
                    <span className="text-[7px] text-gray-500 font-bold">10k</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 w-3.5">
                    <div className="w-full bg-[#40C4FF] rounded-full h-14"></div>
                    <span className="text-[7px] text-gray-500 font-bold">15k</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 w-3.5">
                    <div className="w-full bg-[#9F80FE] rounded-full h-[68px]"></div>
                    <span className="text-[7px] text-gray-500 font-bold">20k</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Category Grid */}
      <div id="learning-categories" className="relative z-10 mt-24">
        <h3 className="font-display font-bold text-slate-900 text-2xl sm:text-3xl mb-8 tracking-tight">
          Browse Top Essential <br />
          Career Courses
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch">
          
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <div
                key={cat.id}
                onMouseEnter={() => setHoveredCard(cat.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative overflow-hidden rounded-3xl p-6 ${cat.bg} ${cat.shadow} shadow-lg cursor-pointer transform hover:-translate-y-1 hover:brightness-105 active:scale-98 transition-all duration-300 flex flex-col justify-between h-[180px] group`}
              >
                {/* Upper Left representation with custom container of icon */}
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white p-2">
                  <IconComponent className="w-6 h-6 stroke-[2]" strokeLinecap="round" strokeLinejoin="round" />
                </div>
                
                {/* Horizontal neat decorative border line */}
                <div className="w-full h-[1px] bg-white/20 mt-6 mb-2"></div>

                {/* Subtitle / Title */}
                <div className="flex justify-between items-end gap-2">
                  <span className="font-display font-bold text-white text-lg tracking-tight leading-tight">
                    {cat.title}
                  </span>
                  
                  {/* Decorative tiny arrow on hovering */}
                  <ArrowUpRight className="w-4 h-4 text-white opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 duration-200" />
                </div>

                {/* Custom simulated mouse finger cursor indicator if hovered to replicate the cursor in reference image! */}
                {cat.id === 'ui-ux' && hoveredCard === 'ui-ux' && (
                  <div className="absolute bottom-4 right-10 pointer-events-none select-none z-30 animate-pulse">
                    <svg className="w-5 h-5 text-white filter drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 2v14l3-3 3 6 2-1-3-5 5-1z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}

          {/* Browse All circular button column */}
          <div className="flex items-center justify-center lg:justify-start pl-4">
            <button 
              onClick={() => alert("Loading all courses spectrum...")}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 active:scale-95 transition-all duration-300">
                <ArrowRight className="w-6 h-6" />
              </div>
              <span className="text-xs text-gray-400 font-bold tracking-wider uppercase group-hover:text-white transition duration-200">
                Browse All
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
