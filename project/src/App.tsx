import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Cnab500Generator from './pages/Cnab500Generator';
import Cnab444Generator from './pages/Cnab444Generator';
import Contact from './pages/Contact';

function Portal() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('cnab500');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'cnab500' && <Cnab500Generator />}
      {currentPage === 'cnab444' && <Cnab444Generator />}
      {currentPage === 'contact' && <Contact />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Portal />
    </AuthProvider>
  );
}

export default App;
