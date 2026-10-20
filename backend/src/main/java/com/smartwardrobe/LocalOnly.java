package com.smartwardrobe;

import java.io.IOException;
import java.net.URI;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;

/** Personal local application: reject cross-origin mutations and DNS rebinding. */
@Component
public class LocalOnly implements Filter {
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest req=(HttpServletRequest)request;
        HttpServletResponse res=(HttpServletResponse)response;
        String host=req.getServerName();
        if(!host.equals("localhost") && !host.equals("127.0.0.1") && !host.equals("[::1]")) { res.sendError(403); return; }
        String origin=req.getHeader("Origin");
        if(origin!=null) {
            try {
                URI uri=URI.create(origin);
                if(!"http".equals(uri.getScheme()) || !("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost())) || !java.util.Set.of(5173,4173,8080).contains(uri.getPort())) { res.sendError(403); return; }
            } catch(IllegalArgumentException ex) { res.sendError(403); return; }
        }
        res.setHeader("X-Content-Type-Options","nosniff");
        res.setHeader("Referrer-Policy","same-origin");
        chain.doFilter(request,response);
    }
}
