import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";

import Home from "./pages/home";
import Feed from "./pages/feed";
import Directory from "./pages/directory";
import Profile from "./pages/profile";
import Inbox from "./pages/inbox";
import Conversation from "./pages/conversation";
import SentConversation from "./pages/sent-conversation";
import Login from "./pages/login";
import Register from "./pages/register";

// Global query client setup with automatic retry prevention for auth errors
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/feed" component={Feed} />
        <Route path="/directory" component={Directory} />
        <Route path="/u/:username" component={Profile} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/inbox/:id" component={Conversation} />
        <Route path="/sent/:id" component={SentConversation} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
