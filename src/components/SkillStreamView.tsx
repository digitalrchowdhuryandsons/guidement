import React, { useState } from 'react';
import { Search, ArrowUpRight, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CourseCard {
  id: string;
  title: string;
  coursesCount?: number;
  rating: number;
  students: string;
  color: string;
  textColor: string;
  arrowBg?: boolean;
}

export default function SkillStreamView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseCard | null>(null);

  const courses: CourseCard[] = [
    {
      id: 'cybersec-ethical',
      title: 'Cybersecurity & Ethical Hacking',
      coursesCount: 20,
      rating: 4.9,
      students: '1.4M Students',
      color: 'bg-[#A7C5B2]', // Sage green
      textColor: 'text-emerald-950',
    },
    {
      id: 'cloud-computing',
      title: 'Cloud Computing',
      rating: 5.0,
      students: '950K Students',
      color: 'bg-[#DE9980]', // Terracotta orange
      textColor: 'text-orange-950',
    },
    {
      id: 'digital-marketing',
      title: 'Digital Marketing Masterclass',
      coursesCount: 30,
      rating: 4.8,
      students: '999K Students',
      color: 'bg-[#BDCBD0]', // Slate blue tall
      textColor: 'text-slate-900',
      arrowBg: true, // Needs a dark circle behind arrow
    },
    {
      id: 'digital-strategy',
      title: 'Digital Strategy',
      coursesCount: 14,
      rating: 4.5,
      students: '1.2M Students',
      color: 'bg-[#EBD19A]', // Metallic yellow
      textColor: 'text-amber-950',
    },
    {
      id: 'cybersec',
      title: 'Cybersecurity',
      coursesCount: 7,
      rating: 4.7,
      students: '1M Students',
      color: 'bg-[#A3CCA6]', // Light pastel mint-blue
      textColor: 'text-emerald-950',
    },
    {
      id: 'graphic-design',
      title: 'Graphic Design Foundations',
      coursesCount: 12,
      rating: 5.0,
      students: '1.9M Students',
      color: 'bg-[#B69697]', // Dusty mauve
      textColor: 'text-rose-950',
    },
  ];

  // Search logic
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="skillstream-root" className="relative bg-white min-h-screen text-slate-900 overflow-hidden font-sans py-8 px-4 sm:px-6 md:px-12 lg:px-20 selection:bg-[#F08365] selection:text-black">
      {/* Background Vertical Divider Lines */}
      <div id="bg-grid-lines" className="absolute inset-0 flex justify-between pointer-events-none px-4 sm:px-6 md:px-12 lg:px-20 z-0">
        <div className="w-[1px] h-full bg-slate-900/[0.04]"></div>
        <div className="w-[1px] h-full bg-slate-900/[0.04] hidden sm:block"></div>
        <div className="w-[1px] h-full bg-slate-900/[0.04] hidden md:block"></div>
        <div className="w-[1px] h-full bg-slate-900/[0.04]"></div>
      </div>

  

      {/* Hero Section */}
      <div id="skillstream-hero" className="relative z-10 text-center max-w-4xl mx-auto mb-16">
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light text-slate-900 tracking-tight leading-[1.1] mb-6">
          Master the skills that <br />
          <span className="italic font-normal text-slate-700">shape the future.</span>
        </h1>

        <p className="font-sans text-slate-600 text-lg md:text-xl font-light tracking-wide max-w-xl mx-auto mb-8">
          Search for courses or certifications...
        </p>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto mt-6">
          <div className="relative w-full sm:flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search For Courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-950 placeholder-slate-400 border border-slate-300 focus:border-slate-400 outline-none rounded-full py-3.5 pl-12 pr-6 text-sm font-medium transition duration-200 focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <button 
            onClick={() => setSearchQuery(searchQuery)}
            className="w-full sm:w-auto bg-[#DCE6DA] text-slate-900 font-medium text-sm py-3.5 px-8 rounded-full hover:bg-slate-200 transition duration-200 shadow-md"
          >
            Search
          </button>
        </div>
      </div>

      {/* Course Bento Grid */}
      <div id="course-grid" className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Column 1: Row 1 Sage Green, Row 2 Terracotta */}
          <div className="md:col-span-1 flex flex-col gap-4">
            {/* Card 1: Sage green Cybersec & Ethical */}
            {filteredCourses.some(c => c.id === 'cybersec-ethical') && (
              <motion.div
                layoutId="course-cybersec-ethical"
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setSelectedCourse(courses[0])}
                className="group relative bg-[#A7C5B2] text-emerald-950 p-6 rounded-3xl h-[170px] flex flex-col justify-between cursor-pointer transition shadow-lg hover:shadow-2xl hover:shadow-emerald-950/10"
              >
                <div className="flex justify-between items-start text-[11px] font-semibold uppercase tracking-wider opacity-60">
                  <span className="flex items-center gap-0.5">★ 4.9</span>
                  <span>1.4M Students</span>
                </div>
                <div className="flex justify-between items-end">
                  <h3 className="font-display font-bold text-xl leading-snug tracking-tight max-w-[85%]">
                    Cybersecurity & Ethical Hacking (20 Courses)
                  </h3>
                  <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-200 shrink-0" />
                </div>
              </motion.div>
            )}

            {/* Card 5: Terracotta Cloud Computing */}
            {filteredCourses.some(c => c.id === 'cloud-computing') && (
              <motion.div
                layoutId="course-cloud-computing"
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setSelectedCourse(courses[1])}
                className="group relative bg-[#DE9980] text-orange-950 p-6 rounded-3xl h-[135px] flex flex-col justify-between cursor-pointer transition shadow-lg hover:shadow-2xl hover:shadow-orange-950/10"
              >
                <div className="flex justify-between items-start text-[11px] font-semibold uppercase tracking-wider opacity-60">
                  <span className="flex items-center gap-0.5">★ 5.0</span>
                  <span>950K Students</span>
                </div>
                <div className="flex justify-between items-end">
                  <h3 className="font-display font-bold text-xl leading-snug tracking-tight max-w-[85%]">
                    Cloud Computing
                  </h3>
                  <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-200 shrink-0" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Column 2: Tall Slate Blue (Digital Marketing Masterclass) */}
          <div className="md:col-span-1">
            {filteredCourses.some(c => c.id === 'digital-marketing') ? (
              <motion.div
                layoutId="course-digital-marketing"
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setSelectedCourse(courses[2])}
                className="group relative bg-[#BDCBD0] text-slate-900 p-6 rounded-3xl h-full min-h-[320px] flex flex-col justify-between cursor-pointer transition shadow-lg hover:shadow-2xl hover:shadow-slate-950/10"
              >
                <div className="flex justify-between items-start text-[11px] font-semibold uppercase tracking-wider opacity-65">
                  <span className="flex items-center gap-0.5">★ 4.8</span>
                  <span>999K Students</span>
                </div>
                <div className="flex justify-between items-end mt-12">
                  <h3 className="font-display font-extrabold text-2xl leading-tight tracking-tight max-w-[80%]">
                    Digital Marketing Masterclass (30 Courses)
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 group-hover:scale-115 transition duration-300">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full border border-dashed border-slate-300 rounded-3xl flex items-center justify-center text-slate-500 text-xs py-10">
                Filtered out
              </div>
            )}
          </div>

          {/* Column 3 & 4 Layout */}
          <div className="md:col-span-2 flex flex-col gap-4">
            
            {/* Split Top row: Row 1 has Digital Strategy and Cybersecurity (07 Courses) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 3: Digital Strategy (Metallic yellow) */}
              {filteredCourses.some(c => c.id === 'digital-strategy') && (
                <motion.div
                  layoutId="course-digital-strategy"
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setSelectedCourse(courses[3])}
                  className="group relative bg-[#EBD19A] text-amber-950 p-6 rounded-3xl h-[170px] flex flex-col justify-between cursor-pointer transition shadow-lg hover:shadow-2xl hover:shadow-amber-950/10"
                >
                  <div className="flex justify-between items-start text-[11px] font-semibold uppercase tracking-wider opacity-60">
                    <span className="flex items-center gap-0.5">★ 4.5</span>
                    <span>1.2M Students</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <h3 className="font-display font-bold text-xl leading-snug tracking-tight max-w-[80%]">
                      Digital Strategy (14 Courses)
                    </h3>
                    <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-200 shrink-0" />
                  </div>
                </motion.div>
              )}

              {/* Card 4: Cybersecurity 07 Courses (light pastel mint-blue) */}
              {filteredCourses.some(c => c.id === 'cybersec') && (
                <motion.div
                  layoutId="course-cybersec"
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setSelectedCourse(courses[4])}
                  className="group relative bg-[#A3CCA6] text-emerald-950 p-6 rounded-3xl h-[170px] flex flex-col justify-between cursor-pointer transition shadow-lg hover:shadow-2xl hover:shadow-emerald-990/10"
                >
                  <div className="flex justify-between items-start text-[11px] font-semibold uppercase tracking-wider opacity-60">
                    <span className="flex items-center gap-0.5">★ 4.7</span>
                    <span>1M Students</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <h3 className="font-display font-bold text-xl leading-snug tracking-tight max-w-[80%]">
                      Cybersecurity (07 Courses)
                    </h3>
                    <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-200 shrink-0" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bottom Row spanned: Mauve/pink Graphic Design */}
            {filteredCourses.some(c => c.id === 'graphic-design') && (
              <motion.div
                layoutId="course-graphic-design"
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setSelectedCourse(courses[5])}
                className="group relative bg-[#B69697] text-rose-950 p-6 rounded-3xl h-[135px] flex flex-col justify-between cursor-pointer transition shadow-lg hover:shadow-2xl hover:shadow-rose-950/10"
              >
                <div className="flex justify-between items-start text-[11px] font-semibold uppercase tracking-wider opacity-60">
                  <span className="flex items-center gap-0.5">★ 5.0</span>
                  <span>1.9M Students</span>
                </div>
                <div className="flex justify-between items-end">
                  <h3 className="font-display font-bold text-xl leading-snug tracking-tight max-w-[90%]">
                    Graphic Design Foundations (12 Courses)
                  </h3>
                  <ArrowUpRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-200 shrink-0" />
                </div>
              </motion.div>
            )}

          </div>

        </div>
      </div>

      {/* Selected Course Dialog/Detail */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`max-w-md w-full ${selectedCourse.color} ${selectedCourse.textColor} p-8 rounded-3xl shadow-2xl relative overflow-hidden`}
            >
              <button
                onClick={() => setSelectedCourse(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center font-bold text-lg hover:bg-black/20"
              >
                ×
              </button>
              
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-black/5 px-2.5 py-1 rounded-full">{selectedCourse.students}</span>
                <span className="font-bold flex items-center gap-0.5 bg-black/5 px-2.5 py-1 rounded-full">★ {selectedCourse.rating}</span>
              </div>

              <h4 className="font-serif text-3xl font-bold mb-4 tracking-tight leading-tight">
                {selectedCourse.title}
              </h4>

              <p className="text-sm opacity-85 mb-6 leading-relaxed">
                Unlock expert-crafted blueprints, project templates, real-time consultation sessions, and professional certification badges globally recognized.
              </p>

              <div className="flex items-center gap-2 font-display text-sm font-semibold opacity-75 mb-6">
                <span>⚡ {selectedCourse.coursesCount || 5} premium lessons</span>
                <span>• animate guides included</span>
              </div>

              <button
                onClick={() => alert(`Enrolling in ${selectedCourse.title}!`)}
                className="w-full bg-zinc-950 text-white rounded-full py-3.5 font-bold hover:bg-zinc-800 transition"
              >
                Enroll Now
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
