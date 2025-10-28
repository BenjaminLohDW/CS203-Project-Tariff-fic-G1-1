package com.cs203g1t1.tariff.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Service
public class FirebaseService {
    
    private static final Logger logger = LoggerFactory.getLogger(FirebaseService.class);
    
    @Value("${FIREBASE_CREDENTIALS_JSON:}")
    private String firebaseCredentialsJson;
    
    @PostConstruct
    public void initialize() {
        try {
            // Check if Firebase is already initialized
            if (FirebaseApp.getApps().isEmpty()) {

                // Try AWS Secrets Manager first
                if (firebaseCredentialsJson != null && !firebaseCredentialsJson.trim().isEmpty()) {
                    try {
                        logger.info("Loading Firebase credentials from FIREBASE_CREDENTIALS_JSON (AWS Secrets Manager)");
                        try (InputStream stream = new ByteArrayInputStream(
                                firebaseCredentialsJson.getBytes(StandardCharsets.UTF_8))) {
                            FirebaseOptions options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(stream))
                                .build();
                            FirebaseApp.initializeApp(options);
                            logger.info("Firebase initialized successfully from AWS Secrets Manager");
                            return;
                        }
                    } catch (Exception e) {
                        logger.warn("Failed to initialize Firebase from FIREBASE_CREDENTIALS_JSON: {}", e.getMessage());
                    }
                }
                
                // Try to get credentials from environment variable 
                String serviceAccountPath = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
                
                if (serviceAccountPath != null && !serviceAccountPath.isEmpty()) {
                    try {
                        FileInputStream serviceAccount = new FileInputStream(serviceAccountPath);
                        FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();
                        FirebaseApp.initializeApp(options);
                        logger.info("Firebase initialized with service account key from GOOGLE_APPLICATION_CREDENTIALS");
                        return;
                    } catch (Exception e) {
                        logger.warn("Failed to initialize Firebase with service account key: {}", e.getMessage());
                    }
                }
                
                // Try Application Default Credentials
                try {
                    FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.getApplicationDefault())
                        .build();
                    FirebaseApp.initializeApp(options);
                    logger.info("Firebase initialized with Application Default Credentials");
                    return;
                } catch (IOException e) {
                    logger.warn("Failed to initialize Firebase with Application Default Credentials: {}", e.getMessage());
                }
                
                // If all methods fail, log warning but don't crash the application
                logger.warn("Firebase credentials not found. JWT authentication will not work until Firebase is configured.");
                logger.warn("To configure Firebase, set GOOGLE_APPLICATION_CREDENTIALS environment variable or run 'gcloud auth application-default login'");
                logger.warn("Public endpoints will still work. Admin operations (create/update/delete) will return 401 until Firebase is configured.");
            } else {
                logger.info("Firebase already initialized");
            }
        } catch (Exception e) {
            logger.warn("Firebase initialization skipped: {}", e.getMessage());
            logger.warn("Public endpoints will work. Admin operations require Firebase configuration.");
        }
    }
    
    /**
     * Verify Firebase JWT token
     * @param idToken The Firebase ID token from the client
     * @return FirebaseToken containing user information
     * @throws FirebaseAuthException if token is invalid or Firebase is not initialized
     */
    public FirebaseToken verifyToken(String idToken) throws FirebaseAuthException {
        if (FirebaseApp.getApps().isEmpty()) {
            logger.error("Cannot verify token: Firebase is not initialized");
            throw new FirebaseAuthException(
                com.google.firebase.ErrorCode.UNAUTHENTICATED,
                "Firebase is not initialized. Please configure Firebase credentials.",
                null,
                null,
                null
            );
        }
        return FirebaseAuth.getInstance().verifyIdToken(idToken);
    }
    
    /**
     * Extract user ID from token
     * @param idToken The Firebase ID token
     * @return User ID (UID)
     * @throws FirebaseAuthException if token is invalid
     */
    public String getUserId(String idToken) throws FirebaseAuthException {
        FirebaseToken decodedToken = verifyToken(idToken);
        return decodedToken.getUid();
    }
    
    /**
     * Extract user email from token
     * @param idToken The Firebase ID token
     * @return User email
     * @throws FirebaseAuthException if token is invalid
     */
    public String getUserEmail(String idToken) throws FirebaseAuthException {
        FirebaseToken decodedToken = verifyToken(idToken);
        return decodedToken.getEmail();
    }
}
