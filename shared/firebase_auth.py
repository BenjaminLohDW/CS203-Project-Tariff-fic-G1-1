"""
Shared Firebase JWT Authentication for Flask Microservices

This module provides JWT token verification using Firebase Admin SDK.
Use the decorators to protect Flask routes that require authentication.

Usage:
    from shared.firebase_auth import require_jwt, require_admin

    @app.route('/protected', methods=['GET'])
    @require_jwt
    def protected_route():
        # Access user info via request.user_id and request.user_email
        return jsonify({"user": request.user_email})

    @app.route('/admin-only', methods=['POST'])
    @require_admin
    def admin_route():
        # Only users with role='admin' can access
        return jsonify({"message": "Admin access granted"})
"""

from functools import wraps
from flask import request, jsonify, g
import firebase_admin
from firebase_admin import auth, credentials
import os
import logging

logger = logging.getLogger(__name__)

# Global flag to track Firebase initialization
_firebase_initialized = False


def initialize_firebase():
    """
    Initialize Firebase Admin SDK (call once per application)
    
    Supports multiple credential sources:
    1. FIREBASE_CREDENTIALS_JSON environment variable (JSON string)
    2. GOOGLE_APPLICATION_CREDENTIALS environment variable (file path)
    3. Application Default Credentials
    """
    global _firebase_initialized
    
    if _firebase_initialized:
        logger.info("Firebase already initialized")
        return
    
    try:
        # Check if Firebase is already initialized by another module
        if firebase_admin._apps:
            logger.info("Firebase already initialized by another module")
            _firebase_initialized = True
            return
        
        # Try to get credentials from environment variable (JSON string)
        firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
        if firebase_creds_json:
            try:
                import json
                from io import StringIO
                cred_dict = json.loads(firebase_creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized from FIREBASE_CREDENTIALS_JSON environment variable")
                _firebase_initialized = True
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Firebase from FIREBASE_CREDENTIALS_JSON: {e}")
        
        # Try to get credentials from file path
        service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if service_account_path and os.path.exists(service_account_path):
            try:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                logger.info(f"Firebase initialized from service account key: {service_account_path}")
                _firebase_initialized = True
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Firebase from service account file: {e}")
        
        # Try Application Default Credentials
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized with Application Default Credentials")
            _firebase_initialized = True
            return
        except Exception as e:
            logger.warning(f"Failed to initialize Firebase with Application Default Credentials: {e}")
        
        # If all methods fail
        logger.error("Firebase initialization failed: No valid credentials found")
        logger.error("Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CREDENTIALS_JSON environment variable")
        
    except Exception as e:
        logger.error(f"Firebase initialization error: {e}")


def verify_firebase_token(token: str) -> dict:
    """
    Verify Firebase JWT token and return decoded token
    
    Args:
        token: Firebase ID token (JWT)
    
    Returns:
        dict: Decoded token with user information (uid, email, etc.)
    
    Raises:
        Exception: If token is invalid or Firebase is not initialized
    """
    if not _firebase_initialized:
        raise Exception("Firebase not initialized. Call initialize_firebase() first.")
    
    try:
        # Verify the token with Firebase
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise Exception("Token has expired")
    except auth.RevokedIdTokenError:
        raise Exception("Token has been revoked")
    except auth.InvalidIdTokenError:
        raise Exception("Invalid token")
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")


def require_jwt(f):
    """
    Decorator to require valid JWT token for Flask routes
    
    Sets request.user_id and request.user_email if token is valid
    Returns 401 if token is missing or invalid
    
    Usage:
        @app.route('/protected', methods=['GET'])
        @require_jwt
        def protected_route():
            return jsonify({"user_id": request.user_id})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header:
            logger.warning("No Authorization header provided")
            return jsonify({
                "code": 401,
                "message": "No authentication token provided"
            }), 401
        
        # Support both "Bearer <token>" and raw token formats
        token = auth_header.replace('Bearer ', '').replace('bearer ', '')
        
        if not token:
            logger.warning("Empty token in Authorization header")
            return jsonify({
                "code": 401,
                "message": "Invalid authentication token format"
            }), 401
        
        try:
            # Verify token with Firebase
            decoded_token = verify_firebase_token(token)
            
            # Store user information in request context
            request.user_id = decoded_token.get('uid')
            request.user_email = decoded_token.get('email')
            request.user_name = decoded_token.get('name')
            
            # Also store in Flask's g object for easier access
            g.user_id = request.user_id
            g.user_email = request.user_email
            
            logger.info(f"JWT verified for user: {request.user_email} (UID: {request.user_id})")
            
            # Call the actual route function
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            return jsonify({
                "code": 401,
                "message": f"Authentication failed: {str(e)}"
            }), 401
    
    return decorated_function


def require_admin(user_service_db):
    """
    Decorator factory to require admin role for Flask routes
    
    Verifies JWT token AND checks that user has role='admin' in User service database
    
    Args:
        user_service_db: SQLAlchemy database instance from User service
    
    Usage:
        from app import db, User
        from shared.firebase_auth import require_admin
        
        @app.route('/admin-only', methods=['POST'])
        @require_admin(db)
        def admin_route():
            return jsonify({"message": "Admin access granted"})
    
    Note: This requires the User model to be available in the calling service
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First verify JWT token
            auth_header = request.headers.get('Authorization', '')
            
            if not auth_header:
                logger.warning("No Authorization header provided")
                return jsonify({
                    "code": 401,
                    "message": "No authentication token provided"
                }), 401
            
            token = auth_header.replace('Bearer ', '').replace('bearer ', '')
            
            if not token:
                return jsonify({
                    "code": 401,
                    "message": "Invalid authentication token format"
                }), 401
            
            try:
                # Verify token with Firebase
                decoded_token = verify_firebase_token(token)
                user_id = decoded_token.get('uid')
                user_email = decoded_token.get('email')
                
                # Store user info in request context
                request.user_id = user_id
                request.user_email = user_email
                g.user_id = user_id
                g.user_email = user_email
                
                # Import User model from the calling service
                # This assumes the service has a User model with user_id and role fields
                try:
                    from app import User
                    # Check user role in database
                    user = user_service_db.session.get(User, user_id)
                    
                    if not user:
                        logger.warning(f"User not found in database: {user_id}")
                        return jsonify({
                            "code": 403,
                            "message": "User not found in system"
                        }), 403
                    
                    if user.role != 'admin':
                        logger.warning(f"Non-admin user attempted admin access: {user_email} (role: {user.role})")
                        return jsonify({
                            "code": 403,
                            "message": "Admin access required. Your role: " + user.role
                        }), 403
                    
                except ImportError:
                    # If User model not available (e.g., in Agreement service),
                    # check admin role via User service API
                    logger.info("User model not available, checking role via User service API")
                    import requests
                    
                    user_service_url = os.getenv('USER_SERVICE_URL', 'http://user:5001')
                    try:
                        response = requests.get(
                            f"{user_service_url}/user/{user_id}",
                            headers={'Authorization': f'Bearer {token}'},
                            timeout=5
                        )
                        
                        if response.status_code == 404:
                            logger.warning(f"User not found in User service: {user_id}")
                            return jsonify({
                                "code": 403,
                                "message": "User not found in system"
                            }), 403
                        
                        if response.status_code != 200:
                            logger.error(f"Failed to check user role: HTTP {response.status_code}")
                            return jsonify({
                                "code": 500,
                                "message": "Failed to verify user permissions"
                            }), 500
                        
                        user_data = response.json().get('data', {})
                        user_role = user_data.get('role')
                        
                        if user_role != 'admin':
                            logger.warning(f"Non-admin user attempted admin access: {user_email} (role: {user_role})")
                            return jsonify({
                                "code": 403,
                                "message": f"Admin access required. Your role: {user_role}"
                            }), 403
                        
                    except requests.RequestException as e:
                        logger.error(f"Failed to connect to User service: {e}")
                        return jsonify({
                            "code": 500,
                            "message": "Failed to verify user permissions"
                        }), 500
                
                logger.info(f"Admin access granted to: {user_email}")
                
                # Call the actual route function
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Admin verification failed: {e}")
                return jsonify({
                    "code": 401,
                    "message": f"Authentication failed: {str(e)}"
                }), 401
        
        return decorated_function
    return decorator


def verify_user_ownership(user_id_param: str) -> bool:
    """
    Verify that the authenticated user matches the user_id in the request
    
    Used for endpoints where users can only access their own data
    
    Args:
        user_id_param: The user_id from the URL parameter or request body
    
    Returns:
        bool: True if user owns the resource, False otherwise
    
    Usage:
        @app.route('/user/<string:user_id>', methods=['PUT'])
        @require_jwt
        def update_user(user_id):
            if not verify_user_ownership(user_id):
                return jsonify({"error": "Forbidden"}), 403
            # ... update logic
    """
    if not hasattr(request, 'user_id'):
        logger.error("verify_user_ownership called without JWT verification")
        return False
    
    if request.user_id != user_id_param:
        logger.warning(f"User {request.user_email} attempted to access user_id {user_id_param}")
        return False
    
    return True
