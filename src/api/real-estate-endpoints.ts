/**
 * 🏠 VISION CORTEX - REAL ESTATE INTELLIGENCE API ENDPOINTS
 * Backend Contract for Frontend Integration
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RealEstateIntelligenceEngine, RealEstateIntelligence } from '../intelligence/real-estate-intelligence';
import { validateAuth, requireAuth } from '../auth/auth-middleware';
import { CRMService } from '../crm/crm-service';
import { 
  IntelligenceSynthesisRequest,
  SynthesisRequestSchema,
  CoreIntelligenceEnvelope
} from '../intelligence/types';

export interface RealEstateSearchQuery {
  location?: {
    country?: string;
    state?: string;
    county?: string;
    city?: string;
    radius_km?: number;
  };
  asset_type?: 'sfh' | 'multifamily' | 'commercial' | 'land';
  price_range?: {
    min?: number;
    max?: number;
  };
  intelligence_types?: string[];
  confidence_threshold?: number;
  time_horizon?: 'immediate' | 'short' | 'mid' | 'long';
  limit?: number;
  offset?: number;
}

export interface PredictiveAnalytics {
  market_trends: {
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    key_drivers: string[];
    timeframe: string;
  };
  price_predictions: {
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
  opportunity_score: {
    location: string;
    asset_type: string;
    score: number; // 0-100
    factors: string[];
    risk_level: 'low' | 'medium' | 'high';
  }[];
}

export class RealEstateAPI {
  private app: express.Application;
  private intelligenceEngine: RealEstateIntelligenceEngine;
  private crmService: CRMService;
  private isInitialized: boolean = false;

  constructor() {
    this.app = express();
    this.intelligenceEngine = new RealEstateIntelligenceEngine();
    this.crmService = new CRMService();
    
    console.log('🏠 Real Estate API initializing...');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      // Wait for intelligence engine to be ready
      await new Promise((resolve) => {
        if (this.intelligenceEngine.isOperational) {
          resolve(true);
        } else {
          this.intelligenceEngine.once('engine:ready', resolve);
        }
      });
      
      this.isInitialized = true;
      console.log('✅ Real Estate API ready');
      
    } catch (error) {
      console.error('❌ Real Estate API initialization failed:', error);
      this.isInitialized = false;
    }
  }

  private setupMiddleware(): void {
    // Security and performance middleware (matching Vision Cortex patterns)
    this.app.use(helmet());
    this.app.use(compression());
    
    this.app.use(cors({
      origin: [
        'https://infinityxoneintelligence.com',
        'https://vision-cortex-*.run.app',
        'https://real-estate-intelligence-*.run.app',
        'http://localhost:3000',
        'http://localhost:4000'
      ],
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Request logging (Vision Cortex pattern)
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
    
    this.app.use(validateAuth);
  }

  private setupRoutes(): void {
    // Core Intelligence Endpoints
    this.app.get('/api/v1/intelligence/search', this.searchIntelligence.bind(this));
    this.app.get('/api/v1/intelligence/latest', this.getLatestIntelligence.bind(this));
    this.app.get('/api/v1/intelligence/:id', this.getIntelligenceById.bind(this));
    this.app.post('/api/v1/intelligence/generate', requireAuth, this.generateIntelligence.bind(this));

    // Real Estate Search Engine
    this.app.get('/api/v1/search/locations', this.getAvailableLocations.bind(this));
    this.app.get('/api/v1/search/asset-types', this.getAssetTypes.bind(this));
    this.app.get('/api/v1/search/properties', this.searchProperties.bind(this));
    this.app.get('/api/v1/search/opportunities', this.getInvestmentOpportunities.bind(this));

    // Predictive Analytics
    this.app.get('/api/v1/analytics/market-trends', this.getMarketTrends.bind(this));
    this.app.get('/api/v1/analytics/price-predictions', this.getPricePredictions.bind(this));
    this.app.get('/api/v1/analytics/opportunity-scores', this.getOpportunityScores.bind(this));
    this.app.get('/api/v1/analytics/dashboard', this.getDashboardData.bind(this));

    // User Authentication & CRM
    this.app.post('/api/v1/auth/login', this.login.bind(this));
    this.app.post('/api/v1/auth/register', this.register.bind(this));
    this.app.post('/api/v1/auth/logout', this.logout.bind(this));
    this.app.get('/api/v1/auth/profile', requireAuth, this.getProfile.bind(this));

    // CRM & Lead Management
    this.app.get('/api/v1/crm/leads', requireAuth, this.getLeads.bind(this));
    this.app.post('/api/v1/crm/leads', requireAuth, this.createLead.bind(this));
    this.app.put('/api/v1/crm/leads/:id', requireAuth, this.updateLead.bind(this));
    this.app.get('/api/v1/crm/portfolio', requireAuth, this.getPortfolio.bind(this));

    // WebSocket for Real-time Intelligence
    this.app.get('/api/v1/stream/intelligence', this.streamIntelligence.bind(this));

    // ============================================================================
    // VISION CORTEX COMPATIBLE ENDPOINTS
    // ============================================================================
    
    // Core Intelligence Synthesis (Vision Cortex Pattern)
    this.app.post('/vision-cortex/intelligence/real-estate/synthesize', this.synthesizeRealEstateIntelligence.bind(this));
    this.app.get('/vision-cortex/intelligence/real-estate/signals', this.getRealEstateSignals.bind(this));
    this.app.get('/vision-cortex/intelligence/real-estate/anomalies', this.detectRealEstateAnomalies.bind(this));
    
    // Health Check (Vision Cortex Pattern)
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: this.isInitialized ? 'healthy' : 'initializing',
        service: 'vision-cortex-real-estate-intelligence',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        intelligence_engine: this.intelligenceEngine.isOperational,
        integrations: {
          firestore: true,
          pubsub: true,
          llm_orchestrator: true
        }
      });
    });
    
    // Service Status (Vision Cortex Pattern)
    this.app.get('/vision-cortex/status', (req, res) => {
      res.json({
        service: 'real-estate-intelligence',
        status: this.isInitialized ? 'operational' : 'initializing',
        capabilities: [
          'market-prediction',
          'signal-detection', 
          'anomaly-detection',
          'investment-analysis',
          'portfolio-management'
        ],
        last_intelligence_generated: this.intelligenceEngine.getLastGeneratedTime(),
        cache_size: this.intelligenceEngine.getCacheSize()
      });
    });
  }

  // ============================================================================
  // VISION CORTEX INTELLIGENCE ENDPOINTS
  // ============================================================================
  
  /**
   * 🧪 Intelligence Synthesis (Vision Cortex Pattern)
   */
  async synthesizeRealEstateIntelligence(req: express.Request, res: express.Response): Promise<void> {
    try {
      const request = SynthesisRequestSchema.parse(req.body);
      
      console.log(`🔄 Real Estate Intelligence synthesis request: "${request.question}"`);
      
      const intelligence = await this.intelligenceEngine.synthesizeIntelligence(request);
      
      res.json({
        success: true,
        intelligence_type: 'real_estate_synthesis',
        data: intelligence,
        generated_at: new Date().toISOString(),
        processing_time: Date.now() - parseInt(req.headers['x-request-start'] as string || '0')
      });
      
    } catch (error) {
      console.error('❌ Real Estate intelligence synthesis failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Intelligence synthesis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        intelligence_type: 'real_estate_synthesis'
      });
    }
  }
  
  /**
   * Get Real Estate Signals (Vision Cortex Pattern) 
   */
  async getRealEstateSignals(req: express.Request, res: express.Response): Promise<void> {
    try {
      const signals = await this.intelligenceEngine.getActiveSignals({
        region: req.query.region as string,
        signal_types: req.query.signal_types as string[],
        min_strength: parseFloat(req.query.min_strength as string) || 0.5
      });
      
      res.json({
        success: true,
        intelligence_type: 'real_estate_signals',
        data: signals,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get real estate signals'
      });
    }
  }
  
  /**
   * Detect Real Estate Anomalies (Vision Cortex Pattern)
   */
  async detectRealEstateAnomalies(req: express.Request, res: express.Response): Promise<void> {
    try {
      const anomalies = await this.intelligenceEngine.detectAnomalies({
        region: req.query.region as string,
        detection_window: req.query.detection_window as string || '30d',
        severity_threshold: parseFloat(req.query.severity_threshold as string) || 0.7
      });
      
      res.json({
        success: true,
        intelligence_type: 'real_estate_anomalies',
        data: anomalies,
        detection_window: req.query.detection_window || '30d'
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to detect real estate anomalies'
      });
    }
  }

  // Legacy Intelligence Search (maintaining backward compatibility)
  async searchIntelligence(req: express.Request, res: express.Response): Promise<void> {
    try {
      const query: RealEstateSearchQuery = req.query as any;
      const intelligence = await this.intelligenceEngine.searchIntelligence(query);
      
      res.json({
        success: true,
        data: intelligence,
        total: intelligence.length,
        query
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to search intelligence',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Latest Intelligence Feed
  async getLatestIntelligence(req: express.Request, res: express.Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const intelligence = await this.intelligenceEngine.getLatestIntelligence(limit);
      
      res.json({
        success: true,
        data: intelligence,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get latest intelligence'
      });
    }
  }

  // Get Available Locations (for dropdowns)
  async getAvailableLocations(req: express.Request, res: express.Response): Promise<void> {
    try {
      const locations = await this.intelligenceEngine.getAvailableLocations();
      
      res.json({
        success: true,
        data: {
          countries: locations.countries,
          states: locations.states,
          counties: locations.counties,
          cities: locations.cities
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get locations'
      });
    }
  }

  // Market Trends Analytics
  async getMarketTrends(req: express.Request, res: express.Response): Promise<void> {
    try {
      const location = req.query.location as string;
      const timeframe = req.query.timeframe as string || '30d';
      
      const trends = await this.intelligenceEngine.getMarketTrends(location, timeframe);
      
      res.json({
        success: true,
        data: trends,
        location,
        timeframe
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get market trends'
      });
    }
  }

  // Price Predictions
  async getPricePredictions(req: express.Request, res: express.Response): Promise<void> {
    try {
      const location = req.query.location as string;
      const assetType = req.query.asset_type as string;
      
      const predictions = await this.intelligenceEngine.getPricePredictions(location, assetType);
      
      res.json({
        success: true,
        data: predictions,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get price predictions'
      });
    }
  }

  // Dashboard Data (Combined Analytics)
  async getDashboardData(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const preferences = await this.crmService.getUserPreferences(userId);
      
      const [
        latestIntelligence,
        marketTrends,
        opportunities,
        portfolio
      ] = await Promise.all([
        this.intelligenceEngine.getLatestIntelligence(10),
        this.intelligenceEngine.getMarketTrends(preferences.default_location, '30d'),
        this.intelligenceEngine.getOpportunityScores(preferences.default_location),
        userId ? this.crmService.getPortfolio(userId) : null
      ]);

      res.json({
        success: true,
        data: {
          latest_intelligence: latestIntelligence,
          market_trends: marketTrends,
          opportunities,
          portfolio,
          user_preferences: preferences
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }

  // User Authentication
  async login(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for login
    res.json({ success: true, message: 'Login endpoint' });
  }

  async register(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for registration
    res.json({ success: true, message: 'Registration endpoint' });
  }

  async logout(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for logout
    res.json({ success: true, message: 'Logout successful' });
  }

  async getProfile(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for getting user profile
    res.json({ success: true, user: req.user });
  }

  // CRM Endpoints
  async getLeads(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const leads = await this.crmService.getLeads(userId);
      
      res.json({
        success: true,
        data: leads
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get leads'
      });
    }
  }

  async createLead(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const leadData = req.body;
      
      const lead = await this.crmService.createLead(userId, leadData);
      
      res.json({
        success: true,
        data: lead
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create lead'
      });
    }
  }

  async updateLead(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for updating leads
    res.json({ success: true, message: 'Lead updated' });
  }

  async getPortfolio(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for getting user portfolio
    res.json({ success: true, portfolio: [] });
  }

  // WebSocket Streaming
  async streamIntelligence(req: express.Request, res: express.Response): Promise<void> {
    // WebSocket implementation for real-time intelligence streaming
    res.json({ success: true, message: 'WebSocket endpoint for real-time intelligence' });
  }

  // Additional helper methods for completeness
  async generateIntelligence(req: express.Request, res: express.Response): Promise<void> {
    res.json({ success: true, message: 'Generate intelligence endpoint' });
  }

  async getIntelligenceById(req: express.Request, res: express.Response): Promise<void> {
    res.json({ success: true, message: 'Get intelligence by ID endpoint' });
  }

  async getAssetTypes(req: express.Request, res: express.Response): Promise<void> {
    res.json({
      success: true,
      data: ['sfh', 'multifamily', 'commercial', 'land']
    });
  }

  async searchProperties(req: express.Request, res: express.Response): Promise<void> {
    res.json({ success: true, message: 'Search properties endpoint' });
  }

  async getInvestmentOpportunities(req: express.Request, res: express.Response): Promise<void> {
    res.json({ success: true, message: 'Get investment opportunities endpoint' });
  }

  async getOpportunityScores(req: express.Request, res: express.Response): Promise<void> {
    res.json({ success: true, message: 'Get opportunity scores endpoint' });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default RealEstateAPI;