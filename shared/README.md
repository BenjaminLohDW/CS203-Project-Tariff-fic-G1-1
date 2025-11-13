# Shared Firebase Authentication Module

This module provides JWT authentication for Flask microservices using Firebase Admin SDK.

## Installation

1. Add to your service's `requirements.txt`:
```
firebase-admin>=6.2.0
```

2. Install dependencies:
```bash
pip install firebase-admin
```

## Configuration

Set one of these environment variables:

- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON file
- `FIREBASE_CREDENTIALS_JSON` - Service account JSON as string (for AWS Secrets Manager)

## Usage

### Initialize Firebase (once per application)

```python
from shared.firebase_auth import initialize_firebase

# In your app.py, before defining routes
initialize_firebase()
```

### Protect Routes with JWT

```python
from shared.firebase_auth import require_jwt

@app.route('/protected', methods=['GET'])
@require_jwt
def protected_route():
    # Access authenticated user info
    user_id = request.user_id      # Firebase UID
    user_email = request.user_email  # User's email
    return jsonify({"user": user_email})
```

### Require Admin Role

```python
from shared.firebase_auth import require_admin
from app import db  # Your SQLAlchemy database

@app.route('/admin-only', methods=['POST'])
@require_admin(db)
def admin_route():
    # Only users with role='admin' can access
    return jsonify({"message": "Admin access granted"})
```

### Verify User Ownership

```python
from shared.firebase_auth import require_jwt, verify_user_ownership

@app.route('/user/<string:user_id>', methods=['PUT'])
@require_jwt
def update_user(user_id):
    # User can only update their own profile
    if not verify_user_ownership(user_id):
        return jsonify({"code": 403, "message": "Forbidden"}), 403
    
    # ... update logic
```

## Security Features

✅ **Firebase token verification** - Uses Firebase Admin SDK to validate JWT signatures  
✅ **Automatic token expiration** - Rejects expired tokens  
✅ **Role-based access control** - Admin decorator checks user role in database  
✅ **User ownership validation** - Users can only access their own data  
✅ **Standardized error responses** - Returns 401/403 with clear messages  

## Error Responses

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "No authentication token provided"
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Admin access required. Your role: user"
}
```

## Testing

Send requests with JWT token in Authorization header:

```bash
curl -H "Authorization: Bearer <firebase-jwt-token>" \
     http://localhost:5001/protected
```

## Logging

The module logs authentication events:
- ✅ Successful JWT verification
- ⚠️ Missing/invalid tokens
- ⚠️ Unauthorized access attempts
- 🔴 Admin access denials
