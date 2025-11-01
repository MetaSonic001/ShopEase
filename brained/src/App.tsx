import { Routes, Route } from 'react-router-dom';
import HomePage from './components/pages/HomePage';
import LoginPage from './login/page';
import ProductDetail from './components/pages/ProductDetail';
import AboutPage from './components/pages/AboutPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );
}

export default App;
