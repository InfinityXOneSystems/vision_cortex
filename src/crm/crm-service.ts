/**
 * CRM SERVICE - Investor-Style Lead Management
 * Manages leads, portfolios, and user preferences
 */

import { Firestore } from '@google-cloud/firestore';
import { logger } from '../utils/logger';

export interface Lead {
  id: string;
  user_id: string;
  property_address: string;
  property_type: 'sfh' | 'multifamily' | 'commercial' | 'land';
  asking_price: number;
  estimated_value: number;
  lead_source: 'intelligence' | 'search' | 'manual' | 'import';
  status: 'new' | 'contacted' | 'viewing_scheduled' | 'offer_made' | 'under_contract' | 'closed' | 'dead';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string[];
  created_at: string;
  updated_at: string;
  contact_info?: {
    agent_name?: string;
    agent_phone?: string;
    agent_email?: string;
    owner_name?: string;
    owner_phone?: string;
  };
  financial_analysis?: {
    cap_rate?: number;
    cash_on_cash_return?: number;
    monthly_rent_potential?: number;
    repair_estimate?: number;
    after_repair_value?: number;
  };
}

export interface Portfolio {
  id: string;
  user_id: string;
  properties: PortfolioProperty[];
  total_value: number;
  total_equity: number;
  monthly_cash_flow: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioProperty {
  id: string;
  address: string;
  purchase_price: number;
  current_value: number;
  monthly_rent: number;
  monthly_expenses: number;
  purchase_date: string;
  property_type: string;
}

export interface UserPreferences {
  user_id: string;
  default_location: string;
  preferred_asset_types: string[];
  budget_range: {
    min: number;
    max: number;
  };
  investment_strategy: 'buy_hold' | 'flip' | 'wholesale' | 'brrrr' | 'mixed';
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  notifications: {
    new_intelligence: boolean;
    price_alerts: boolean;
    market_updates: boolean;
  };
}

export class CRMService {
  private firestore: Firestore;

  constructor() {
    this.firestore = new Firestore({ projectId: 'infinity-x-one-systems' });
  }

  // Lead Management
  async getLeads(userId: string): Promise<Lead[]> {
    try {
      const snapshot = await this.firestore
        .collection('leads')
        .where('user_id', '==', userId)
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
    } catch (error) {
      logger.error('Error getting leads:', error);
      throw new Error('Failed to get leads');
    }
  }

  async createLead(userId: string, leadData: Partial<Lead>): Promise<Lead> {
    try {
      const lead: Omit<Lead, 'id'> = {
        user_id: userId,
        property_address: leadData.property_address || '',
        property_type: leadData.property_type || 'sfh',
        asking_price: leadData.asking_price || 0,
        estimated_value: leadData.estimated_value || 0,
        lead_source: leadData.lead_source || 'manual',
        status: leadData.status || 'new',
        priority: leadData.priority || 'medium',
        notes: leadData.notes || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contact_info: leadData.contact_info,
        financial_analysis: leadData.financial_analysis
      };

      const docRef = await this.firestore.collection('leads').add(lead);
      
      logger.info('Lead created:', { userId, leadId: docRef.id });
      
      return { id: docRef.id, ...lead };
    } catch (error) {
      logger.error('Error creating lead:', error);
      throw new Error('Failed to create lead');
    }
  }

  async updateLead(leadId: string, userId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      const leadRef = this.firestore.collection('leads').doc(leadId);
      const leadDoc = await leadRef.get();

      if (!leadDoc.exists) {
        throw new Error('Lead not found');
      }

      const leadData = leadDoc.data() as Lead;
      if (leadData.user_id !== userId) {
        throw new Error('Unauthorized to update this lead');
      }

      const updatedLead = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      await leadRef.update(updatedLead);
      
      logger.info('Lead updated:', { userId, leadId });
      
      const updatedDoc = await leadRef.get();
      return { id: leadId, ...updatedDoc.data() } as Lead;
    } catch (error) {
      logger.error('Error updating lead:', error);
      throw new Error('Failed to update lead');
    }
  }

  // Portfolio Management
  async getPortfolio(userId: string): Promise<Portfolio | null> {
    try {
      const snapshot = await this.firestore
        .collection('portfolios')
        .where('user_id', '==', userId)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Portfolio;
    } catch (error) {
      logger.error('Error getting portfolio:', error);
      throw new Error('Failed to get portfolio');
    }
  }

  async createPortfolio(userId: string): Promise<Portfolio> {
    try {
      const portfolio: Omit<Portfolio, 'id'> = {
        user_id: userId,
        properties: [],
        total_value: 0,
        total_equity: 0,
        monthly_cash_flow: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await this.firestore.collection('portfolios').add(portfolio);
      
      logger.info('Portfolio created:', { userId, portfolioId: docRef.id });
      
      return { id: docRef.id, ...portfolio };
    } catch (error) {
      logger.error('Error creating portfolio:', error);
      throw new Error('Failed to create portfolio');
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const doc = await this.firestore
        .collection('user_preferences')
        .doc(userId)
        .get();

      if (doc.exists) {
        return { user_id: userId, ...doc.data() } as UserPreferences;
      }

      // Return default preferences
      const defaultPreferences: UserPreferences = {
        user_id: userId,
        default_location: 'Port St. Lucie, FL',
        preferred_asset_types: ['sfh'],
        budget_range: {
          min: 100000,
          max: 500000
        },
        investment_strategy: 'buy_hold',
        risk_tolerance: 'moderate',
        notifications: {
          new_intelligence: true,
          price_alerts: true,
          market_updates: true
        }
      };

      await this.firestore
        .collection('user_preferences')
        .doc(userId)
        .set(defaultPreferences);

      return defaultPreferences;
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw new Error('Failed to get user preferences');
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      await this.firestore
        .collection('user_preferences')
        .doc(userId)
        .update(preferences);

      logger.info('User preferences updated:', { userId });
      
      return await this.getUserPreferences(userId);
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  // Analytics
  async getUserStats(userId: string): Promise<any> {
    try {
      const [leads, portfolio] = await Promise.all([
        this.getLeads(userId),
        this.getPortfolio(userId)
      ]);

      const stats = {
        total_leads: leads.length,
        active_leads: leads.filter(l => !['closed', 'dead'].includes(l.status)).length,
        leads_by_status: this.groupBy(leads, 'status'),
        leads_by_source: this.groupBy(leads, 'lead_source'),
        portfolio_properties: portfolio?.properties.length || 0,
        portfolio_value: portfolio?.total_value || 0,
        monthly_cash_flow: portfolio?.monthly_cash_flow || 0
      };

      return stats;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw new Error('Failed to get user stats');
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }
}