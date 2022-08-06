"use strict";

/*
 * NetConsoleClient.js
 * ===================
 * 
 * Definition of the NetConsoleClient abstract superclass.
 * 
 * This represents the user interface functions available while a client
 * message is being handled.
 * 
 * All the function implementations in this module will just throw an
 * exception, except for the constructor, which does nothing.  It is up
 * to subclass implementations to override and fill in the required
 * functionality.
 * 
 * Example subclass implementation
 * -------------------------------
 * 
 *  // Subclass constructor
 *  function ExampleClient([...]) {
 *    // Invoke superclass constructor
 *    NetConsoleClient.apply(this, arguments);
 * 
 *    // Subclass-specific constructor
 *    [...]
 *  }
 *  
 *  // Chain prototype
 *  ExampleClient.prototype = Object.create(NetConsoleClient.prototype);
 *  ExampleClient.prototype.constructor = ExampleClient;
 *  
 *  // Override superclass functions
 *  // Do NOT call superclass methods because those throw exceptions
 *  
 *  ExampleClient.prototype.checkStop = function() {
 *    [...]
 *  };
 *  
 *  ExampleClient.prototype.updateServer = function(server) {
 *    [...]
 *  };
 *  
 *  ExampleClient.prototype.showLogin = function(site, fdone, fcancel) {
 *    [...]
 *  };
 *  
 *  ExampleClient.prototype.cls = function() {
 *    [...]
 *  };
 *  
 *  ExampleClient.prototype.print = function(msg) {
 *    [...]
 *  };
 *  
 *  ExampleClient.prototype.token = function(tkstr) {
 *    [...]
 *  };
 *  
 *  ExampleClient.prototype.complete = function() {
 *    [...]
 *  };
 */

/*
 * new NetConsoleClient()
 * ----------------------
 * 
 * Does nothing.
 * 
 * You will want to construct subclasses, not this abstract superclass.
 * See the module documentation for further information.
 */
function NetConsoleClient() {
  // Do nothing
}

/*
 * obj.checkStop()
 * ---------------
 * 
 * Check whether the client has requested a "stop" to an operation in
 * progress.
 * 
 * Return:
 * 
 *   true if client has requested stop, false otherwise
 */
NetConsoleClient.prototype.checkStop = function() {
  throw "NetConsoleClient.checkStop() is abstract";
};

/*
 * obj.updateServer(server)
 * ------------------------
 * 
 * Update the NetConsoleServer that is used for processing messages.
 * 
 * This change will take effect the moment the complete() function is
 * called.  If updateServer() has been invoked multiple times before
 * then, only the most recent invocation counts.
 * 
 * During the complete() function, the initialization process of the new
 * server will be handled.  After that is done, the new server will
 * handle all subsequent messages.
 */
NetConsoleClient.prototype.updateServer = function(server) {
  throw "NetConsoleClient.updateServer() is abstract";
};

/*
 * obj.showLogin(site, fdone, fcancel)
 * -----------------------------------
 * 
 * Prompt the user for a username and password using a special login
 * screen.
 * 
 * This will properly use a password input box for the password.
 * 
 * site is a string that is shown to the user to indicate what they are
 * logging into.  It should NOT have any escapes within it.
 * 
 * This function will return immediately, before the user has entered
 * anything.  When the user makes up their mind, either fdone or fcancel
 * will be called, depending on whether the user entered something or
 * whether the user decided to cancel.
 * 
 * The fdone callback takes two string arguments, the first being the
 * username they entered and the second being the password they entered.
 * 
 * The fcancel callback takes no arguments.
 * 
 * Until one of those two callbacks is invoked, you may not call
 * functions of the NetConsoleClient.
 * 
 * Parameters:
 * 
 *   site : string - the unescaped name of the site to display to
 *   identify what the user is logging into
 * 
 *   fdone : function - callback function that takes two string
 *   arguments, the first being the username and the second being the
 *   password
 * 
 *   fcancel: function - callback function that takes no arguments
 */
NetConsoleClient.prototype.showLogin = function(site, fdone, fcancel) {
  throw "NetConsoleClient.showLogin() is abstract";
};

/*
 * obj.cls()
 * ---------
 * 
 * Clear the output console to blank.
 */
NetConsoleClient.prototype.cls = function() {
  throw "NetConsoleClient.cls() is abstract";
};

/*
 * obj.print(msg)
 * --------------
 * 
 * Print a message to the output console.
 * 
 * msg is the message to print.  Do NOT do any escaping.  If you want
 * & < >, just use those characters directly.  Do NOT escape them as
 * &amp; &lt; &gt;
 * 
 * You may use U+000A (LF) line break characters.  These will be
 * translated into <br/> line breaks in output.
 * 
 * Note that whitespace will be collapsed in output.  If you don't want
 * this, use U+00A0 (NBSP) for spaces that shouldn't be collapsed or
 * broken across lines.
 * 
 * Apart from the 0xa line breaks, no HTML formatting is supported in
 * messages.
 * 
 * Parameters:
 * 
 *   msg : string - the message to print
 */
NetConsoleClient.prototype.print = function(msg) {
  throw "NetConsoleClient.print() is abstract";
};

/*
 * obj.token(tkstr)
 * ----------------
 * 
 * Add a copy-token to the output console.
 * 
 * Copy-tokens are displayed as a button with a generic "Copy to 
 * clipboard" message.  When the button is pressed, the text stored in
 * tkstr is copied to the system clipboard.  The text in tkstr is NOT
 * displayed in the output console.
 * 
 * Parameters:
 * 
 *   tkstr : string - the text that will be copied to the clipboard
 */
NetConsoleClient.prototype.token = function(tkstr) {
  throw "NetConsoleClient.token() is abstract";
};

/*
 * obj.complete()
 * --------------
 * 
 * Indicate to the client that processing the client message is
 * completed.  The client will take back control after being notified
 * through this function, and allow the user to enter more messages.
 * 
 * Do NOT use the NetConsoleClient instance again after calling this
 * function.
 */
NetConsoleClient.prototype.complete = function() {
  throw "NetConsoleClient.complete() is abstract";
};
