const { createClient } = require('@supabase/supabase-js');
const config = require('./secure-config');

// Create secure Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

/**
 * Secure database operations with input validation and sanitization
 */
class SecureDatabase {
  
  /**
   * Sanitize input to prevent SQL injection
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    return input
      .replace(/[<>'";\\]/g, '') // Remove dangerous characters
      .trim()
      .substring(0, config.security.maxContentLength);
  }
  
  /**
   * Validate beacon data before insertion
   */
  static validateBeaconData(data) {
    const errors = [];
    
    if (!data.author || typeof data.author !== 'string' || data.author.length !== 44) {
      errors.push('Invalid author address');
    }
    
    if (!data.content || typeof data.content !== 'string') {
      errors.push('Content is required');
    } else if (data.content.length > config.security.maxContentLength) {
      errors.push(`Content too long (max ${config.security.maxContentLength} characters)`);
    }
    
    if (data.topic && data.topic.length > config.security.maxTopicLength) {
      errors.push(`Topic too long (max ${config.security.maxTopicLength} characters)`);
    }
    
    if (!data.treasury_transaction || typeof data.treasury_transaction !== 'string') {
      errors.push('Treasury transaction is required');
    }
    
    if (!data.timestamp || typeof data.timestamp !== 'number') {
      errors.push('Valid timestamp is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitized: {
        author: this.sanitizeInput(data.author),
        content: this.sanitizeInput(data.content),
        topic: data.topic ? this.sanitizeInput(data.topic) : null,
        treasury_transaction: this.sanitizeInput(data.treasury_transaction),
        timestamp: data.timestamp,
        author_display: data.author_display ? this.sanitizeInput(data.author_display) : null,
        platform_wallet: data.platform_wallet ? this.sanitizeInput(data.platform_wallet) : null
      }
    };
  }
  
  /**
   * Validate tip data before insertion
   */
  static validateTipData(data) {
    const errors = [];
    
    if (!data.tipper || typeof data.tipper !== 'string' || data.tipper.length !== 44) {
      errors.push('Invalid tipper address');
    }
    
    if (!data.recipient || typeof data.recipient !== 'string' || data.recipient.length !== 44) {
      errors.push('Invalid recipient address');
    }
    
    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('Valid amount is required');
    }
    
    if (data.message && data.message.length > config.security.maxMessageLength) {
      errors.push(`Message too long (max ${config.security.maxMessageLength} characters)`);
    }
    
    if (!data.treasury_transaction || typeof data.treasury_transaction !== 'string') {
      errors.push('Treasury transaction is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitized: {
        tipper: this.sanitizeInput(data.tipper),
        recipient: this.sanitizeInput(data.recipient),
        amount: data.amount,
        message: data.message ? this.sanitizeInput(data.message) : null,
        beacon_id: data.beacon_id,
        treasury_transaction: this.sanitizeInput(data.treasury_transaction),
        timestamp: data.timestamp,
        tipper_display: data.tipper_display ? this.sanitizeInput(data.tipper_display) : null,
        platform_wallet: data.platform_wallet ? this.sanitizeInput(data.platform_wallet) : null
      }
    };
  }
  
  /**
   * Securely create a beacon
   */
  static async createBeacon(data) {
    const validation = this.validateBeaconData(data);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const { data: beacon, error } = await supabase
      .from('beacons')
      .insert([validation.sanitized])
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating beacon:', error);
      throw new Error('Failed to create beacon');
    }
    
    return beacon;
  }
  
  /**
   * Securely create a tip
   */
  static async createTip(data) {
    const validation = this.validateTipData(data);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const { data: tip, error } = await supabase
      .from('tips')
      .insert([validation.sanitized])
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating tip:', error);
      throw new Error('Failed to create tip');
    }
    
    return tip;
  }
  
  /**
   * Securely get beacons with pagination
   */
  static async getBeacons(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('beacons')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Database error fetching beacons:', error);
      throw new Error('Failed to fetch beacons');
    }
    
    return data || [];
  }
  
  /**
   * Securely get recent tips
   */
  static async getRecentTips(limit = 20) {
    const { data, error } = await supabase
      .from('tips')
      .select(`
        id,
        recipient,
        amount,
        message,
        beacon_id,
        tipper,
        tipper_display,
        timestamp,
        treasury_transaction,
        platform_wallet,
        beacons!inner(
          id,
          content,
          topic,
          author_display
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Database error fetching tips:', error);
      throw new Error('Failed to fetch tips');
    }
    
    return data || [];
  }
  
  /**
   * Securely get platform wallet transactions
   */
  static async getPlatformTransactions(userWallet, limit = 20) {
    const { data, error } = await supabase
      .from('platform_transactions')
      .select('*')
      .eq('user_wallet', this.sanitizeInput(userWallet))
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Database error fetching platform transactions:', error);
      throw new Error('Failed to fetch platform transactions');
    }
    
    return data || [];
  }
  
  /**
   * Securely create platform wallet transaction
   */
  static async createPlatformTransaction(data) {
    const sanitized = {
      user_wallet: this.sanitizeInput(data.user_wallet),
      platform_wallet: this.sanitizeInput(data.platform_wallet),
      amount: data.amount,
      transaction: this.sanitizeInput(data.transaction),
      timestamp: data.timestamp,
      type: this.sanitizeInput(data.type),
      recipient: data.recipient ? this.sanitizeInput(data.recipient) : null,
      message: data.message ? this.sanitizeInput(data.message) : null
    };
    
    const { data: transaction, error } = await supabase
      .from('platform_transactions')
      .insert([sanitized])
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating platform transaction:', error);
      throw new Error('Failed to create platform transaction');
    }
    
    return transaction;
  }
}

module.exports = SecureDatabase;
