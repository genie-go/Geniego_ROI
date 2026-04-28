import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./state";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { GuidedTour } from "./tour/GuidedTour";
import Overview from "./pages/Overview";
import Commerce from "./pages/Commerce";
import Ads from "./pages/Ads";
import Influencer from "./pages/Influencer";
import Approvals from "./pages/Approvals";
import Analytics from "./pages/Analytics";
import Policies from "./pages/Policies";
import Admin from "./pages/Admin";
import "./styles.css";

function Shell() {
  const [tourOpen, setTourOpen] = React.useState(false);
  return (
    <div className="container">
      <Sidebar />
      <main className="main">
        <Topbar onStartTour={()=>setTourOpen(true)} />
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/commerce" element={<Commerce />} />
          <Route path="/ads" element={<Ads />} />
          <Route path="/influencer" element={<Influencer />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <GuidedTour open={tourOpen} onClose={()=>setTourOpen(false)} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProvider>
  );
}
