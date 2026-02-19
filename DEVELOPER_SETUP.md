# 🚀 Professor App - Developer Setup Guide

## 📦 What's Included

- Backend (FastAPI + Python)
- Frontend (React + Tailwind)
- MongoDB database structure
- All features fully implemented
- Environment configurations
- Complete documentation

## 🛠️ Local Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB (local or cloud)
- Git

### Backend Setup

1. Navigate to backend:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MongoDB URL
```

5. Run backend:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend will run on: http://localhost:8001

### Frontend Setup

1. Navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
yarn install
# or: npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit REACT_APP_BACKEND_URL=http://localhost:8001
```

4. Run frontend:
```bash
yarn start
# or: npm start
```

Frontend will run on: http://localhost:3000

### Database Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# macOS: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb
# Windows: Download from mongodb.com

# Start MongoDB
mongod --dbpath=/path/to/data
```

**Option B: MongoDB Atlas (Cloud - Free)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to backend/.env as MONGO_URL

### Seed Demo Data

```bash
cd backend
python seed_demo_data.py
```

This creates:
- 3 demo users
- 1 collaborative song
- Contribution logs
- Split proposals

## 🌐 Environment Variables

### Backend (.env):
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=professor_app
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env):
```
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI app
│   ├── requirements.txt       # Python dependencies
│   ├── seed_demo_data.py     # Demo data script
│   └── .env                   # Environment config
│
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── pages/            # All page components
│   │   │   ├── Landing.js    # Landing page
│   │   │   ├── Auth.js       # Login/Signup
│   │   │   ├── Dashboard.js  # Song dashboard
│   │   │   ├── Editor.js     # Lyric editor
│   │   │   ├── Network.js    # Social network
│   │   │   └── Messages.js   # Messaging
│   │   ├── components/       # Reusable components
│   │   │   ├── ProfileModal.js
│   │   │   ├── SplashScreen.js
│   │   │   ├── LogoBadge.js
│   │   │   └── ui/          # Shadcn components
│   │   └── App.css          # Global styles
│   ├── package.json         # Node dependencies
│   └── .env                 # Environment config
│
└── DEVELOPER_SETUP.md       # This file
```

## 🔧 Development Workflow

### Making Changes

1. **Backend changes:**
   - Edit files in `/backend/`
   - Server auto-reloads (--reload flag)
   - Test with curl or Postman

2. **Frontend changes:**
   - Edit files in `/frontend/src/`
   - Hot reload enabled
   - Changes appear instantly

3. **Database changes:**
   - Use MongoDB Compass (GUI)
   - Or mongosh (CLI)
   - Or directly in code

### Testing

**Backend API:**
```bash
curl http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"writer1@demo.com","password":"Demo123!"}'
```

**Frontend:**
- Open http://localhost:3000
- Login with demo accounts
- Test all features

## 📚 Key Features Implemented

### Authentication
- Email/password registration
- JWT token authentication
- Profile completion (mandatory)

### Profiles
- Multi-select roles
- Music styles selection
- Photo upload (base64)
- Bio with examples

### Collaboration
- Real-time lyric editor
- Character-level contribution tracking
- Collaborator management
- Version history

### Split Management (Pro)
- Manual split proposals
- Digital signatures
- PDF export
- Version tracking

### Social Network
- Discover creators
- Filter by role/style
- Direct messaging
- Referral system

### Monetization
- Free plan (3 songs limit)
- Pro plan ($19/mo - mocked)
- Credits system
- Referral rewards

## 🐛 Common Issues

### Backend won't start:
```bash
# Check MongoDB is running
mongosh

# Check port 8001 is free
lsof -i :8001

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start:
```bash
# Clear cache
rm -rf node_modules package-lock.json
yarn install

# Check port 3000 is free
lsof -i :3000
```

### Database connection error:
```bash
# Verify MongoDB URL in backend/.env
# Make sure MongoDB is running
# Check network connectivity
```

## 🚀 Deployment

See `/app/APP_STORE_SUBMISSION_GUIDE.md` for:
- Capacitor setup (mobile apps)
- App Store submission
- Cloud deployment
- Production configuration

## 📖 Additional Docs

- `/app/TESTING_GUIDE.md` - Testing instructions
- `/app/PRO_MODE_TESTING_GUIDE.md` - Pro features testing
- `/app/MOBILE_TESTING_GUIDE.md` - Mobile testing
- `/app/APP_STORE_SUBMISSION_GUIDE.md` - Store submission

## 💬 Demo Accounts

```
PRO Writer:
Email: writer1@demo.com
Password: Demo123!

PRO Producer:
Email: producer1@demo.com
Password: Demo123!

FREE Composer:
Email: composer1@demo.com
Password: Demo123!
```

## 🎯 Next Steps

1. Set up local environment
2. Test all features
3. Read documentation
4. Start developing!

## 📞 Questions?

Refer to the documentation files in `/app/` directory.

Good luck! 🚀
