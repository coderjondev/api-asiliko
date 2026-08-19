# 🚀 Deployment Guide - Asiliko AI Service

## 📋 Pre-Deployment Checklist

- [ ] `.env` fayli to'g'ri sozlangan
- [ ] MongoDB connection test qilingan
- [ ] Redis/Upstash connection test qilingan
- [ ] AI provider API keylari tekshirilgan
- [ ] SMTP email settings sozlangan
- [ ] S3/Object storage sozlangan (agar kerak bo'lsa)
- [ ] CORS origins to'g'ri ko'rsatilgan
- [ ] JWT_SECRET xavfsiz qilib yaratilgan
- [ ] Default admin credentials o'rnatilgan

---

## 🐳 Docker Deployment

### 1. Build Docker Image
```bash
docker build -t asiliko-api:latest .
```

### 2. Run with Docker Compose
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### 3. View Logs
```bash
docker-compose logs -f api
```

### 4. Stop
```bash
docker-compose down
```

---

## ☁️ Cloud Deployment Options

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

### Render
1. GitHub repository'ga push qiling
2. [Render Dashboard](https://dashboard.render.com) ga kiring
3. **New → Web Service** tanlang
4. Repository'ni ulang
5. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - Environment variables qo'shing

### DigitalOcean App Platform
1. GitHub repository'ga push qiling
2. [DigitalOcean Apps](https://cloud.digitalocean.com/apps) ga kiring
3. **Create App** → Repository tanlang
4. Environment variables qo'shing
5. Deploy

### AWS EC2
```bash
# SSH to EC2 instance
ssh -i key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/api-asiliko.git
cd api-asiliko

# Install dependencies
npm install

# Setup environment
nano .env
# (paste your environment variables)

# Start with PM2
pm2 start src/server.js --name asiliko-api
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/asiliko-api
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name api.asiliko.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/asiliko-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.asiliko.com
```

---

## 🔐 Environment Variables Setup

### Required
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your_long_random_secret_here
```

### AI Providers (at least one)
```env
DEEPSEEK_API_KEY=sk-xxx
GEMINI_API_KEY=AIzaxxx
```

### Optional but Recommended
```env
# Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=https://app.asiliko.com

# S3/Storage (if using file uploads)
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=asiliko-files
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx

# Security
CORS_ORIGINS=https://app.asiliko.com,https://admin.asiliko.com
TRUST_PROXY=true
```

---

## 📊 MongoDB Setup

### MongoDB Atlas (Recommended)

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) ga ro'yxatdan o'ting
2. **Create New Cluster**
3. **Database Access** → User yarating
4. **Network Access** → IP Whitelist qo'shing:
   - Development: `0.0.0.0/0` (all)
   - Production: Server IP manzili
5. **Connect** → Connection string oling

### Self-Hosted MongoDB
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Connection string
MONGO_URI=mongodb://localhost:27017/asiliko
```

---

## 🔴 Redis Setup (Optional but Recommended)

### Upstash (Recommended - Free tier)

1. [Upstash](https://upstash.com) ga kiring
2. **Create Database** → Redis
3. **REST API** tab dan URL va Token oling
4. `.env` ga qo'shing

### Self-Hosted Redis
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test
redis-cli ping
# Should return: PONG
```

---

## 📧 Email Setup

### Gmail App Password

1. Google Account → Security
2. **2-Step Verification** yoqing
3. **App passwords** yarating
4. Password ni `.env` ga qo'shing:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASS=your-mailgun-password
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
```bash
# NEVER commit .env file
echo ".env" >> .gitignore

# Generate strong secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. MongoDB
- Strong password ishlatish
- IP whitelist sozlash
- Database user'ga minimal permissions berish

### 3. API Security
- CORS origins aniq ko'rsatish
- Rate limiting yoqish
- Helmet middleware ishlatish
- HTTPS majburiy qilish

### 4. API Keys
- Regular rotation
- Expire dates o'rnatish
- Unused keylarni o'chirish

---

## 📈 Monitoring & Logging

### PM2 Monitoring
```bash
# Status
pm2 status

# Logs
pm2 logs asiliko-api

# Monitoring
pm2 monit

# Restart
pm2 restart asiliko-api

# Stop
pm2 stop asiliko-api
```

### Log Files
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Access logs
tail -f logs/access.log
```

### Health Check Monitoring

**UptimeRobot / Pingdom:**
- Monitor: `https://api.asiliko.com/health`
- Interval: 5 minutes
- Alert via: Email/SMS

---

## 🧪 Testing Before Deploy

### 1. Local Test
```bash
npm start
curl http://localhost:5000/health
```

### 2. Environment Variables Test
```bash
# Check all required vars are set
node -e "
const required = ['MONGO_URI', 'JWT_SECRET', 'DEEPSEEK_API_KEY'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing:', missing.join(', '));
  process.exit(1);
}
console.log('All required vars present ✓');
"
```

### 3. Database Connection Test
```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => { console.log('MongoDB OK ✓'); process.exit(0); })
  .catch(err => { console.error('MongoDB Error:', err); process.exit(1); });
"
```

---

## 🔄 CI/CD Setup

### GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

---

## 📦 Database Migration

### Initial Setup
```bash
# Connect to MongoDB
mongosh "your-connection-string"

# Create indexes
use asiliko
db.users.createIndex({ email: 1 }, { unique: true })
db.apikeys.createIndex({ userId: 1 })
db.apikeys.createIndex({ hashedKey: 1 }, { unique: true })
db.prompts.createIndex({ userId: 1, createdAt: -1 })
db.requestlogs.createIndex({ createdAt: -1 })
db.webhooks.createIndex({ userId: 1 })
```

---

## 🎯 Post-Deployment

### 1. Verify Health
```bash
curl https://api.asiliko.com/health
```

### 2. Create Admin User
```bash
curl -X POST https://api.asiliko.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@asiliko.com",
    "password": "secure-password",
    "name": "Admin"
  }'

# Manually promote to admin in MongoDB
mongosh "connection-string"
db.users.updateOne(
  { email: "admin@asiliko.com" },
  { $set: { role: "admin" } }
)
```

### 3. Test Core Features
- [ ] User registration
- [ ] Login
- [ ] AI chat
- [ ] API key creation
- [ ] File upload (if enabled)
- [ ] Webhook creation (if enabled)
- [ ] Admin dashboard

### 4. Setup Monitoring
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic / DataDog)
- [ ] Log aggregation (Papertrail / LogDNA)

---

## 🆘 Troubleshooting

### MongoDB Connection Failed
```bash
# Check connection string
# Check IP whitelist
# Check credentials
# Test connection:
mongosh "your-connection-string" --eval "db.adminCommand('ping')"
```

### Redis Connection Failed
```bash
# Check Upstash URL and token
# Test connection:
curl -H "Authorization: Bearer YOUR_TOKEN" YOUR_REDIS_URL/ping
```

### API Not Responding
```bash
# Check process
pm2 status

# Check logs
pm2 logs asiliko-api --lines 50

# Check port
netstat -tulpn | grep 5000

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### High Memory Usage
```bash
# Check memory
pm2 status
free -h

# Restart if needed
pm2 restart asiliko-api
```

---

## 📞 Support

- Documentation: `/API_DOCUMENTATION.md`
- Issues: GitHub Issues
- Email: support@asiliko.com

---

**Deployment Date:** 2026-08-19
**Version:** 1.0.0
