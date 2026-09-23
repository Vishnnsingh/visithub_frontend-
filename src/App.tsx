import { Navigate, Route, Routes } from 'react-router-dom';
import {
  GuestOnly,
  RequireActivePlan,
  RequireAuth,
  RequireOwnOrgUserId,
  RequireProfileAuth,
  RequireSuperAdmin,
  RootRedirect,
  SuperGuestOnly,
} from './components/auth/Guards';
import { USER_ROLES } from './lib/auth';
import { ActiveFields } from './pages/ActiveFields';
import { CreateAccount } from './pages/CreateAccount';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { OrgDashboard } from './pages/OrgDashboard';
import { Organisation } from './pages/Organisation';
import { OrgPlanPage } from './pages/OrgPlan';
import { Profile } from './pages/Profile';
import { QrCodes } from './pages/QrCodes';
import { Staff } from './pages/Staff';
import { SuperAdminContacts } from './pages/SuperAdminContacts';
import { SuperAdminHelpCenter } from './pages/SuperAdminHelpCenter';
import { SuperAdminLegal } from './pages/SuperAdminLegal';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SuperAdminLandingTheme } from './pages/SuperAdminLandingTheme';
import { SuperAdminBusinessTypes } from './pages/SuperAdminBusinessTypes';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { SuperAdminPlans } from './pages/SuperAdminPlans';
import { SuperAdminPayments } from './pages/SuperAdminPayments';
import { LegalDocumentPage } from './pages/LegalDocumentPage';
import { Visit } from './pages/Visit';
import { PublicOrgHome } from './pages/PublicOrgHome';
import { TicketsPage } from './pages/Tickets';
import { Notifications } from './pages/Notifications';
import { VisitorDetailsPage } from './pages/VisitorDetails';
import { HomeElementPage } from './pages/HomeElement';
import { OrgLegacyRedirect } from './components/auth/OrgLegacyRedirect';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/g/:code" element={<Visit />} />
      <Route path="/h/:organizationId" element={<PublicOrgHome />} />

      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/terms" element={<LegalDocumentPage />} />
      <Route path="/privacy" element={<LegalDocumentPage />} />

      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<SuperGuestOnly />}>
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      </Route>

      <Route element={<RequireProfileAuth />}>
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Org workspace: /admin/:userId/... */}
      <Route element={<RequireAuth roles={[USER_ROLES.ORG_ADMIN, USER_ROLES.STAFF]} />}>
        <Route element={<RequireOwnOrgUserId />}>
          <Route path="/admin/:userId/plan" element={<OrgPlanPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth roles={[USER_ROLES.ORG_ADMIN, USER_ROLES.STAFF]} />}>
        <Route element={<RequireOwnOrgUserId />}>
          <Route element={<RequireActivePlan />}>
            <Route path="/admin/:userId" element={<OrgDashboard />} />
            <Route path="/admin/:userId/organisation" element={<Organisation />} />
            <Route path="/admin/:userId/qr-codes" element={<QrCodes />} />
            <Route path="/admin/:userId/qr-codes/:id" element={<QrCodes />} />
            <Route path="/admin/:userId/visitor-details" element={<VisitorDetailsPage />} />
            <Route path="/admin/:userId/tickets" element={<TicketsPage />} />
            <Route path="/admin/:userId/notifications" element={<Notifications />} />
            <Route path="/admin/:userId/home-element" element={<HomeElementPage />} />
            <Route path="/admin/:userId/active-fields" element={<ActiveFields />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RequireAuth roles={[USER_ROLES.ORG_ADMIN]} />}>
        <Route element={<RequireOwnOrgUserId />}>
          <Route element={<RequireActivePlan />}>
            <Route path="/admin/:userId/staff" element={<Staff />} />
          </Route>
        </Route>
      </Route>

      {/* Old URLs → /admin/:userId/... */}
      <Route path="/admin" element={<OrgLegacyRedirect page="/admin" />} />
      <Route path="/dashboard" element={<OrgLegacyRedirect page="/admin" />} />
      <Route path="/plan" element={<OrgLegacyRedirect page="/plan" />} />
      <Route path="/organisation" element={<OrgLegacyRedirect page="/organisation" />} />
      <Route path="/qr-codes" element={<OrgLegacyRedirect page="/qr-codes" />} />
      <Route path="/qr-codes/:id" element={<OrgLegacyRedirect page="/qr-codes" />} />
      <Route path="/visitor-details" element={<OrgLegacyRedirect page="/visitor-details" />} />
      <Route path="/tickets" element={<OrgLegacyRedirect page="/tickets" />} />
      <Route path="/notifications" element={<OrgLegacyRedirect page="/notifications" />} />
      <Route path="/home-element" element={<OrgLegacyRedirect page="/home-element" />} />
      <Route path="/active-fields" element={<OrgLegacyRedirect page="/active-fields" />} />
      <Route path="/staff" element={<OrgLegacyRedirect page="/staff" />} />

      <Route element={<RequireSuperAdmin />}>
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/payments" element={<SuperAdminPayments />} />
        <Route path="/superadmin/plans" element={<SuperAdminPlans />} />
        <Route path="/superadmin/business-types" element={<SuperAdminBusinessTypes />} />
        <Route path="/superadmin/contact" element={<SuperAdminContacts />} />
        <Route path="/superadmin/help" element={<SuperAdminHelpCenter />} />
        <Route path="/superadmin/legal" element={<SuperAdminLegal />} />
        <Route path="/superadmin/landing-theme" element={<SuperAdminLandingTheme />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
