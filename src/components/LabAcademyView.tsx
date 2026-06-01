import React, { useState } from 'react';
import { Play, Pause, FastForward, RotateCcw, Sparkles, MoveRight, ArrowUpRight, Check, Paintbrush, Undo, HelpCircle } from 'lucide-react';

interface MarqueeCardProps {
  children: React.ReactNode;
  width?: string;
}

export default function LabAcademyView() {
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('slow');
  const [paused, setPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'showcase' | 'blueprint'>('showcase');
  const [selectedInspect, setSelectedInspect] = useState<string | null>(null);
  const [isTilted, setIsTilted] = useState(true);

  // Simple Canvas state for "# Make Together" card
  const [canvasColor, setCanvasColor] = useState('#4CAF50');
  const [lines, setLines] = useState<string[]>([
    'M 10,80 Q 52.5,10 95,80 T 180,80', // pre-drawn wave line
    'M 30,120 Q 90,40 150,120 T 270,120',
  ]);
  const [activeDrawing, setActiveDrawing] = useState(false);

  // Speed values in seconds for the CSS keyframe animation
  const speeds = {
    slow: { row1: 45, row2: 50, row3: 40 },
    normal: { row1: 30, row2: 35, row3: 25 },
    fast: { row1: 15, row2: 18, row3: 12 },
  };

  const currentSpeed = speeds[speed];

  // Helper function to render asterisks exactly as seen in reference image
  const AsteriskIcon = ({ color }: { color: string }) => (
    <span className={`inline-flex items-center justify-center font-serif font-black text-2xl ${color} mx-0.5 animate-spin-slow`}>
      *
    </span>
  );

  return (
    <div id="lab-academy-root" className="bg-white min-h-screen text-stone-800 font-sans pb-28 pt-8 overflow-hidden relative selection:bg-lime-200">
      
      {/* Self-contained keyframe animations for infinite smooth ribbon marquees */}
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right linear infinite;
        }
        .pause-marquee {
          animation-play-state: paused !important;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* wireframe thin vector lines backdrops simulating the LabAcademy aesthetic exactly */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Curvier lines */}
          <path d="M-100,200 C300,50 600,600 1200,300 C1500,100 1800,450 2000,250" fill="none" stroke="#E5E7EB" strokeWidth="2" />
          <path d="M-50,600 C400,200 800,800 1400,500" fill="none" stroke="#FCE7F3" strokeWidth="2.5" />
          {/* Golden wire circles */}
          <circle cx="150" cy="150" r="120" fill="none" stroke="#FEF08A" strokeWidth="1.5" strokeDasharray="5 5" />
          <circle cx="85%" cy="30%" r="200" fill="none" stroke="#FEF08A" strokeWidth="2" />
          <circle cx="50%" cy="85%" r="350" fill="none" stroke="#D9F99D" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
       

        {activeTab === 'blueprint' ? (
          /* Blueprint static layout grid so user can see flat cards clearly without moving */
          <div className="animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm mb-8">
              <h3 className="font-display font-extrabold text-stone-900 text-lg mb-2">Static Card Directory</h3>
              <p className="text-sm text-stone-500">
                Click any layout element below to view its design architecture specifications, typography parameters, and visual style notes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card component 1 */}
              <div 
                onClick={() => setSelectedInspect('creative-minds')}
                className="bg-white border-2 border-stone-100 rounded-[2.5rem] p-8 shadow-sm cursor-pointer hover:border-lime-500 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-stone-400 mb-6">
                  <span className="font-mono">CLASSNAME: CreativeMindsSchool</span>
                  <span className="text-lime-600 font-bold">INSIGHT AVAILABLE</span>
                </div>
                <h4 className="font-display font-black text-stone-900 text-2xl leading-none mb-3">Creative Minds School</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Interactive school showcase with green accent photos, rounded asterisk decals, and action button layouts.
                </p>
              </div>

              {/* Card component 2 */}
              <div 
                onClick={() => setSelectedInspect('directions-education')}
                className="bg-white border-2 border-stone-100 rounded-[2.5rem] p-8 shadow-sm cursor-pointer hover:border-lime-500 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-stone-400 mb-6">
                  <span className="font-mono">CLASSNAME: DirectionsOfEducation</span>
                  <span className="text-lime-600 font-bold">INSIGHT AVAILABLE</span>
                </div>
                <h4 className="font-display font-black text-stone-900 text-2xl leading-none mb-3">Directions of Education</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Color coded pathway blocks (Graphic, Packaging, Print Media Design) featuring rich illustrations.
                </p>
              </div>

              {/* Card component 3 */}
              <div 
                onClick={() => setSelectedInspect('make-together')}
                className="bg-white border-2 border-stone-100 rounded-[2.5rem] p-8 shadow-sm cursor-pointer hover:border-lime-500 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-stone-400 mb-6">
                  <span className="font-mono">CLASSNAME: MakeTogetherCanvas</span>
                  <span className="text-lime-600 font-bold">INSIGHT AVAILABLE</span>
                </div>
                <h4 className="font-display font-black text-stone-900 text-2xl leading-none mb-3"># Make Together Canvas</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Active coordinate plotting system with customized path vectors, cursor trails, and user tags.
                </p>
              </div>

            </div>
          </div>
        ) : (
          /* Marquees layout as described by user: "make the card section main DIV tilted for marquee" */
          <div 
            className="space-y-16 select-none relative transition-all duration-1000 ease-out origin-center py-6 md:py-12"
            style={isTilted ? {
              transform: 'perspective(2200px) rotateX(11deg) rotateY(-11deg) rotateZ(1.5deg) skewX(-2deg) scale(0.97)',
              transformStyle: 'preserve-3d',
            } : undefined}
          >
            
            {/* ROW 1: Auto Slides Left (Profile and Team cards) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden flex flex-col gap-2 pointer-events-auto">
              <div className="px-4 text-xs font-mono font-bold uppercase tracking-wider text-stone-400 max-w-7xl mx-auto w-full">
                ⚡ Row 1 · Team Profiles & Groups (Moving Left)
              </div>
              
              <div 
                className={`flex gap-6 w-max animate-marquee-left ${paused ? 'pause-marquee' : ''}`}
                style={{ animationDuration: `${currentSpeed.row1}s` }}
              >
                {/* Wrap content twice to enable seamless infinite scroll looping */}
                {[1, 2].map((loopIdx) => (
                  <div key={loopIdx} className="flex gap-6 shrink-0">
                    
                    {/* Card: Wade Warren */}
                    <div 
                      onClick={() => setSelectedInspect('wade')}
                      className="bg-[#DCEBF6] border border-stone-200/50 rounded-3xl p-6 w-[290px] flex flex-col justify-between h-[180px] shadow-sm shrink-0 cursor-pointer hover:scale-101 hover:shadow transition-transform duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <img 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white"
                            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120&h=120" 
                            alt="Wade"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="block font-display font-black text-sm text-stone-900">Wade Warren</span>
                            <span className="text-[10px] text-sky-800 font-semibold">Senior Director</span>
                          </div>
                        </div>

                        {/* Custom dot icon */}
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sky-800 font-extrabold text-[10px]">
                          ★
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[9px] font-extrabold bg-white/60 text-sky-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Branding</span>
                        <span className="text-[9px] font-extrabold bg-white/60 text-sky-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">LogoDesign</span>
                      </div>

                      <p className="text-[11px] text-sky-900/80 leading-relaxed font-sans max-w-[90%]">
                        Design guru, nurturing the next generation of visual storytellers.
                      </p>
                    </div>

                    {/* Card: Jenny Wilson */}
                    <div 
                      onClick={() => setSelectedInspect('jenny')}
                      className="bg-[#F6ECFF] border border-stone-200/50 rounded-3xl p-6 w-[290px] flex flex-col justify-between h-[180px] shadow-sm shrink-0 cursor-pointer hover:scale-101 hover:shadow transition-transform duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <img 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white"
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120" 
                            alt="Jenny"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="block font-display font-black text-sm text-stone-900">Jenny Wilson</span>
                            <span className="text-[10px] text-fuchsia-800 font-semibold">Visual Architect</span>
                          </div>
                        </div>

                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-fuchsia-850 font-extrabold text-[10px]">
                          ❤
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[9px] font-extrabold bg-white/60 text-fuchsia-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Typography</span>
                        <span className="text-[9px] font-extrabold bg-white/60 text-fuchsia-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Visual</span>
                      </div>

                      <p className="text-[11px] text-fuchsia-905/80 leading-relaxed font-sans max-w-[90%]">
                        Guiding students to design brilliance, one pixel at a time.
                      </p>
                    </div>

                    {/* Card: Group B2 Graphic Representation */}
                    <div 
                      onClick={() => setSelectedInspect('group-b2')}
                      className="bg-[#FFEBE5] border border-stone-200/50 rounded-3xl p-6 w-[290px] flex flex-col justify-between h-[180px] shadow-sm shrink-0 cursor-pointer hover:scale-101 hover:shadow transition-transform duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-red-100 text-red-900 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Group B2</span>
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-[#1AA3FF] border border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-orange-400 border border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-black text-[8px] text-white flex items-center justify-center font-bold border border-white">+31</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-display font-black text-stone-900 text-lg leading-tight mb-1">Graphic Design Cohort</h4>
                        <span className="block text-[11px] text-red-900/60 font-semibold uppercase tracking-wider">Number of students: 34</span>
                      </div>

                      <div className="h-1 bg-red-200/50 rounded-full w-full overflow-hidden">
                        <div className="bg-red-500 h-full w-[85%] rounded-full"></div>
                      </div>
                    </div>

                    {/* Card: Jane Cooper long label */}
                    <div className="bg-[#FAF1D6] rounded-full px-6 py-3 shrink-0 flex items-center gap-3 border border-stone-200/50 h-[60px] self-center">
                      <div className="w-7 h-7 rounded-full bg-amber-500 border border-white shrink-0"></div>
                      <div>
                        <span className="block font-bold text-xs text-stone-900 leading-none">Jane Cooper</span>
                        <span className="text-[9px] text-gray-500 font-semibold leading-none mt-0.5">Illustration Lead</span>
                      </div>
                    </div>

                    {/* Card: Leslie Alexander long label */}
                    <div className="bg-[#E7F5E9] rounded-full px-6 py-3 shrink-0 flex items-center gap-3 border border-stone-200/50 h-[60px] self-center">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 border border-white shrink-0"></div>
                      <div>
                        <span className="block font-bold text-xs text-stone-900 leading-none">Leslie Alexander</span>
                        <span className="text-[9px] text-emerald-800 font-semibold leading-none mt-0.5">Interaction Mentor</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* ROW 2: Auto Slides Right (Creative Minds main layouts) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden flex flex-col gap-2 pointer-events-auto">
              <div className="px-4 text-xs font-mono font-bold uppercase tracking-wider text-stone-400 max-w-7xl mx-auto w-full">
                ⚡ Row 2 · Core Educational Directions (Moving Right)
              </div>
              
              <div 
                className={`flex gap-6 w-max animate-marquee-right ${paused ? 'pause-marquee' : ''}`}
                style={{ animationDuration: `${currentSpeed.row2}s` }}
              >
                {[1, 2].map((loopIdx) => (
                  <div key={loopIdx} className="flex gap-6 shrink-0">
                    
                    {/* Card: LabAcademy - Creative Minds School Header Template */}
                    <div 
                      onClick={() => setSelectedInspect('creative-minds')}
                      className="bg-white border border-stone-200 rounded-[2.5rem] p-8 w-[500px] h-[340px] flex flex-col justify-between shadow-md shrink-0 cursor-pointer hover:border-stone-400 transition"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-stone-900 flex items-center justify-center text-white p-1">
                            <span className="text-[9px] font-black">GD</span>
                          </div>
                          <span className="font-display font-extrabold text-xs text-stone-800 tracking-wide">Guidement</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                          <span>Courses</span>
                          <span>My Progress</span>
                          <span>Instructors</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-7 pr-2">
                          <h3 className="font-display font-black text-stone-900 text-3xl leading-[1.1] mb-3 tracking-tight">
                            Guidement <AsteriskIcon color="text-amber-500" /><AsteriskIcon color="text-emerald-500" /><br />
                            Online LMS
                          </h3>
                          <p className="text-[11px] text-stone-500 leading-relaxed font-sans font-light">
                            Welcome to our modern, next-generation Learning Management System where potential is nurtured and collaborative learning knows no limits.
                          </p>

                          <button className="bg-stone-900 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-full mt-4 hover:bg-stone-800 transition">
                            Get Started
                          </button>
                        </div>

                        {/* Image inside card container exactly mirroring reference */}
                        <div className="col-span-5 relative self-center bg-emerald-900 text-emerald-200 p-4 rounded-[2rem] aspect-[1/1] overflow-hidden flex flex-col justify-between relative shadow">
                          <img 
                            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=200&h=200" 
                            alt="Group studying" 
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-90 shrink-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 to-transparent opacity-60"></div>
                          
                          <div className="relative z-10 flex flex-col justify-end h-full">
                            <span className="block text-[8px] opacity-80 leading-none">Creative minds thrive</span>
                            <span className="block text-[11px] font-black mt-1 leading-tight"># Make together</span>
                          </div>
                        </div>
                      </div>

                      {/* Floating tags */}
                      <div className="flex gap-2">
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">🎨 Visualart</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">🏷️ Branding</span>
                        <span className="text-[9px] bg-green-100 text-green-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">💡 UX Design</span>
                      </div>
                    </div>

                    {/* Card: Directions of Education Large overview */}
                    <div 
                      onClick={() => setSelectedInspect('directions-education')}
                      className="bg-[#FAF9F6] border border-stone-200 rounded-[2.5rem] p-8 w-[580px] h-[340px] flex flex-col justify-between shadow-md shrink-0 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-display font-black text-stone-900 text-2xl tracking-tight mb-2">Directions of education</h3>
                          <p className="text-[11px] text-stone-500 leading-relaxed max-w-sm font-sans">
                            At our institution, we offer an extensive array of learning pathways and specialized disciplines, encompassing Graphic Design, Fundamentals, Digital Illustration.
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Directions color coded blocks as seen in reference image */}
                      <div className="grid grid-cols-3 gap-3">
                        
                        {/* Block 1: Graphic Design */}
                        <div className="bg-[#D9F99D] p-4 rounded-3xl flex flex-col justify-between h-[155px] hover:scale-[1.02] transition">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] bg-black/5 text-stone-800 font-bold px-2 py-0.5 rounded-full uppercase">Beginner</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-stone-600" />
                          </div>
                          <div>
                            <span className="block font-display font-extrabold text-xs text-stone-900">Graphic Design</span>
                            <span className="block text-[8px] text-stone-600 mt-1">2 years of study</span>
                          </div>
                        </div>

                        {/* Block 2: Packaging Design */}
                        <div className="bg-[#FFEDD5] p-4 rounded-3xl flex flex-col justify-between h-[155px] hover:scale-[1.02] transition">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] bg-black/5 text-orange-900 font-bold px-2 py-0.5 rounded-full uppercase">1 Year</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-orange-700" />
                          </div>
                          <div>
                            <span className="block font-display font-extrabold text-xs text-orange-950">Packaging Design</span>
                            <span className="block text-[8px] text-orange-700 mt-1">Dedicated study</span>
                          </div>
                        </div>

                        {/* Block 3: Print Media Design */}
                        <div className="bg-[#F3E8FF] p-4 rounded-3xl flex flex-col justify-between h-[155px] hover:scale-[1.02] transition">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] bg-black/5 text-purple-900 font-bold px-2 py-0.5 rounded-full uppercase">Intermediate</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-purple-700" />
                          </div>
                          <div>
                            <span className="block font-display font-extrabold text-xs text-purple-950">Print Media Design</span>
                            <span className="block text-[8px] text-purple-700 mt-1">3 years of study</span>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* ROW 3: Auto Slides Left (# Make together Active interactive canvas) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden flex flex-col gap-2 pointer-events-auto">
              <div className="px-4 text-xs font-mono font-bold uppercase tracking-wider text-stone-400 max-w-7xl mx-auto w-full">
                ⚡ Row 3 · Collaborative Artboards & Labs (Moving Left)
              </div>
              
              <div 
                className={`flex gap-6 w-max animate-marquee-left ${paused ? 'pause-marquee' : ''}`}
                style={{ animationDuration: `${currentSpeed.row3}s` }}
              >
                {[1, 2].map((loopIdx) => (
                  <div key={loopIdx} className="flex gap-6 shrink-0">
                    
                    {/* Card: # Make Together drawing pad */}
                    <div 
                      onClick={() => setSelectedInspect('make-together')}
                      className="bg-white border border-stone-200 rounded-[2.5rem] p-8 w-[500px] h-[340px] flex flex-col justify-between shadow-md shrink-0 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-display font-black text-stone-900 text-3xl leading-none tracking-tight mb-2"># Make together</h3>
                          <p className="text-[11px] text-stone-500 max-w-[340px] leading-relaxed font-sans">
                            Engage in the dynamic world of creative drawing and collaborative design projects with our live whiteboard sessions.
                          </p>
                        </div>
                        <div className="flex gap-1.5 bg-stone-100 p-1.5 rounded-full text-[10px] text-stone-700 font-bold shadow-sm self-start">
                          <Check className="w-3 h-3 text-emerald-600" /> Live Canvas
                        </div>
                      </div>

                      {/* Simulated coordinate plotting grid with customizable paths */}
                      <div className="relative bg-[#FAF9F5] border border-stone-200 rounded-3xl h-[160px] overflow-hidden flex items-center justify-center p-4">
                        
                        {/* Background plotting grid dot columns */}
                        <div className="absolute inset-0 grid grid-cols-12 opacity-[0.06] pointer-events-none">
                          {Array.from({ length: 48 }).map((_, i) => (
                            <div key={i} className="border-r border-b border-stone-900 h-8"></div>
                          ))}
                        </div>

                        {/* Path svg curves */}
                        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          {lines.map((p, idx) => (
                            <path 
                              key={idx} 
                              d={p} 
                              fill="none" 
                              stroke={idx === 0 ? canvasColor : '#FF4D80'} 
                              strokeWidth="3.5" 
                              strokeLinecap="round" 
                              strokeDasharray={idx === 1 ? '5 5' : 'none'}
                            />
                          ))}
                        </svg>

                        {/* Interactive vector pointer cursors reproducing the overlay elements precisely */}
                        <div className="absolute top-8 left-[30%] bg-fuchsia-500 text-white font-bold text-[9px] py-1 px-3 rounded-full flex items-center gap-1 shadow-lg transform -rotate-3 z-10 transition">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                          Jane Cooper
                        </div>

                        <div className="absolute bottom-6 right-[20%] bg-emerald-500 text-white font-bold text-[9px] py-1 px-3 rounded-full flex items-center gap-1 shadow-lg transform rotate-2 z-10 transition">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          Jenny Wilson
                        </div>

                        {/* Micro controller bar inside the drawing card */}
                        <div className="absolute bottom-2 left-4 bg-white/90 border border-stone-200/60 p-1.5 rounded-full flex items-center gap-2 shadow-md hover:bg-white transition">
                          <span className="text-[8px] text-stone-400 font-bold uppercase tracking-wider pl-1.5">Color:</span>
                          <button onClick={(e) => { e.stopPropagation(); setCanvasColor('#10B981'); }} className="w-3.5 h-3.5 rounded-full bg-emerald-500"></button>
                          <button onClick={(e) => { e.stopPropagation(); setCanvasColor('#3B82F6'); }} className="w-3.5 h-3.5 rounded-full bg-blue-500"></button>
                          <button onClick={(e) => { e.stopPropagation(); setCanvasColor('#F59E0B'); }} className="w-3.5 h-3.5 rounded-full bg-amber-500"></button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              // Add random line values to drawing array!
                              const rx = Math.random() * 80 + 20;
                              const ry = Math.random() * 120 + 20;
                              setLines([...lines, `M 0,${ry} Q 100,${rx} 200,${ry}`]);
                            }} 
                            className="bg-[#FBE5E1] text-red-700 hover:bg-red-50 text-[9px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0"
                          >
                            <Paintbrush className="w-2.5 h-2.5" /> Draw Path
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-stone-400 font-medium">
                        <span>💡 Tip: Click color dots or Draw Path button to test live drawing!</span>
                        <span className="font-bold underline text-stone-600">Active Lab Frame</span>
                      </div>
                    </div>

                    {/* Card: High fidelity Graphic Design Group Poster card */}
                    <div 
                      onClick={() => setSelectedInspect('creative-mind-b2')}
                      className="bg-stone-900 text-white border border-stone-800 rounded-[2.5rem] p-8 w-[420px] h-[340px] flex flex-col justify-between shadow-md shrink-0 cursor-pointer overflow-hidden relative group"
                    >
                      {/* background mesh gradient */}
                      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-lime-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-lime-500/30 transition duration-300"></div>

                      <div className="flex justify-between items-start relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center p-2 text-white">
                          <span className="font-serif font-black text-lg">*</span>
                        </div>
                        <span className="text-[10px] bg-lime-600/20 text-lime-400 font-extrabold tracking-widest px-3 py-1 rounded-full uppercase border border-lime-600/30">
                          Active Sandbox
                        </span>
                      </div>

                      <div className="relative z-10">
                        <span className="block text-amber-400 text-[10px] font-mono uppercase tracking-wider mb-2">Exclusive Interactive</span>
                        <h4 className="font-display font-black text-white text-3xl leading-none tracking-tight mb-3">
                          Creative Mind <br />
                          Sandbox
                        </h4>
                        <p className="text-[11px] text-stone-400 leading-relaxed font-sans font-light max-w-[90%]">
                          Where students can customize vector curves, layout design blocks, and build prototypes collaboratively in real-time.
                        </p>
                      </div>

                      <div className="flex justify-between items-center relative z-10 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                          <span className="text-[10px] text-stone-400 font-bold">12 Active designers</span>
                        </div>
                        
                        <span className="text-xs font-bold text-white group-hover:translate-x-1 duration-200 inline-flex items-center gap-1">
                          Test Lab <MoveRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Selected Card Inspecting drawer panel context to satisfy reference layout accuracy requests */}
        {selectedInspect && (
          <div className="mt-16 bg-white border border-stone-200 rounded-[2.5rem] p-8 max-w-4xl mx-auto shadow-xl flex flex-col md:flex-row gap-8 items-start relative animate-fadeIn">
            <button 
              onClick={() => setSelectedInspect(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-bold hover:bg-stone-200 text-stone-600"
            >
              ×
            </button>

            <div className="flex-1">
              <span className="text-[10px] text-lime-700 font-extrabold uppercase tracking-widest font-mono">Layout Inspection System</span>
              <h3 className="font-display font-black text-gray-900 text-2xl mt-1 mb-4 capitalize">
                {selectedInspect.replace('-', ' ')} Specifications
              </h3>

              {/* Specs detailed table */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="block text-stone-400 uppercase font-bold text-[9px] tracking-wider mb-1">Font Pairings</span>
                  <span className="font-bold text-stone-800">Outfit (Display) + Inter (Sans-serif)</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="block text-stone-400 uppercase font-bold text-[9px] tracking-wider mb-1">Corner Radius</span>
                  <span className="font-bold text-stone-800">2.5rem (40px) matching reference cards</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="block text-stone-400 uppercase font-bold text-[9px] tracking-wider mb-1">Border Treatment</span>
                  <span className="font-bold text-stone-800">Fine 1px solid stone-200 matching layout wireframe</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="block text-stone-400 uppercase font-bold text-[9px] tracking-wider mb-1">Interactive Elements</span>
                  <span className="font-bold text-stone-800">Self-contained animation state, interactive drawings, dynamic speed dials</span>
                </div>
              </div>

              <div className="mt-6">
                <span className="block text-stone-500 text-xs font-bold mb-2">Architecture Narrative:</span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  To capture the premium Swiss modern visual language of the Guidement Online LMS layout, we've implemented high-contrast colors, subtle wire curves, and customized marquee sliding speeds.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/60 w-full md:w-80 shrink-0">
              <span className="block text-stone-400 uppercase font-bold text-[9px] tracking-wider mb-3">Live Simulation</span>
              <div className="space-y-3">
                <button 
                  onClick={() => alert("Simulating alignment calibration...")}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition"
                >
                  Verify Symmetry Grid
                </button>
                <button 
                  onClick={() => {
                    setLines([
                      'M 10,80 Q 52.5,10 95,80 T 180,80',
                      'M 30,120 Q 90,40 150,120 T 270,120',
                    ]);
                    alert("Collaborative path elements restarted!");
                  }}
                  className="w-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-bold text-xs py-2.5 px-4 rounded-xl transition"
                >
                  Reset Painting Curves
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
