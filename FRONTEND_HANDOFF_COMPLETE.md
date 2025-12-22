# 🏠 VISION CORTEX REAL ESTATE INTELLIGENCE - FRONTEND HANDOFF

**Service**: Vision Cortex Real Estate Intelligence  
**Version**: 2.0.0  
**Base URL**: `https://vision-cortex-real-estate-intelligence.run.app`  
**Local Dev**: `http://localhost:8080`  
**Date**: December 12, 2025  

---

## 🎯 SYSTEM OVERVIEW

**Vision Cortex Real Estate Intelligence** is an AI-powered system that predicts market breaks before they happen. It provides asymmetric, forward-looking intelligence for real estate investors, agents, and professionals.

### **Core Capabilities**
- 🧠 **Quantum Intelligence Synthesis** - Multi-LLM analysis with confidence scoring
- 📊 **Predictive Market Analytics** - Price predictions and trend analysis
- 🎯 **Signal Detection** - Early market shift indicators
- 🚨 **Anomaly Detection** - Unusual market pattern identification
- 💼 **CRM & Portfolio Management** - Lead tracking and portfolio analytics
- 📈 **Real-time Streaming** - WebSocket intelligence feeds
- 🔍 **Advanced Property Search** - Multi-criteria property discovery
- 🔐 **Enterprise Authentication** - JWT-based secure access

---

## 🌐 API ENDPOINTS REFERENCE

### **Vision Cortex Intelligence Endpoints**

#### **POST** `/vision-cortex/intelligence/real-estate/synthesize`
**Primary Intelligence Generation Endpoint**

```typescript
// Request
interface SynthesisRequest {
  domain: 'real_estate';
  question: string;
  constraints?: {
    region?: string;
    capital_type?: 'cash' | 'financed' | 'partnership' | 'fund';
    risk_profile?: 'conservative' | 'moderate' | 'aggressive';
    time_frame?: string;
    budget_range?: { min: number; max: number };
  };
  context?: {
    user_history?: any[];
    market_conditions?: any;
    external_signals?: any[];
  };
}

// Response
interface SynthesisResponse {
  success: true;
  intelligence_type: 'real_estate_synthesis';
  data: RealEstateIntelligence;
  generated_at: string;
  processing_time: number;
}
```

**Example Request:**
```json
{
  "domain": "real_estate",
  "question": "What are the best investment opportunities in Port St. Lucie, FL for the next 6 months?",
  "constraints": {
    "region": "Port St. Lucie, FL",
    "budget_range": { "min": 200000, "max": 500000 },
    "risk_profile": "moderate",
    "time_frame": "6 months"
  }
}
```

#### **GET** `/vision-cortex/intelligence/real-estate/signals`
**Real Estate Market Signals**

**Query Parameters:**
- `region` (string): Geographic filter
- `signal_types` (string[]): Types of signals to return
- `min_strength` (number): Minimum signal strength (0-1)

**Response:**
```typescript
interface SignalResponse {
  success: true;
  intelligence_type: 'real_estate_signals';
  data: RealEstateSignal[];
  timestamp: string;
}
```

#### **GET** `/vision-cortex/intelligence/real-estate/anomalies`
**Market Anomaly Detection**

**Query Parameters:**
- `region` (string): Geographic filter
- `detection_window` (string): Time window (e.g., "30d", "90d")
- `severity_threshold` (number): Minimum severity (0-1)

---

### **Real Estate Search Engine**

#### **GET** `/api/v1/search/locations`
**Available Locations for Search Dropdowns**

```typescript
interface LocationsResponse {
  success: true;
  data: {
    countries: string[];
    states: string[];
    counties: string[];
    cities: string[];
  };
}
```

#### **GET** `/api/v1/search/asset-types`
**Available Asset Types**

```typescript
interface AssetTypesResponse {
  success: true;
  data: ['sfh', 'multifamily', 'commercial', 'land'];
}
```

#### **GET** `/api/v1/search/properties`
**Property Search with Filters**

**Query Parameters:**
- `location` (object): Location filters
- `asset_type` (string): Property type filter
- `price_range` (object): Min/max price filters
- `limit` (number): Results limit
- `offset` (number): Pagination offset

#### **GET** `/api/v1/search/opportunities`
**Investment Opportunities**

Returns scored investment opportunities based on AI analysis.

---

### **Predictive Analytics**

#### **GET** `/api/v1/analytics/market-trends`
**Market Trend Analysis**

**Query Parameters:**
- `location` (string, required): Geographic region
- `timeframe` (string): "30d", "90d", "1y" (default: "30d")

```typescript
interface MarketTrendsResponse {
  success: true;
  data: {
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    key_drivers: string[];
    timeframe: string;
  };
  location: string;
  timeframe: string;
}
```

#### **GET** `/api/v1/analytics/price-predictions`
**AI Price Predictions**

**Query Parameters:**
- `location` (string, required): Geographic region  
- `asset_type` (string): Property type filter

```typescript
interface PricePredictionsResponse {
  success: true;
  data: {
    asset_type: string;
    location: string;
    current_price: number;
    predicted_price_30d: number;
    predicted_price_90d: number;
    predicted_price_1y: number;
    confidence_intervals: {
      '30d': [number, number];
      '90d': [number, number];
      '1y': [number, number];
    };
  }[];
  generated_at: string;
}
```

#### **GET** `/api/v1/analytics/opportunity-scores`
**Investment Opportunity Scoring**

Returns AI-generated opportunity scores (0-100) for different locations and asset types.

#### **GET** `/api/v1/analytics/dashboard`
**Complete Dashboard Data** 🔐 *Requires Auth*

Combines multiple analytics into a single response for dashboard display.

```typescript
interface DashboardResponse {
  success: true;
  data: {
    latest_intelligence: RealEstateIntelligence[];
    market_trends: MarketTrends;
    opportunities: OpportunityScore[];
    portfolio: Portfolio | null;
    user_preferences: UserPreferences;
  };
  timestamp: string;
}
```

---

### **Authentication System**

#### **POST** `/api/v1/auth/login`
**User Login**

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response
interface LoginResponse {
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'premium';
    subscription_tier: 'free' | 'professional' | 'enterprise';
  };
  expires_in: number;
}
```

#### **POST** `/api/v1/auth/register`
**User Registration**

#### **POST** `/api/v1/auth/logout`
**User Logout**

#### **GET** `/api/v1/auth/profile` 🔐
**Get User Profile**

---

### **CRM & Lead Management** 🔐 *All Require Auth*

#### **GET** `/api/v1/crm/leads`
**Get User Leads**

```typescript
interface Lead {
  id: string;
  property_address: string;
  property_type: 'sfh' | 'multifamily' | 'commercial' | 'land';
  asking_price: number;
  estimated_value: number;
  status: 'new' | 'contacted' | 'viewing_scheduled' | 'offer_made' | 'under_contract' | 'closed' | 'dead';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  financial_analysis?: {
    cap_rate?: number;
    cash_on_cash_return?: number;
    monthly_rent_potential?: number;
  };
}
```

#### **POST** `/api/v1/crm/leads`
**Create New Lead**

#### **PUT** `/api/v1/crm/leads/:id`
**Update Lead**

#### **GET** `/api/v1/crm/portfolio`
**Get User Portfolio**

---

### **System Status & Health**

#### **GET** `/health`
**Health Check**

```typescript
interface HealthResponse {
  status: 'healthy' | 'initializing';
  service: 'vision-cortex-real-estate-intelligence';
  version: '2.0.0';
  timestamp: string;
  uptime: number;
  intelligence_engine: boolean;
  integrations: {
    firestore: boolean;
    pubsub: boolean;
    llm_orchestrator: boolean;
  };
}
```

#### **GET** `/vision-cortex/status`
**Service Capabilities**

```typescript
interface StatusResponse {
  service: 'real-estate-intelligence';
  status: 'operational' | 'initializing';
  capabilities: string[];
  last_intelligence_generated: string;
  cache_size: number;
}
```

#### **GET** `/api/docs`
**API Documentation**

Returns complete API endpoint documentation.

---

## 🔌 WEBSOCKET STREAMING

**Endpoint**: `wss://vision-cortex-real-estate-intelligence.run.app/ws`  
**Local**: `ws://localhost:8080/ws`

### **Connection & Subscription**

```javascript
const socket = io('wss://vision-cortex-real-estate-intelligence.run.app');

// Subscribe to intelligence stream
socket.emit('subscribe:intelligence', {
  intelligence_types: ['prediction', 'signal', 'anomaly'],
  regions: ['Port St. Lucie, FL', 'Florida'],
  confidence_threshold: 0.7,
  real_time: true
});

// Handle new intelligence
socket.on('intelligence:new', (data) => {
  console.log('New Intelligence:', data.intelligence);
  // Update UI with new intelligence
});

// Handle market updates
socket.on('market:update', (data) => {
  console.log('Market Update:', data.update);
  // Update dashboard metrics
});

// Request real-time market data
socket.emit('request:market-data', {
  region: 'Port St. Lucie, FL'
});

socket.on('market:data', (data) => {
  console.log('Market Data:', data);
  // Update real-time charts
});
```

---

## 📊 DATA MODELS

### **RealEstateIntelligence**
```typescript
interface RealEstateIntelligence {
  id: string;
  domain: 'real_estate';
  intelligence_type: 'prediction' | 'signal' | 'anomaly' | 'synthesis';
  confidence: number; // 0.0 - 1.0
  time_horizon: 'immediate' | 'short' | 'mid' | 'long';
  visibility: 'public' | 'preview' | 'classified';
  
  summary: string;
  why_it_matters: string;
  supporting_signals: string[];
  recommended_actions: string[];
  
  // Real Estate Specific
  geography: {
    country?: string;
    state?: string;
    county?: string;
    city?: string;
  };
  asset_profile: {
    asset_type?: 'sfh' | 'multifamily' | 'commercial' | 'land';
    price_band?: string;
    investor_type?: 'retail' | 'institutional' | 'private_capital';
  };
  conviction_level: 'low' | 'medium' | 'high' | 'extreme';
  headline: string;
  executive_summary: string;
  predictive_insights: PredictiveInsight[];
  real_estate_signals: RealEstateSignal[];
  generated_at: string;
  source_models: string[];
}
```

### **RealEstateSignal**
```typescript
interface RealEstateSignal {
  signal_type: 'liquidity' | 'inventory' | 'pricing' | 'foreclosure' | 'insurance' | 'migration' | 'capital_flow';
  name: string;
  strength: number; // 0.0 - 1.0
  direction: 'up' | 'down' | 'flat';
  velocity: number;
  description: string;
  historical_data: Array<{ timestamp: string; value: number }>;
}
```

### **PredictiveInsight**
```typescript
interface PredictiveInsight {
  insight: string;
  probability: number;
  expected_window: string;
  asymmetric_upside: boolean;
  confidence_interval: [number, number];
}
```

---

## 🔐 AUTHENTICATION

### **JWT Token Usage**

```javascript
// Set authorization header
const token = localStorage.getItem('auth_token');

fetch('/api/v1/analytics/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### **Authentication States**
- **🔓 Public**: Health, docs, basic search
- **🔐 Authenticated**: Dashboard, CRM, premium analytics  
- **👑 Premium**: Advanced intelligence, real-time streaming

---

## ⚡ FRONTEND INTEGRATION EXAMPLES

### **React Hook for Intelligence**

```typescript
import { useState, useEffect } from 'react';

interface UseIntelligenceProps {
  question: string;
  constraints?: any;
}

export const useIntelligence = ({ question, constraints }: UseIntelligenceProps) => {
  const [intelligence, setIntelligence] = useState<RealEstateIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const synthesize = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/vision-cortex/intelligence/real-estate/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          domain: 'real_estate',
          question,
          constraints
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIntelligence(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to synthesize intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (question) {
      synthesize();
    }
  }, [question, constraints]);

  return { intelligence, loading, error, synthesize };
};
```

### **Market Data Component**

```typescript
import React, { useState, useEffect } from 'react';

export const MarketTrends: React.FC<{ location: string }> = ({ location }) => {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      const response = await fetch(`/api/v1/analytics/market-trends?location=${encodeURIComponent(location)}`);
      const data = await response.json();
      setTrends(data.data);
      setLoading(false);
    };

    fetchTrends();
  }, [location]);

  if (loading) return <div>Loading market trends...</div>;

  return (
    <div className="market-trends">
      <h3>Market Trends - {location}</h3>
      <div className={`trend ${trends.direction}`}>
        <span>{trends.direction.toUpperCase()}</span>
        <span>{(trends.confidence * 100).toFixed(1)}% confidence</span>
      </div>
      <ul>
        {trends.key_drivers.map((driver, i) => (
          <li key={i}>{driver}</li>
        ))}
      </ul>
    </div>
  );
};
```

### **Real-time Intelligence Feed**

```typescript
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

export const IntelligenceFeed: React.FC = () => {
  const [intelligence, setIntelligence] = useState<RealEstateIntelligence[]>([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:8080');
    
    newSocket.emit('subscribe:intelligence', {
      intelligence_types: ['prediction', 'signal'],
      regions: ['Port St. Lucie, FL'],
      confidence_threshold: 0.7,
      real_time: true
    });

    newSocket.on('intelligence:new', (data) => {
      setIntelligence(prev => [data.intelligence, ...prev.slice(0, 9)]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <div className="intelligence-feed">
      <h3>🧠 Live Intelligence Feed</h3>
      {intelligence.map((item) => (
        <div key={item.id} className={`intelligence-card ${item.conviction_level}`}>
          <h4>{item.headline}</h4>
          <p>{item.summary}</p>
          <div className="metadata">
            <span>Confidence: {(item.confidence * 100).toFixed(1)}%</span>
            <span>Type: {item.intelligence_type}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 🚀 DEPLOYMENT & ENVIRONMENT

### **Environment Variables**

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
JWT_SECRET=your_jwt_secret

# Optional
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
GOOGLE_CLOUD_PROJECT=infinity-x-one-systems
```

### **Google Cloud Run Deployment**

The system is optimized for Google Cloud Run with:
- ✅ Health check endpoint (`/health`)
- ✅ Graceful shutdown handling
- ✅ Port configuration from `PORT` env var
- ✅ Cloud logging integration
- ✅ Firestore and Pub/Sub connectivity

### **Local Development**

```bash
cd vision_cortex
npm install
npm run dev
# Server runs on http://localhost:8080
```

---

## 📋 ERROR HANDLING

### **Standard Error Response**
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  request_id: string;
}
```

### **Common Error Codes**
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid token
- `INSUFFICIENT_PERMISSIONS` (403): Role/subscription limitations
- `INTELLIGENCE_SYNTHESIS_FAILED` (500): AI processing error
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

---

## 🎨 UI/UX RECOMMENDATIONS

### **Intelligence Display**
- Use **confidence scores** to show reliability (color coding)
- Display **conviction levels** with visual indicators
- Show **time horizons** with countdown timers
- Highlight **asymmetric opportunities** prominently

### **Real-time Updates**
- Use WebSocket for live intelligence feeds
- Implement optimistic UI updates
- Show loading states during synthesis
- Cache intelligence for offline viewing

### **Responsive Design**
- Mobile-first dashboard design
- Touch-friendly property search
- Swipeable intelligence cards
- Collapsible analytics panels

---

## 📞 SUPPORT & CONTACT

**Service Team**: Infinity X One Systems  
**Documentation**: This document  
**Health Monitoring**: `/health` and `/vision-cortex/status`  
**API Documentation**: `/api/docs`

---

**🚀 Ready for Frontend Integration!** This comprehensive system provides everything needed for a world-class real estate intelligence platform.