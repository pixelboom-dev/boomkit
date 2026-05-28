import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/routes/_layout";
import { AuthLayout } from "@/routes/_auth-layout";
import SignInPage from "@/routes/signin/page";
import SignUpPage from "@/routes/signup/page";
import DashboardPage from "@/routes/dashboard/page";
import CustomersPage from "@/routes/customers/page";
import CustomerNewPage from "@/routes/customers/new/page";
import CustomerDetailPage from "@/routes/customers/[id]/page";
import SettingsPage from "@/routes/settings/page";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/signin", element: <SignInPage /> },
      { path: "/signup", element: <SignUpPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/customers", element: <CustomersPage /> },
      { path: "/customers/new", element: <CustomerNewPage /> },
      { path: "/customers/:id", element: <CustomerDetailPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
