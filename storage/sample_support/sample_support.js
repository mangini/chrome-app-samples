
'use strict';

(function(context){

  function Logger(log_area) {
    this.setLogArea(log_area);
  }

  Logger.prototype.setLogArea = function(log_area) {
    this.log_area = log_area;
  }

  Logger.prototype.log = function(message, currentWindow, currentAppWindowId) {

    currentWindow.console.log(message);

    if (this.log_area) {
      // convert the message to string, if necessary
      var messageStr = message;
      if (typeof(message) != 'string') {
        messageStr = JSON.stringify(message);
      }

      // log to the textarea HTML element
      this.log_area.innerText += messageStr;

      // if this is not the window with the log area, log to its console too
      if (this.log_area.ownerDocument &&
          this.log_area.ownerDocument.defaultView &&
          this.log_area.ownerDocument.defaultView != currentWindow) {
        this.log_area.ownerDocument.defaultView.console.log(
          "[WIN:"+currentAppWindowId+"]",message);
      }

    }
  };


  function SampleSupport() {

  }

  SampleSupport.prototype.log = function(message) {
    this.logger.log(message, window, chrome.app.window.current().id);
  };

  SampleSupport.SNIPPET_WIN_ID = 'show_snippets';
  SampleSupport.OPEN_SNIPPETS_ANCHOR_ID = '_open_snippets';
  SampleSupport.LOG_AREA_ID = '__sample_support_logarea';

  SampleSupport.prototype.addListeners = function() {
    var open_snippets = document.getElementById(
      SampleSupport.OPEN_SNIPPETS_ANCHOR_ID);

    if (open_snippets) {
      open_snippets.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.app.window.create('sample_support/show_snippets.html',
          { "id": SampleSupport.SNIPPET_WIN_ID,
            "bounds": {
              "width": 760,
              "height": 760
            }
          });
      });
    }

    document.body.addEventListener('online', function() {
      document.body.classList.remove('offline');
    });
    if (navigator.offLine) {
      document.body.classList.add('offline');
    }
    document.body.addEventListener('offline', function() {
      document.body.classList.add('offline');
    });

  };

  var addSubflow = function(flowEl, subflow) {
    
    if (subflow['side']) {
      var side = document.createElement('div');
      side.className='side';
      subflow['side']['actions'].forEach(function(action) {
        var actionEl = document.createElement('button');
        actionEl.className = 'small';
        actionEl.innerText = action['name'];
        actionEl.addEventListener('click', action['onclick']);
        side.appendChild(actionEl);
      });
      flowEl.appendChild(side);
    }

    if (subflow['name']) {
      var name = document.createElement('h3');
      name.innerHTML = subflow['name'];
      flowEl.appendChild(name);
    }

    if (subflow['container']) {
      var container = document.createElement('div');
      container.className = 'container';
      container.id = subflow['container']['id'] || null;
      flowEl.appendChild(container);
    }

  };

  SampleSupport.prototype.addFlow = function(flow) {
    var container = document.querySelector('.flows');
    var flowEl = document.createElement('div');

    if (flow['name']) {
      var title = document.createElement('h2');
      title.innerHTML = flow['name'];
      container.appendChild(title);
    }

    if (flow['subflows']) {
      flow['subflows'].forEach(function(subflow) {
        addSubflow(flowEl, subflow);
      });
    }

    flowEl.id = flow['id'];
    flowEl.className = 'flow';

    container.appendChild(flowEl);
    
  };

  SampleSupport.prototype.clearContainer = function(container) {
    container.textContent=null;
  };

  SampleSupport.prototype.addRemovableElement = function(container, text, removeCallback) {
    var element = document.createElement('div');
    element.className = 'element';
    var textEl = document.createElement('div');
    textEl.innerText = text;
    element.appendChild(textEl);
    var buttonEl = document.createElement('button');
    buttonEl.className = 'remove small';
    buttonEl.innerText = 'x';
    buttonEl.addEventListener('click', function() {
        var el = this.parentElement;
        removeCallback(el);
        el.parentElement.removeChild(el);
      });

    element.appendChild(buttonEl);

    container.appendChild(element);
  };

  SampleSupport.prototype.initializeLogger = function() {
    var log_area = document.getElementById(SampleSupport.LOG_AREA_ID);

    // get Logger reference from background page, so
    // all other windows can access it
    chrome.runtime.getBackgroundPage( function(bgpage) {
      this.logger = bgpage.sample_logger;

      // replace existing log area if new log_area is valid
      if (this.logger && log_area) {
        this.logger.setLogArea(log_area);
      }

      // create a new logger
      if (!this.logger) {
        this.logger = new Logger(log_area);
        bgpage.sample_logger = this.logger;
      }

    }.bind(this));

  }

  SampleSupport.prototype.init = function(e) {

    this.initializeLogger();
    this.addListeners();
  };

  context.SampleSupport = SampleSupport;

})(window);


window.sampleSupport = new SampleSupport();
window.addEventListener('DOMContentLoaded',
  window.sampleSupport.init.bind(window.sampleSupport));
