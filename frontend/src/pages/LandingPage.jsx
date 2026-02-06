import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  return (
    <div className="bg-white text-slate-900 overflow-x-hidden font-sans selection:bg-slate-900 selection:text-white relative">
      <style>{`
        /* Subtle Dot Background */
        .bg-dot-pattern {
            background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
            background-size: 24px 24px;
        }
        
        /* 3D Tilt Effect */
        .perspective-container {
            perspective: 2000px;
        }
        .tilt-card {
            transform: rotateX(12deg) rotateY(-5deg) rotateZ(2deg);
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.6s ease;
            box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.1);
        }
        .tilt-card:hover {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
            box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.15);
        }

        /* Smooth Fade In Animation */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
      `}</style>
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50 z-0 pointer-events-none h-screen mask-image-gradient"></div>
      
      {/* Gradient Mask for Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white z-0 pointer-events-none h-screen"></div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
