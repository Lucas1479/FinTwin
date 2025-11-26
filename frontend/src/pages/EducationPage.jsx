import MainLayout from '../components/layout/MainLayout';

const EducationPage = () => (
  <MainLayout>
    <div className="hero min-h-[60vh] bg-base-100 rounded-box shadow-sm">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold text-accent">Knowledge Vault</h1>
          <p className="py-6">Unlock financial concepts as you progress. Your personalized textbook for financial literacy.</p>
          <div className="badge badge-accent badge-lg">Coming Soon - Module 4</div>
        </div>
      </div>
    </div>
  </MainLayout>
);

export default EducationPage;

