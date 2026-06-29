import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import { AppShell } from './components/shell/AppShell';
import { Landing } from './pages/Landing';
import { VerifierDashboard } from './pages/verifier/VerifierDashboard';
import { RequestDetail } from './pages/student/RequestDetail';
import { RegistrarDashboard } from './pages/registrar/RegistrarDashboard';
import { RequestReview } from './pages/registrar/RequestReview';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { NewTransfer } from './pages/student/NewTransfer';
import { IssuedLog } from './pages/registrar/IssuedLog';
import { VerificationHistory } from './pages/verifier/VerificationHistory';
import { MemberInstitutions } from './pages/admin/MemberInstitutions';
import { NetworkNodes } from './pages/admin/NetworkNodes';
import { AuditLog } from './pages/admin/AuditLog';
import { Toaster } from 'sonner';
export function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<AppShell />}>
            {/* Student Routes */}
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/new-transfer" element={<NewTransfer />} />
            <Route path="/student/request/:id" element={<RequestDetail />} />

            {/* Registrar Routes */}
            <Route
              path="/registrar/dashboard"
              element={<RegistrarDashboard />} />
            
            <Route path="/registrar/review/:id" element={<RequestReview />} />
            <Route path="/registrar/issued" element={<IssuedLog />} />

            {/* Verifier Routes */}
            <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
            <Route path="/verifier/history" element={<VerificationHistory />} />

            {/* Admin Routes */}
            <Route
              path="/admin/institutions"
              element={<MemberInstitutions />} />
            
            <Route path="/admin/network" element={<NetworkNodes />} />
            <Route path="/admin/audit-log" element={<AuditLog />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>);

}