// AI Service for requirement extraction
// This service handles communication with AI APIs (Google Gemini, etc.)

const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    
    console.log('AIService constructor - API Key:', this.apiKey ? 'Present' : 'Missing');
    console.log('AIService constructor - Model:', this.model);
    
    // Initialize Google Generative AI
    if (this.apiKey && this.apiKey !== 'your_gemini_api_key_here') {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
        console.log('GoogleGenerativeAI initialized successfully');
      } catch (error) {
        console.error('Error initializing GoogleGenerativeAI:', error);
      }
    } else {
      console.log('API Key not configured, using mock data');
    }
  }

  /**
   * Extract structured requirements from user description
   * @param {string} userDescription - The user's app description
   * @returns {Promise<Object>} - Structured requirements object
   */
  async extractRequirements(userDescription) {
    try {
      console.log('Extracting requirements for:', userDescription.substring(0, 100) + '...');
      
      // Use Google Gemini API if available
      if (this.generativeModel) {
        console.log('Using Google Gemini API');
        return await this.extractWithGemini(userDescription);
      }
      
      // Fallback to mock data
      console.log('Using mock data - Gemini API not configured');
      return this.mockExtractRequirements(userDescription);
      
    } catch (error) {
      console.error('AI service error:', error);
      // Fallback to mock data on error
      console.log('Falling back to mock data due to error');
      return this.mockExtractRequirements(userDescription);
    }
  }

  /**
   * Extract requirements using Google Gemini API
   * @param {string} userDescription - The user's app description
   * @returns {Promise<Object>} - Structured requirements object
   */
  async extractWithGemini(userDescription) {
    const prompt = `Extract structured app requirements from the user description and return JSON only.

User Description: "${userDescription}"

Output schema (strict):
{
  "appName": string,
  "entities": [{ "name": string, "fields": [{ "name": string, "type": "text|email|number|date|select|textarea", "required": boolean }] }],
  "roles": [string],  // Use as grouping labels. If the app is feature-driven and has no real roles, put feature group names here.
  "features": [string],
  "featureGroups": [{ "feature": string, "entities": [string] }],
  "rolePermissions": [
    { "role": string, "canCreate": [string], "canView": [string], "canEdit": [string] }
  ]
}

Rules:
- Use only the allowed field types.
- Always use roles[] as grouping labels (either actual roles or feature groups). Output exactly one rolePermissions item per role with the same role name.
- Each role must have non-empty canView (include relevant entities).
- Designate at least one admin-like role with full control over ALL entities (canCreate & canEdit). Prefer names like: Admin, Administrator, Owner, Manager, Supervisor. If none fit, choose the most responsible role based on the description.
- Ensure at least one role has non-empty canEdit; avoid returning all-empty canEdit.
- Keep arrays concise and relevant; omit commentary.

Mini example (format only):
Input: "Inventory app: managers add products, employees record sales, admin sees reports"
Output: {
  "appName": "Inventory Manager",
  "entities": [ { "name": "Product", "fields": [ { "name": "Name", "type": "text", "required": true } ] } ],
  "roles": ["Manager","Employee","Admin"],
  "features": ["Add products","Record sales","Reports"],
  "rolePermissions": [
    { "role": "Manager", "canCreate": ["Product"], "canView": ["Product","Sale"], "canEdit": ["Product"] },
    { "role": "Employee", "canCreate": ["Sale"], "canView": ["Product","Sale"], "canEdit": ["Sale"] },
    { "role": "Admin", "canCreate": ["Product","Sale"], "canView": ["Product","Sale"], "canEdit": ["Product","Sale"] }
  ]
}

Feature-as-role example (format only):
Input: "Personal finance: record expenses and income, categorize transactions, budgets, monthly/yearly reports"
Output: {
  "appName": "Personal Finance",
  "entities": [ { "name": "Expense", "fields": [ { "name": "Amount", "type": "number", "required": true } ] } ],
  "roles": ["Budgeting","Transactions","Reports"],
  "features": ["Budgeting","Transactions","Reports"],
  "rolePermissions": [
    { "role": "Budgeting", "canCreate": ["Budget","Category"], "canView": ["Budget","Category"], "canEdit": ["Budget","Category"] },
    { "role": "Transactions", "canCreate": ["Expense","Income"], "canView": ["Expense","Income"], "canEdit": ["Expense","Income"] },
    { "role": "Reports", "canCreate": [], "canView": ["Expense","Income","Budget"], "canEdit": [] }
  ]
}

Return JSON only.`;

    try {
      console.log('Sending request to Gemini API with structured output...');
      
      // Define the response schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          appName: {
            type: "string",
            description: "The name of the application"
          },
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { 
                        type: "string",
                        enum: ["text", "email", "number", "date", "select", "textarea"]
                      },
                      required: { type: "boolean" }
                    },
                    required: ["name", "type", "required"]
                  }
                }
              },
              required: ["name", "fields"]
            }
          },
          roles: {
            type: "array",
            items: { type: "string" }
          },
          features: {
            type: "array",
            items: { type: "string" }
          },
          rolePermissions: {
            type: "array",
            description: "List of role permission objects. Each item specifies a role and its canCreate/canView/canEdit arrays.",
            items: {
              type: "object",
              properties: {
                role: { type: "string", description: "Role name matching one of the roles[]" },
                canCreate: { type: "array", items: { type: "string" } },
                canView: { type: "array", items: { type: "string" } },
                canEdit: { type: "array", items: { type: "string" } }
              },
              required: ["role", "canCreate", "canView", "canEdit"]
            }
          }
        },
        required: ["appName", "entities", "roles", "features", "rolePermissions"]
      };

      const result = await this.generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });
      
      const response = await result.response;
      const text = response.text();
      
      console.log('Gemini API structured response:', text);
      
      // Parse the structured JSON response
      const parsedData = JSON.parse(text);
      // Normalize role permissions if returned as an array per schema
      parsedData.rolePermissions = this.normalizeRolePermissions(parsedData);
      // Enforce safety guardrails for permissions (ensure visibility and at least one editor)
      this.enforcePermissionSafety(parsedData);
        console.log('Parsed AI response:', JSON.stringify(parsedData, null, 2));
      
      // Validate the parsed data structure
      if (this.validateAIResponse(parsedData)) {
        return parsedData;
      } else {
        console.warn('AI response validation failed, using mock data');
        return this.mockExtractRequirements(userDescription);
      }
      
    } catch (error) {
      console.error('Gemini API error:', error);
      console.log('Falling back to mock data due to API error');
      return this.mockExtractRequirements(userDescription);
    }
  }

  /**
   * Validate AI response structure
   * @param {Object} data - The parsed AI response
   * @returns {boolean} - Whether the response is valid
   */
  validateAIResponse(data) {
    try {
      // Check required top-level fields
      if (!data.appName || !data.entities || !data.roles || !data.features || !data.rolePermissions) {
        console.warn('Missing required top-level fields');
        return false;
      }

      // Ensure rolePermissions is normalized to object keyed by role
      if (Array.isArray(data.rolePermissions)) {
        data.rolePermissions = this.normalizeRolePermissions(data);
      }
      // Apply safety guardrails before validating
      this.enforcePermissionSafety(data);

      // Check entities structure
      if (!Array.isArray(data.entities) || data.entities.length === 0) {
        console.warn('Invalid entities array');
        return false;
      }

      // Require roles as grouping label (can be actual roles or feature-based groups by name)
      const hasRoles = Array.isArray(data.roles) && data.roles.length > 0;
      if (!hasRoles) {
        console.warn('No roles provided');
        return false;
      }

      // Check rolePermissions structure
      for (const role of data.roles) {
        if (!data.rolePermissions[role]) {
          console.warn(`Missing permissions for role: ${role}`);
          return false;
        }

        const permissions = data.rolePermissions[role];
        if (!permissions.canCreate || !permissions.canView || !permissions.canEdit) {
          console.warn(`Missing permission fields for role: ${role}`);
          return false;
        }

        if (!Array.isArray(permissions.canEdit) || permissions.canEdit.length === 0) {
          console.warn(`No edit permissions for role: ${role}`);
        }
      }

      // Ensure at least one role has edit permissions
      const hasEditPermissions = data.roles.some(role => {
        const permissions = data.rolePermissions[role];
        return Array.isArray(permissions.canEdit) && permissions.canEdit.length > 0;
      });
      if (!hasEditPermissions) {
        console.warn('No roles have edit permissions');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Normalize rolePermissions to an object keyed by role
   * Accepts either array of { role, canCreate, canView, canEdit }
   * or object keyed by role. If malformed (e.g., only "roleName" key), returns as-is.
   */
  normalizeRolePermissions(data) {
    const rp = data && data.rolePermissions;
    if (!rp) return rp;
    // Already an object keyed by role and not the erroneous single "roleName" key
    if (!Array.isArray(rp)) {
      const keys = Object.keys(rp);
      if (keys.length === 1 && keys[0] === 'roleName') {
        // Can't recover reliably; return original to trigger validation warning
        return rp;
      }
      return rp;
    }
    // Array form -> reduce to object keyed by role
    const obj = {};
    for (const item of rp) {
      if (!item || typeof item.role !== 'string') continue;
      obj[item.role] = {
        canCreate: Array.isArray(item.canCreate) ? item.canCreate : [],
        canView: Array.isArray(item.canView) ? item.canView : [],
        canEdit: Array.isArray(item.canEdit) ? item.canEdit : []
      };
    }
    return obj;
  }

  /**
   * Enforce safe defaults for permissions to keep UI usable:
   * - Ensure every role has an entry; missing roles get read-only (canView all entities)
   * - Ensure at least one role has non-empty canEdit; prefer Admin otherwise first role
   */
  enforcePermissionSafety(data) {
    if (!data || !Array.isArray(data.roles) || !Array.isArray(data.entities)) return;
    const entityNames = data.entities.map(e => e.name).filter(Boolean);
    if (!data.rolePermissions || Array.isArray(data.rolePermissions)) return; // should be object after normalize

    // 1) Ensure each role has an entry
    for (const role of data.roles) {
      const key = role && role.charAt ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : role;
      if (!data.rolePermissions[key]) {
        data.rolePermissions[key] = {
          canCreate: [],
          canView: entityNames,
          canEdit: []
        };
      } else {
        const p = data.rolePermissions[key];
        if (!Array.isArray(p.canView)) p.canView = entityNames; // ensure at least read-only visibility
        if (!Array.isArray(p.canCreate)) p.canCreate = [];
        if (!Array.isArray(p.canEdit)) p.canEdit = [];
      }
    }

    // 2) Ensure at least one role has edit permissions
    const hasEditor = data.roles.some(r => {
      const k = r && r.charAt ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : r;
      const p = data.rolePermissions[k];
      return p && Array.isArray(p.canEdit) && p.canEdit.length > 0;
    });
    if (!hasEditor) {
      // prefer admin-like role names
      const preferred = ['admin','administrator','owner','manager','supervisor'];
      const lower = data.roles.map(r => r.toLowerCase());
      let target = null;
      for (const name of preferred) {
        const idx = lower.indexOf(name);
        if (idx !== -1) { target = data.roles[idx]; break; }
      }
      if (!target) target = data.roles[0];
      if (target) {
        const tk = target.charAt ? target.charAt(0).toUpperCase() + target.slice(1).toLowerCase() : target;
        data.rolePermissions[tk] = data.rolePermissions[tk] || { canCreate: [], canView: entityNames, canEdit: [] };
        data.rolePermissions[tk].canCreate = entityNames;
        data.rolePermissions[tk].canEdit = entityNames;
        if (!Array.isArray(data.rolePermissions[tk].canView) || data.rolePermissions[tk].canView.length === 0) {
          data.rolePermissions[tk].canView = entityNames;
        }
      }
    }
  }

  /**
   * Mock implementation for development/testing
   * @param {string} userDescription - The user's app description
   * @returns {Object} - Mock structured requirements
   */
  mockExtractRequirements(userDescription) {
    // Simple keyword-based extraction for demo
    const description = userDescription.toLowerCase();
    
    let appName = 'My App';
    let entities = [];
    let roles = [];
    let features = [];

    // Extract app name (simple heuristic)
    if (description.includes('course') && description.includes('student')) {
      appName = 'Course Manager';
      entities = [
        {
          name: 'Student',
          fields: [
            { name: 'Name', type: 'text', required: true },
            { name: 'Email', type: 'email', required: true },
            { name: 'Age', type: 'number', required: false },
            { name: 'Student ID', type: 'text', required: true }
          ]
        },
        {
          name: 'Course',
          fields: [
            { name: 'Title', type: 'text', required: true },
            { name: 'Code', type: 'text', required: true },
            { name: 'Credits', type: 'number', required: true },
            { name: 'Description', type: 'textarea', required: false }
          ]
        },
        {
          name: 'Grade',
          fields: [
            { name: 'Student', type: 'select', required: true },
            { name: 'Course', type: 'select', required: true },
            { name: 'Grade', type: 'number', required: true },
            { name: 'Date', type: 'date', required: true }
          ]
        }
      ];
      roles = ['Teacher', 'Student', 'Admin'];
      features = ['Add course', 'Enroll students', 'View reports', 'Manage grades'];
    } else if (description.includes('inventory') || description.includes('product')) {
      appName = 'Inventory Manager';
      entities = [
        {
          name: 'Product',
          fields: [
            { name: 'Name', type: 'text', required: true },
            { name: 'SKU', type: 'text', required: true },
            { name: 'Price', type: 'number', required: true },
            { name: 'Quantity', type: 'number', required: true }
          ]
        },
        {
          name: 'Supplier',
          fields: [
            { name: 'Company Name', type: 'text', required: true },
            { name: 'Contact Email', type: 'email', required: true },
            { name: 'Phone', type: 'text', required: false }
          ]
        }
      ];
      roles = ['Manager', 'Employee', 'Admin'];
      features = ['Add products', 'Update inventory', 'Generate reports', 'Manage suppliers'];
    } else {
      // Generic app structure
      appName = 'Business App';
      entities = [
        {
          name: 'User',
          fields: [
            { name: 'Name', type: 'text', required: true },
            { name: 'Email', type: 'email', required: true },
            { name: 'Role', type: 'select', required: true }
          ]
        }
      ];
      roles = ['User', 'Admin'];
      features = ['Manage data', 'View reports', 'User management'];
    }

    // Generate role permissions based on the app type
    let rolePermissions = {};
    
    if (description.includes('course') && description.includes('student')) {
      rolePermissions = {
        'Student': {
          canCreate: ['Student'],
          canView: ['Student', 'Course', 'Grade'],
          canEdit: ['Student']
        },
        'Teacher': {
          canCreate: ['Course', 'Student', 'Grade'],
          canView: ['Course', 'Student', 'Grade'],
          canEdit: ['Course', 'Student', 'Grade']
        },
        'Admin': {
          canCreate: ['Student', 'Course', 'Grade', 'User'],
          canView: ['Student', 'Course', 'Grade', 'User'],
          canEdit: ['Student', 'Course', 'Grade', 'User']
        }
      };
    } else if (description.includes('inventory') || description.includes('product')) {
      rolePermissions = {
        'Manager': {
          canCreate: ['Product', 'Supplier'],
          canView: ['Product', 'Supplier', 'Sale'],
          canEdit: ['Product', 'Supplier']
        },
        'Employee': {
          canCreate: ['Sale'],
          canView: ['Product', 'Sale'],
          canEdit: []
        },
        'Admin': {
          canCreate: ['Product', 'Supplier', 'Sale', 'User'],
          canView: ['Product', 'Supplier', 'Sale', 'User'],
          canEdit: ['Product', 'Supplier', 'Sale', 'User']
        }
      };
    } else {
      // Generic permissions
      rolePermissions = {
        'User': {
          canCreate: ['User'],
          canView: ['User'],
          canEdit: ['User']
        },
        'Admin': {
          canCreate: ['User'],
          canView: ['User'],
          canEdit: ['User']
        }
      };
    }

    return {
      appName,
      entities,
      roles,
      features,
      rolePermissions
    };
  }

  /**
   * Validate AI API configuration
   * @returns {boolean} - Whether the AI service is properly configured
   */
  isConfigured() {
    return !!this.apiKey && this.apiKey !== 'your_gemini_api_key_here' && !!this.generativeModel;
  }
}

module.exports = new AIService();
