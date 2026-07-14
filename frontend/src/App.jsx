import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CreateCheckPage from "./pages/CreateCheckPage";
import SummaryPage from "./pages/SummaryPage";
import RegisterPage from "./pages/RegisterPage";
import PaymentPage from "./pages/PaymentPage";
import ReportPage from "./pages/ReportPage";
import ExecutiveLoginPage from "./pages/ExecutiveLoginPage";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboardPage";
import InvestigationWorkspacePage from "./pages/InvestigationWorkspacePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/validar" element={<CreateCheckPage />} />
        <Route path="/resumen/:id" element={<SummaryPage />} />
        <Route path="/registro/:id" element={<RegisterPage />} />
        <Route path="/pago/:id" element={<PaymentPage />} />
        <Route path="/reporte/:id" element={<ReportPage />} />
        <Route path="/login" element={<ExecutiveLoginPage />} />
<Route path="/executive" element={<ExecutiveDashboardPage />} />
<Route
  path="/executive/investigations/:id"
  element={<InvestigationWorkspacePage />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;