// In-memory state management for row locks and real-time collaboration
// Works for single API instance - state is lost on restart

import { logger } from "../config/logger.js";

class MemoryState {
  // Map<table, Set<rowId>> for rows currently being saved
  savingRows = new Map();

    // ===== SAVING STATE MANAGEMENT =====
    setRowSaving(table, rowId) {
      if (!this.savingRows.has(table)) {
        this.savingRows.set(table, new Set());
      }
      this.savingRows.get(table).add(rowId);
    }

    clearRowSaving(table, rowId) {
      if (this.savingRows.has(table)) {
        this.savingRows.get(table).delete(rowId);
        if (this.savingRows.get(table).size === 0) {
          this.savingRows.delete(table);
        }
      }
    }

    getSavingRows(table) {
      return Array.from(this.savingRows.get(table) || []);
    }

  constructor() {
    // Active editing state: Map<"table:rowId", { sessionId, userEmail, timestamp, changes }>
    this.activeEdits = new Map();
    
    // Active sessions: Map<sessionId, { userEmail, lastSeen, currentTable, currentRowId }>
    this.sessions = new Map();
    
    // Pub/Sub subscribers: Map<channel, Set<callback>>
    this.subscribers = new Map();
  }

  // ===== ACTIVE EDITING STATE =====
  
  setEditingState(table, rowId, sessionId, userEmail, changes = null) {
    const editKey = `${table}:${rowId}`;
    this.activeEdits.set(editKey, {
      sessionId,
      userEmail,
      timestamp: Date.now(),
      changes
    });
    logger.info(`[MemoryState] Set editing state for ${table}:${rowId} by ${userEmail}`);
  }
  
  clearEditingState(table, rowId, sessionId) {
    const editKey = `${table}:${rowId}`;
    const existing = this.activeEdits.get(editKey);
    
    if (existing && existing.sessionId === sessionId) {
      this.activeEdits.delete(editKey);
      logger.info(`[MemoryState] Cleared editing state for ${table}:${rowId} by session ${sessionId}`);
      return { success: true };
    }
    return { success: false };
  }
  
  getActiveEdits(table) {
    const edits = [];
     
    for (const [key, edit] of this.activeEdits.entries()) {
      const [tbl, rowId] = key.split(':');
      if (tbl === table) {
        edits.push({
          rowId,
          ...edit
        });
      }
    }
    return edits;
  }
  
  // ===== SESSION MANAGEMENT =====
  
  registerSession(sessionId, userEmail) {
    this.sessions.set(sessionId, {
      userEmail,
      lastSeen: Date.now(),
      currentTable: null,
      currentRowId: null
    });
  }
  
  updateSessionActivity(sessionId, table = null, rowId = null) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastSeen = Date.now();
      if (table) {session.currentTable = table;}
      if (rowId !== undefined) {session.currentRowId = rowId;}
    }
  }
  
  heartbeat(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastSeen = Date.now();
    }
  }
  
  getActiveSessions(table = null) {
    const sessions = [];
     
    for (const [sessionId, session] of this.sessions.entries()) {
      if (!table || session.currentTable === table) {
        sessions.push({
          sessionId,
          userEmail: session.userEmail,
          currentTable: session.currentTable,
          currentRowId: session.currentRowId,
          lastSeen: session.lastSeen,
          age: Date.now() - session.lastSeen
        });
      }
    }
    return sessions;
  }
  
  // Clean up stale editing states and sessions (inactive for > 5 minutes)
  cleanupStaleState() {
    const staleThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes
    
    let cleaned = 0;
    
    // Clean up stale editing states
    for (const [editKey, edit] of this.activeEdits.entries()) {
      if (edit.timestamp < staleThreshold) {
        this.activeEdits.delete(editKey);
        cleaned += 1;
      }
    }
    
    // Clean up stale sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastSeen < staleThreshold) {
        this.sessions.delete(sessionId);
      }
    }
    
    if (cleaned > 0) {
      logger.info(`[MemoryState] Cleaned up ${cleaned} stale editing states`);
    }
  }
  
  // ===== PUB/SUB FOR REAL-TIME UPDATES =====
  
  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel).add(callback);
  }
  
  unsubscribe(channel, callback) {
    const subs = this.subscribers.get(channel);
    if (subs) {
      subs.delete(callback);
    }
  }
  
  publish(channel, message) {
    const subs = this.subscribers.get(channel);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(message);
        } catch (err) {
          logger.error('[MemoryState] Subscriber callback error:', err);
        }
      });
    }
  }
  
  // ===== STATS & DEBUG =====
  
  getStats() {
    return {
      activeEdits: this.activeEdits.size,
      activeSessions: this.sessions.size,
    };
  }
  
  getTableState(table) {
    return {
      activeEdits: this.getActiveEdits(table),
      activeSessions: this.getActiveSessions(table),
      savingRows: this.getSavingRows(table)
    };
  }
}

// Singleton instance
export const memoryState = new MemoryState();

// Run cleanup every minute
setInterval(() => {
  memoryState.cleanupStaleState();
}, 60 * 1000);

