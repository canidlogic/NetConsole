"use strict";

/*
 * console.js
 * ==========
 * 
 * Main program module for NetConsole client.
 * 
 * Requirements:
 * 
 * - console_boot.js
 * - NetConsoleClient.js
 * - NetConsoleServer.js
 */

// Wrap everything in an anonymous function that we immediately invoke
// after it is declared -- this prevents anything from being implicitly
// added to global scope
(function() {
  
  /*
   * Fault function
   * ==============
   */
  
  /*
   * Report an error to console and throw an exception for a fault
   * occurring within this module.
   *
   * Parameters:
   *
   *   func_name : string - the name of the function in this module
   *
   *   loc : number(int) - the location within the function
   */
  function fault(func_name, loc) {
    
    // If parameters not valid, set to unknown:0
    if ((typeof func_name !== "string") || (typeof loc !== "number")) {
      func_name = "unknown";
      loc = 0;
    }
    loc = Math.floor(loc);
    if (!isFinite(loc)) {
      loc = 0;
    }
    
    // Report error to console
    console.log("Fault at " + func_name + ":" + String(loc) +
                  " in console.js");
    
    // Throw exception
    throw ("console:" + func_name + ":" + String(loc));
  }
  
  /*
   * Constants
   * =========
   */
  
  /*
   * The IDs of all controls except the stop control.
   */
  var MAIN_CONTROLS = ["txtInput", "btnSend"];
  
  /*
   * Local data
   * ==========
   */
  
  /*
   * Flag that is set to true if the console is currently processing
   * some kind of message.
   * 
   * The "send" button and input box are disabled while this is true.
   * The "stop" button is always disabled while this is false.
   * 
   * This is set to true initially to account for start-up processing.
   */
  var m_processing = true;
  
  /*
   * Flag that is set to true when the client has requested a stop to
   * processing.
   * 
   * This flag is relevant only when m_processing is true.
   */
  var m_stop_request = false;
  
  /*
   * Flag that is set to true while we are handling a special login
   * request.
   */
  var m_login = false;
  
  /*
   * Function pointers to the done and cancel callbacks while a login is
   * in progress.
   * 
   * Only valid if m_login.
   */
  var m_login_done;
  var m_login_cancel;
  
  /*
   * The NetConsoleServer instance that we will use to handle requests.
   * 
   * This will be set to at the start of the handleLoad() procedure.
   */
  var m_server;
  
  /*
   * Local functions
   * ===============
   */
  
  /*
   * Set all the proper control enable states depending on the
   * m_processing and m_stop_request flags.
   */
  function setEnableState() {
    var func_name = "setEnableState";
    var e, i, mainEnable, stopEnable;
    
    // The send button as well as the input control are enabled only if
    // m_processing is false
    if (m_processing) {
      mainEnable = false;
    } else {
      mainEnable = true;
    }
    
    // The stop button is enabled only during processing while the
    // m_stop_request flag has not been set
    if (m_processing && (!m_stop_request)) {
      stopEnable = true;
    } else {
      stopEnable = false;
    }
    
    // Invert the enable states
    if (mainEnable) {
      mainEnable = false;
    } else {
      mainEnable = true;
    }
    if (stopEnable) {
      stopEnable = false;
    } else {
      stopEnable = true;
    }
    
    // Update enable states
    for(i = 0; i < MAIN_CONTROLS.length; i++) {
      e = document.getElementById(MAIN_CONTROLS[i]);
      if (!e) {
        fault(func_name, 100);
      }
      e.disabled = mainEnable;
    }
    
    e = document.getElementById("btnStop");
    if (!e) {
      fault(func_name, 200);
    }
    e.disabled = stopEnable;
  }
  
  /*
   * Clear everything out of the console.
   */
  function clearConsole() {
    var func_name = "clearConsole";
    var e, ea, i;
    
    // Get the console output
    e = document.getElementById("divOutput");
    if (!e) {
      fault(func_name, 100);
    }
    
    // Start the child nodes array out empty
    ea = [];
    
    // Add all the child nodes of console output to the local array
    if (e.hasChildNodes()) {
      for(i = 0; i < e.childNodes.length; i++) {
        ea.push(e.childNodes.item(i));
      }
    }
    
    // Remove all the child nodes of output
    for(i = 0; i < ea.length; i++) {
      e.removeChild(ea[i]);
    }
  }
  
  /*
   * Add a text message to output.
   *
   * The text message should NOT be entity-escaped.
   *
   * Parameters:
   *
   *   t : string - the (unescaped) text message
   *
   *   isServer : boolean - true if this message should be marked as
   *   coming from the server, false if this message should be marked as
   *   coming from the client
   */
  function appendMessage(t, isServer) {
    var func_name = "appendMessage";
    var eOutput, newblock, textnode, br, slen;
    
    // Check parameters
    if ((typeof(t) !== "string") || (typeof(isServer) !== "boolean")) {
      fault(func_name, 100);
    }
    
    // If this is a client message, prefix a right-angle quote and a
    // space to indicate a prompt
    if (!isServer) {
      t = "\u00bb " + t;
    }
    
    // Get output DIV
    eOutput = document.getElementById("divOutput");
    if (!eOutput) {
      fault(func_name, 200);
    }
    
    // Create a new P element for the message
    newblock = document.createElement("p");
    
    // Set the appropriate CSS class
    if (isServer) {
      newblock.className = "server";
    } else {
      newblock.className = "client";
    }
    
    // Keep appending text nodes and <br/> elements underneath the new
    // P element until all the text has been added
    while (t.length > 0) {
      // If first character is 0xa, then remove it, insert a <br/>, and
      // proceed to next loop iteration
      if (t.charCodeAt(0) === 0xa) {
        // Remove the first character
        t = t.slice(1);
        
        // Define a <br> element
        br = document.createElement("br");
        
        // Add the break to the new block
        newblock.appendChild(br);
        
        // Next loop iteration
        continue;
      }
      
      // If we got here, there is at least one character in the string
      // and the first character is not 0xa, so figure out how many
      // characters at the start of the string before the first 0xa, or
      // all remaining characters if no 0xa
      slen = t.indexOf("\u000a");
      if (slen === 0) {
        fault(func_name, 300);
      }
      if (slen < 0) {
        slen = t.length;
      }
      
      // Create a new text node to hold the text and add it underneath
      // the new P element
      textnode = document.createTextNode(t.slice(0, slen));
      newblock.appendChild(textnode);
      
      // Drop the segment we just added from the original string
      t = t.slice(slen);
    }
    
    // Add the new message to the output and scroll the new message into
    // view
    eOutput.appendChild(newblock);
    newblock.scrollIntoView();
  }
  
  /*
   * Add a "Copy to clipboard" button with given contents to the
   * console.
   * 
   * t are the text contents that should be copied to clipboard when the
   * button is pressed.  These contents are not directly visible within
   * the console.
   * 
   * Parameters:
   * 
   *   t : string - the text to copy to clipboard
   */
  function appendCopyToken(t) {
    var func_name = "appendCopyToken";
    var eOutput, newblock, textnode;
    
    // Check parameter
    if (typeof(t) !== "string") {
      fault(func_name, 100);
    }
    
    // Get output DIV
    eOutput = document.getElementById("divOutput");
    if (!eOutput) {
      fault(func_name, 200);
    }
    
    // Create a new P element for the message and set the CSS class
    newblock = document.createElement("p");
    newblock.className = "token";
    
    // Create a new text node to hold the button label and add it
    // underneath the new P element
    textnode = document.createTextNode("Copy to clipboard");
    newblock.appendChild(textnode);
    
    // Add the new message to the output and scroll the new message into
    // view
    eOutput.appendChild(newblock);
    newblock.scrollIntoView();
    
    // Add the event handler that copies the text to the clipboard
    newblock.addEventListener('click', function(ev) {
      navigator.clipboard.writeText(t);
    });
  }
  
  /*
   * Function called when the "Stop" button is clicked.
   */
  function handleStop() {
    // Ignore if in login mode
    if (m_login) {
      return;
    }
    
    // Ignore if not processing
    if (!m_processing) {
      return;
    }
    
    // Ignore if already stopped
    if (m_stop_request) {
      return;
    }
    
    // Set the stop request flag and update enable states
    m_stop_request = true;
    setEnableState();
    
    // Add a client message indicating the stop request
    appendMessage("Client requested a STOP... \u00ab", false);
  }
  
  /*
   * Function called when the "Send" button is clicked.
   */
  function handleSend() {
    var func_name = "handleSend";
    var e, msg;
    
    // Ignore if in login mode
    if (m_login) {
      return;
    }
    
    // Ignore if processing
    if (m_processing) {
      return;
    }
    
    // Get the message from the input control
    e = document.getElementById("txtInput");
    if (!e) {
      fault(func_name, 100);
    }
    msg = e.value;
    
    // Add the user input to the output
    appendMessage(msg, false);
    
    // Update state flags and enable states
    m_processing = true;
    m_stop_request = false;
    setEnableState();
    
    // Handle the message with the server
    m_server.handleMessage(new NetC(), msg);
  }
  
  /*
   * Perform a special login dialog.
   * 
   * site is the unescaped name of the site that the user is logging
   * into, which will be displayed to the user.
   * 
   * fdone is called if the user chose to log in.  It is called with two
   * string arguments, the first being the username and the second being
   * the password.
   * 
   * fcancel is called if the user chose to cancel login.  It has no
   * arguments.
   * 
   * This function may not be called while a login is already in
   * progress.  Until one of the callback functions is called,
   * handlStop() and handleSend() will ignore any requests.
   * 
   * Parameters:
   * 
   *   site : string - the site that we are logging into
   * 
   *   fdone : function - function that takes two string arguments, the
   *   first being the username and the second being the password
   * 
   *   fcancel : function - function that takes no arguments
   */
  function doLogin(site, fdone, fcancel) {
    var func_name = "doLogin";
    var e, ea, i;
    
    // Check state
    if (m_login) {
      fault(func_name, 50);
    }
    
    // Check parameters
    if ((typeof(site) !== "string") ||
        (typeof(fdone) !== "function") ||
        (typeof(fcancel) !== "function")) {
      fault(func_name, 100);
    }
    
    // Set login state
    m_login = true;
    m_login_done = fdone;
    m_login_cancel = fcancel;
    
    // Blank the username and password fields
    e = document.getElementById("username");
    if (!e) {
      fault(func_name, 200);
    }
    e.value = "";
    
    e = document.getElementById("password");
    if (!e) {
      fault(func_name, 201);
    }
    e.value = "";
    
    // Get the site name element
    e = document.getElementById("spnLoginSite");
    if (!e) {
      fault(func_name, 300);
    }
    
    // Drop all contents of site name element
    ea = [];
    
    if (e.hasChildNodes()) {
      for(i = 0; i < e.childNodes.length; i++) {
        ea.push(e.childNodes.item(i));
      }
    }
    
    for(i = 0; i < ea.length; i++) {
      e.removeChild(ea[i]);
    }
    
    // Add the new site name as a child of site name element
    e.appendChild(document.createTextNode(site));
    
    // Hide the main screen and show the login screen
    e = document.getElementById("divMainScreen");
    if (!e) {
      fault(func_name, 500);
    }
    e.style.display = "none";
    
    e = document.getElementById("divLoginScreen");
    if (!e) {
      fault(func_name, 501);
    }
    e.style.display = "block";
  }
  
  /*
   * Called when the user clicks the "Log in" or "Cancel" button on the
   * login page.
   * 
   * Parameters:
   * 
   *   rtype : boolean - true to handle "Log in" or false to handle
   *   "Cancel"
   */
  function handleLoginResponse(rtype) {
    var func_name = "handleLoginResponse";
    var strName, strPass;
    var e;
    
    // Ignore if not in login state
    if (!m_login) {
      return;
    }
    
    // Check parameter
    if (typeof(rtype) !== "boolean") {
      fault(func_name, 100);
    }
    
    // If successful login response, grab the name and password
    if (rtype) {
      e = document.getElementById("username");
      if (!e) {
        fault(func_name, 200);
      }
      strName = e.value;
      
      e = document.getElementById("password");
      if (!e) {
        fault(func_name, 201);
      }
      strPass = e.value;
    }
    
    // Clear both boxes
    e = document.getElementById("username");
    if (!e) {
      fault(func_name, 200);
    }
    e.value = "";
    
    e = document.getElementById("password");
    if (!e) {
      fault(func_name, 201);
    }
    e.value = "";
    
    // Hide the login page and show the main screen
    e = document.getElementById("divLoginScreen");
    if (!e) {
      fault(func_name, 500);
    }
    e.style.display = "none";
    
    e = document.getElementById("divMainScreen");
    if (!e) {
      fault(func_name, 501);
    }
    e.style.display = "block";
    
    // Clear login state
    m_login = false;
    
    // Invoke appropriate callback
    if (rtype) {
      m_login_done(strName, strPass);
    } else {
      m_login_cancel();
    }
  }
  
  /*
   * NetConsoleClient subclass NetC
   * ==============================
   */
  
  // Constructor
  function NetC() {
    // Invoke superclass constructor
    NetConsoleClient.apply(this, arguments);
    
    // Add the _completed flag that will be set to true once the
    // complete flag is called in to prevent further use of the object
    this._completed = false;
    
    // Add the _replace flag that will be set to true if the server will
    // be replaced during completiong
    this._replace = false;
    
    // Add the _server flag that will store the new server if _replace
    // is true
    this._server = null;
    
    // Add the _login flag that will be set to true while a login
    // request is being handled to block further function calls until it
    // resolves
    this._login = false;
  }
  
  // Chain prototype
  NetC.prototype = Object.create(NetConsoleClient.prototype);
  NetC.prototype.constructor = NetC;
  
  // Implement functions
  NetC.prototype.checkStop = function() {
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Return stop flag
    return m_stop_request;
  };
  
  NetC.prototype.updateServer = function(server) {
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Check parameter
    if (!(server instanceof NetConsoleServer)) {
      throw "NetC: Invalid server parameter";
    }
    
    // Update state
    this._replace = true;
    this._server  = server;
  };
  
  NetC.prototype.showLogin = function(site, fdone, fcancel) {
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Turn on login flag
    this._login = true;
    
    // Get alias for use in callback
    var obj_alias = this;
    
    // Show the login screen, and on the way out before invoking the
    // callbacks, clear the login flag
    doLogin(
      site,
      function(a, b) {
        obj_alias._login = false;
        fdone(a, b);
      },
      function() {
        obj_alias._login = false;
        fcancel();
      });
  };
  
  NetC.prototype.cls = function() {
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Clear console
    clearConsole();
  };
  
  NetC.prototype.print = function(msg) {
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Print server message
    appendMessage(msg, true);
  };
  
  NetC.prototype.token = function(tkstr) {
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Append the copy token
    appendCopyToken(tkstr);
  };
  
  NetC.prototype.complete = function() {
    
    var e;
    
    // Check that we are currently processing and not yet completed and
    // not during a login
    if ((!m_processing) || this._completed || this._login) {
      throw "NetC: Wrong state";
    }
    
    // Set the completed flag to prevent further use of object
    this._completed = true;
    
    // Clear flags and update enable states
    m_processing   = false;
    m_stop_request = false;
    
    setEnableState();
    
    // Clear the main input box
    e = document.getElementById("txtInput");
    if (e) {
      e.value = "";
    }
    
    // If a new server was set, handle initialization of that now
    if (this._replace) {
      // Update state flags and enable states
      m_processing = true;
      m_stop_request = false;
      setEnableState();
      
      // Update server
      m_server = this._server;
      
      // Handle initialization of new server
      m_server.handleInit(new NetC());
    }
  };
  
  /*
   * Public functions
   * ================
   */
  
  /*
   * Function called when the document is loaded.
   */
  function handleLoad() {
    var func_name = "handleLoad";
    var e;
    
    // Get the initial server
    m_server = bootConsole();
    
    // Connect each of the buttons to their handlers
    e = document.getElementById("btnSend");
    if (!e) {
      fault(func_name, 100);
    }
    e.addEventListener('click', function(ev) {
      handleSend();
    });
    
    e = document.getElementById("btnStop");
    if (!e) {
      fault(func_name, 101);
    }
    e.addEventListener('click', function(ev) {
      handleStop();
    });
    
    e = document.getElementById("btnLogin");
    if (!e) {
      fault(func_name, 102);
    }
    e.addEventListener('click', function(ev) {
      handleLoginResponse(true);
    });
    
    e = document.getElementById("btnLoginCancel");
    if (!e) {
      fault(func_name, 103);
    }
    e.addEventListener('click', function(ev) {
      handleLoginResponse(false);
    });
    
    // Update the enable state
    setEnableState();
    
    // Handle the boot server initialization
    m_server.handleInit(new NetC());
  }
  
  /*
   * Export declarations
   * ===================
   * 
   * All exports are declared within a global "netc" object.
   */
  
  window.netc = {
    "handleLoad": handleLoad
  };
  
}());

// Call into our load handler once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', netc.handleLoad);
} else {
  netc.handleLoad();
}
