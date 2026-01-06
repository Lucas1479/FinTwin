import Navbar from './Navbar';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      <div className="print:hidden">
        <Navbar />
      </div>
      <div className="flex max-w-[1600px] mx-auto">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <main className="flex-1 p-6 md:p-10 overflow-x-hidden print:p-0 print:bg-white print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
