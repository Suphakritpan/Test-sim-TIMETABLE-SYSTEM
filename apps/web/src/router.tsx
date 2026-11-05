import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useAuthStore } from "./hooks/useAuthStore";
import { Layout } from "./components/Layout";
import { Page1Import, Page2Requests, Page3Scheduler, Page4Timetable, Page5AIResults, Page6Summary, LoginPage } from "./pages";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Page1Import /> },
      { path: "import", element: <Page1Import /> },
      { path: "requests", element: <Page2Requests /> },
      { path: "scheduler", element: <Page3Scheduler /> },
      { path: "timetable", element: <Page4Timetable /> },
      { path: "ai-results", element: <Page5AIResults /> },
      { path: "summary", element: <Page6Summary /> },
    ],
  },
]);

export function AppRouter() {
  const hydrate = useAuthStore((s) => s.hydrate);
  hydrate();

  return <RouterProvider router={router} />;
}