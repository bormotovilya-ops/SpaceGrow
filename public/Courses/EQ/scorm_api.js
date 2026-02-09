/**
 * SCORM API wrapper for LMS communication.
 * Supports SCORM 1.2 (cmi.core) and SCORM 2004 (cmi.score.scaled, cmi.completion_status).
 */
(function(global) {
  'use strict';

  var API = null;
  var findAPI = function(win) {
    if (!win) return null;
    if (win.API) return win.API;
    if (win.API_1484_11) return win.API_1484_11;
    for (var i = 0; i < win.frames.length; i++) {
      var candidate = findAPI(win.frames[i]);
      if (candidate) return candidate;
    }
    return null;
  };

  var SCORM_API = {
    initialized: false,
    version: '1.2',

    initialize: function() {
      API = findAPI(window);
      if (!API) {
        API = findAPI(window.parent);
      }
      if (!API) {
        API = findAPI(window.top);
      }
      if (!API) {
        try {
          if (window.parent && window.parent !== window) {
            API = findAPI(window.parent);
          }
        } catch (e) {}
      }
      if (API) {
        try {
          var result = API.LMSInitialize('');
          this.initialized = (result && result.toString() === 'true') || result === true;
        } catch (e) {
          this.initialized = false;
        }
      }
      return this.initialized;
    },

    setScore: function(scorePercent) {
      if (!this.initialized || !API) return false;
      try {
        API.LMSSetValue('cmi.core.score.raw', Math.round(scorePercent));
        API.LMSSetValue('cmi.core.score.min', '0');
        API.LMSSetValue('cmi.core.score.max', '100');
        API.LMSSetValue('cmi.core.lesson_status', scorePercent >= 70 ? 'passed' : 'completed');
        API.LMSCommit('');
        return true;
      } catch (e) {
        return false;
      }
    },

    setCompleted: function() {
      if (!API) return false;
      try {
        API.LMSSetValue('cmi.core.lesson_status', 'completed');
        API.LMSCommit('');
        return true;
      } catch (e) {
        return false;
      }
    },

    finish: function() {
      if (!API) return false;
      try {
        this.setCompleted();
        API.LMSFinish('');
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  global.SCORM_API = SCORM_API;
})(typeof window !== 'undefined' ? window : this);
