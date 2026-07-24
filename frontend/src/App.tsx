import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import { RoleGuard } from './components/common/RoleGuard';
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
import { PublicVerify } from './pages/PublicVerify';
import { Setup } from './pages/Setup';
import { Toaster } from 'sonner';
export function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<PublicVerify />} />
          <Route path="/setup" element={<Setup />} />

          <Route element={<AppShell />}>
            {/* Student Routes */}
            <Route element={<RoleGuard allow={['Student']} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/new-transfer" element={<NewTransfer />} />
              <Route path="/student/request/:id" element={<RequestDetail />} />
            </Route>

            {/* Registrar Routes */}
            <Route element={<RoleGuard allow={['Registrar']} />}>
              <Route path="/registrar/dashboard" element={<RegistrarDashboard />} />
              <Route path="/registrar/review/:id" element={<RequestReview />} />
              <Route path="/registrar/issued" element={<IssuedLog />} />
            </Route>

            {/* Verifier Routes */}
            <Route element={<RoleGuard allow={['Verifier']} />}>
              <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
              <Route path="/verifier/history" element={<VerificationHistory />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<RoleGuard allow={['Admin']} />}>
              <Route path="/admin/institutions" element={<MemberInstitutions />} />
              <Route path="/admin/network" element={<NetworkNodes />} />
              <Route path="/admin/audit-log" element={<AuditLog />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleProvider>);

}