// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Simple logger implementation for self-hosted version
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] || LOG_LEVELS.INFO;

const profiles = new Map();

const logger = {
  profile(label) {
    if (profiles.has(label)) {
      const start = profiles.get(label);
      const duration = Date.now() - start;
      this.info(`${label} - ${duration}ms`);
      profiles.delete(label);
    } else {
      profiles.set(label, Date.now());
      this.info(`Starting: ${label}`);
    }
  },

  debug(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },

  info(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(`[INFO] ${message}`, meta);
    }
  },

  warn(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, meta);
    }
  },

  error(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, meta);
    }
  }
};

export default logger; 