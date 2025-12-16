import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShopProvider } from "@/context/shop-context";
import { AuthProvider } from "@/context/auth-context";
import { Layout } from "@/components/layout";
import { NotificationPopup } from "@/components/notification-popup";
import { initGA, trackPageView } from "@/lib/analytics";

// Pages
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VerifyOtp from "@/pages/verify-otp";
import ForgotPassword from "@/pages/forgot-password";
import ProductPage from "@/pages/product";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Admin from "@/pages/admin";
import Affiliate from "@/pages/affiliate";
import Blog from "@/pages/blog";
import BlogDetail from "@/pages/blog-detail";
import NotFound from "@/pages/not-found";

// Initialize Google Analytics
initGA();

function PageTracker() {
  const [location] = useLocation();
  
  useEffect(() => {
    trackPageView(location);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <Layout>
      <PageTracker />
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/category/:category/:subCategory" component={Shop} />
        <Route path="/category/:category" component={Shop} />
        <Route path="/brand/:brand" component={Shop} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify-otp" component={VerifyOtp} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ForgotPassword} />
        
        {/* Product Routes */}
        <Route path="/product/:id" component={ProductPage} />
        <Route path="/products/:slug" component={ProductPage} />
        
        {/* Shopping Routes */}
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        
        {/* Blog Routes */}
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogDetail} />
        
        {/* User Routes (protected in component) */}
        <Route path="/admin" component={Admin} />
        <Route path="/affiliate" component={Affiliate} />
        
        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ShopProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
            <NotificationPopup />
          </TooltipProvider>
        </ShopProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
