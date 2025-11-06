package com.cs203g1t1.tariff.config;

import com.cs203g1t1.tariff.service.FirebaseService;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final FirebaseService firebaseService;
    
    public JwtAuthenticationFilter(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            // Someone (DevAuthFilter) already set an authenticated principal; skip Firebase.
            filterChain.doFilter(request, response);
            return;
        }
        
        // Skip JWT validation for public endpoints
        String path = request.getRequestURI();
        String method = request.getMethod();
        
        logger.debug("JWT Filter - Path: {}, Method: {}", path, method);
        
        if (isPublicEndpoint(path, method)) {
            logger.debug("Public endpoint detected, skipping JWT validation: {} {}", method, path);
            filterChain.doFilter(request, response);
            return;
        }
        
        logger.info("Protected endpoint detected, checking for JWT: {} {}", method, path);
        
        try {
            String token = extractTokenFromRequest(request);
            
            if (token != null) {
                logger.info("JWT token found, attempting verification. Token prefix: {}...", token.substring(0, Math.min(20, token.length())));
                
                // Verify the token with Firebase
                FirebaseToken decodedToken = firebaseService.verifyToken(token);
                
                // Extract user information
                String uid = decodedToken.getUid();
                String email = decodedToken.getEmail();
                
                logger.info("Firebase token verified successfully - UID: {}, Email: {}", uid, email);
                
                // Create authentication token with ROLE_USER authority
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        email != null ? email : uid, 
                        null, 
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                    );
                
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                // Set authentication in security context
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                logger.info("JWT authentication successful for user: {}", email != null ? email : uid);
            } else {
                logger.warn("No JWT token found in Authorization header for protected endpoint: {} {}", method, path);
            }
            
        } catch (FirebaseAuthException e) {
            logger.error("Firebase token verification failed: {} - Message: {}", e.getErrorCode(), e.getMessage());
            // Don't set authentication - request will be rejected by Spring Security
        } catch (Exception e) {
            logger.error("JWT authentication error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
        }
        
        filterChain.doFilter(request, response);
    }
    
    /**
     * Extract JWT token from Authorization header
     * Supports both "Bearer <token>" and raw token formats
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (bearerToken != null) {
            if (bearerToken.startsWith("Bearer ")) {
                return bearerToken.substring(7);
            } else if (!bearerToken.startsWith("Basic ")) {
                // If it's not Basic auth and doesn't have Bearer prefix, treat as raw token
                return bearerToken;
            }
        }
        
        return null;
    }
    
    /**
     * Check if the endpoint is public (doesn't require authentication)
     */
    private boolean isPublicEndpoint(String path, String method) {
        // Swagger & API docs
        if (path.startsWith("/v3/api-docs") ||
            path.startsWith("/swagger-ui") ||
            path.equals("/swagger-ui.html")) {
            return true;
        }
        
        // Health checks
        if (path.startsWith("/ping") ||
            path.startsWith("/api/tariffs/health")) {
            return true;
        }
        
        // OPTIONS requests (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        
        // Public tariff read endpoints - Only GET requests are public
        if ("GET".equalsIgnoreCase(method)) {
            if (path.equals("/api/tariffs") ||
                path.equals("/api/tariffs/effective") ||
                path.equals("/api/tariffs/effective/by-names") ||
                path.equals("/api/tariffs/by-product") ||
                path.equals("/api/tariffs/all") ||
                path.startsWith("/api/tariffs/by-hs/")) {
                return true;
            }
        }
        
        // All other requests (POST, PUT, DELETE) require authentication
        return false;
    }
}
