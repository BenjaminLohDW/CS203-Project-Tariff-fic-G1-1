#!/bin/bash
set -e

echo "Starting Country Service..."

# Check if we should use migrations or auto-create
if [ "$AUTO_CREATE_DB" = "0" ]; then
    echo "📝 AUTO_CREATE_DB=0: Using app-level table creation"
    python app.py
else
    echo "📝 Running database migrations..."
    flask db upgrade
    
    echo "🌐 Starting Flask application..."
    python app.py
fi
```
